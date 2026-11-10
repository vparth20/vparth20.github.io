"""Build the portfolio site and the resume PDFs from resume.yaml + site.yaml.

Usage (run from the repo root):
    python scripts/build.py              # full build into _site/ (needs rendercv)
    python scripts/build.py --no-pdf     # site only, skip PDF rendering
    python scripts/build.py --preview    # also write _site/preview.html (single file)

What it does:
  1. Merges projects marked `on_resume: true` from site.yaml into the resume.
  2. Renders two PDFs with RenderCV:
       _site/assets/Vishal_Parthasarathy_Resume.pdf  (public, no phone number)
       build/private/Vishal_Parthasarathy_Resume.pdf (adds phone if RESUME_PHONE is set)
  3. Writes _site/data.json that the website reads.
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "_site"
BUILD_DIR = ROOT / "build"
import datetime as _dt
# r/EngineeringResumes + recruiter convention: FirstName_LastName_Resume, plus the year it was built
PDF_NAME = f"Vishal_Parthasarathy_Resume_{_dt.date.today().year}.pdf"
STATIC = ["index.html", "assets"]

yaml = YAML()
yaml.preserve_quotes = True


def load(path: Path):
    with path.open() as f:
        return yaml.load(f)


def resume_with_projects(resume, site):
    """Return a copy of resume.yaml with site projects inserted after experience."""
    merged = copy.deepcopy(resume)
    limit = site.get("site", {}).get("resume_max_projects", 2)
    entries = []
    for p in site.get("projects", []):
        if not p.get("on_resume"):
            continue
        link = (p.get("links") or {}).get("github")
        entry = {"name": p["name"]}
        if link:
            label = link.replace("https://", "").replace("http://", "")
            entry["location"] = f"[{label}]({link})"
        for key in ("date", "start_date", "end_date"):
            if p.get(key):
                entry[key] = p[key]
        entry["highlights"] = list(p.get("resume_highlights") or [p.get("summary", "")])
        entries.append(entry)
    entries = entries[:limit]

    old = merged["cv"]["sections"]
    new = {}
    for key, value in old.items():
        new[key] = value
        if key == "experience" and entries:
            new["projects"] = entries
    if entries and "projects" not in new:
        new["projects"] = entries
    merged["cv"]["sections"] = new
    return merged


def render_pdf(resume_data, out_pdf: Path, workdir: Path):
    workdir.mkdir(parents=True, exist_ok=True)
    src = workdir / "resume.yaml"
    with src.open("w") as f:
        yaml.dump(resume_data, f)
    subprocess.run(["rendercv", "render", str(src)], cwd=workdir, check=True)
    pdf = next((workdir / "rendercv_output").glob("*.pdf"))
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(pdf, out_pdf)
    print(f"PDF -> {out_pdf.relative_to(ROOT)}")


def to_plain(obj):
    """ruamel objects -> plain JSON-safe python."""
    return json.loads(json.dumps(obj, default=str))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-pdf", action="store_true")
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    resume = load(ROOT / "resume.yaml")
    site = load(ROOT / "site.yaml")
    merged = resume_with_projects(resume, site)

    if SITE_DIR.exists():
        shutil.rmtree(SITE_DIR)
    SITE_DIR.mkdir()
    for item in STATIC:
        src = ROOT / item
        if src.is_dir():
            shutil.copytree(src, SITE_DIR / item)
        elif src.exists():
            shutil.copy(src, SITE_DIR / item)
    (SITE_DIR / ".nojekyll").touch()

    if not args.no_pdf:
        public = copy.deepcopy(merged)
        public["cv"].pop("phone", None)
        render_pdf(public, SITE_DIR / "assets" / PDF_NAME, BUILD_DIR / "public_src")
        phone = os.environ.get("RESUME_PHONE")
        if phone:
            private = copy.deepcopy(merged)
            private["cv"]["phone"] = phone
            render_pdf(private, BUILD_DIR / "private" / PDF_NAME, BUILD_DIR / "private_src")

    cv = to_plain(merged["cv"])
    cv.pop("phone", None)  # never publish the phone number in page data
    data = {
        "cv": cv,
        "site": to_plain(site.get("site", {})),
        "projects": to_plain(site.get("projects", [])),
        "updates": to_plain(site.get("updates", [])),
        "other_builds": to_plain(site.get("other_builds", [])),
        "resume_pdf": f"assets/{PDF_NAME}",
    }
    (SITE_DIR / "data.json").write_text(json.dumps(data, indent=2))
    print("data.json written")

    if args.preview:
        html = (ROOT / "index.html").read_text()
        css = (ROOT / "assets" / "style.css").read_text()
        js = (ROOT / "assets" / "app.js").read_text()
        html = html.replace('<link rel="stylesheet" href="assets/style.css">', f"<style>\n{css}\n</style>")
        html = html.replace(
            '<script src="assets/app.js"></script>',
            f"<script>window.__DATA__ = {json.dumps(data)};</script>\n<script>\n{js}\n</script>",
        )
        (SITE_DIR / "preview.html").write_text(html)
        print("preview.html written")


if __name__ == "__main__":
    sys.exit(main())
