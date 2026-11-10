# Vishal Parthasarathy: portfolio + resume

One repo, two outputs:

- **Website** (GitHub Pages): `https://vparth20.github.io`
- **Resume PDF**: rebuilt automatically, linked from the site's Resume button

## Where things live

| File | What goes in it |
|---|---|
| `resume.yaml` | Work experience, skills, education, contact info (RenderCV format, r/EngineeringResumes layout) |
| `site.yaml` | Website text, **projects**, and the **build log** |
| `assets/` | Styles, script, and project images (`assets/img/...`) |
| `scripts/build.py` | Merges both files, renders the PDF, writes `data.json` for the site |

Projects only live in `site.yaml`. Any project with `on_resume: true` is added to the PDF automatically (top `resume_max_projects` only, so it stays one page).

## Updating (the whole point)

1. Edit `resume.yaml` or `site.yaml` (you can do it right on github.com with the pencil icon).
2. Commit to `main`.
3. GitHub Actions rebuilds the PDF and the site in ~2 minutes. Done.

## One-time setup

1. Create a repo named exactly `vparth20.github.io` and push these files to `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Building on your own computer (optional)

```bash
pip install "rendercv[full]"          # installs RenderCV, the YAML -> PDF resume tool
python scripts/build.py               # builds the PDF + site into _site/
python -m http.server -d _site 8000   # serves _site/ at http://localhost:8000 so you can preview
```

Your phone number is deliberately **not** in this public repo. For a private PDF with your phone on it:

```bash
RESUME_PHONE="+1-XXX-XXX-XXXX" python scripts/build.py   # sets a temporary variable only for this one command
# -> build/private/Vishal_Parthasarathy_Resume_<year>.pdf
```
