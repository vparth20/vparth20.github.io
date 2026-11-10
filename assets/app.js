// Renders the whole page from data.json (built from resume.yaml + site.yaml).
(function () {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Light markdown: **bold**, *italic*, [text](url)
  const md = (s) => esc(s)
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  function fmtDate(d) {
    if (d === undefined || d === null || d === "") return "";
    const s = String(d);
    if (s.toLowerCase() === "present") return "Present";
    const m = s.match(/^(\d{4})-(\d{2})/);
    return m ? `${MONTHS[+m[2] - 1]} ${m[1]}` : s;
  }
  function range(e) {
    if (e.date) return fmtDate(e.date);
    const a = fmtDate(e.start_date), b = fmtDate(e.end_date);
    return a && b ? `${a} – ${b}` : a || b;
  }
  // Split "A (x, y), B, C" on top-level commas only
  function splitSkills(s) {
    const out = []; let depth = 0, cur = "";
    for (const ch of String(s)) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 3).map((w) => w[0]).join("").toUpperCase();

  function render(data) {
    const cv = data.cv, site = data.site || {}, sec = cv.sections || {};
    const pdf = data.resume_pdf;
    const social = Object.fromEntries((cv.social_networks || []).map((s) => [s.network, s.username]));
    const linkedin = social.LinkedIn ? `https://www.linkedin.com/in/${social.LinkedIn}` : null;
    const github = site.github_username ? `https://github.com/${site.github_username}` : social.GitHub ? `https://github.com/${social.GitHub}` : null;

    if (site.title) document.title = site.title;
    $("brand").textContent = cv.name;
    $("heroName").textContent = cv.name;
    $("navResume").href = pdf;

    if (site.photo) {
      const p = $("heroPhoto");
      p.hidden = false;
      p.style.backgroundImage = `url('${site.photo}')`;
    }

    // Terminal typewriter
    typeTerminal(site.terminal || ["$ whoami", cv.name]);

    // About
    $("headline").textContent = site.headline || "";
    $("aboutText").innerHTML = (site.about || []).map((p) => `<p>${md(p)}</p>`).join("");

    // Skills
    $("skillsGrid").innerHTML = (sec.skills || []).map((s) => `
      <div class="skill-card"><h3>${esc(s.label)}</h3>
        <div class="chips">${splitSkills(s.details).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>
      </div>`).join("");

    // Experience
    const SHOW = 3;
    $("timeline").innerHTML = (sec.experience || []).map((e, i) => {
      const hl = e.highlights || [];
      const items = hl.map((h, j) => `<li${j >= SHOW ? ' class="extra" hidden' : ""}>${md(h)}</li>`).join("");
      const btn = hl.length > SHOW ? `<button class="more" data-i="${i}">Show ${hl.length - SHOW} more</button>` : "";
      return `<li>
        <div class="job-head">
          <div><div class="job-title">${esc(e.position)}</div>
          <div class="job-meta">${esc(e.company)}${e.location ? " · " + esc(e.location) : ""}</div></div>
          <div class="job-dates">${esc(range(e))}</div>
        </div>
        <ul>${items}</ul>${btn}
      </li>`;
    }).join("");
    $("timeline").addEventListener("click", (ev) => {
      const b = ev.target.closest(".more"); if (!b) return;
      const list = b.previousElementSibling;
      const extras = list.querySelectorAll(".extra");
      const opening = extras[0].hidden;
      extras.forEach((x) => (x.hidden = !opening));
      b.textContent = opening ? "Show less" : `Show ${extras.length} more`;
    });
    $("education").innerHTML = (sec.education || []).map((e) => `
      <div class="edu"><div><strong>${esc(e.institution)}</strong> · ${esc(e.degree)} in ${esc(e.area)}</div>
      <div class="job-dates">${esc(range(e))}</div></div>`).join("");

    // Portfolio
    const projects = data.projects || [];
    const tags = [...new Set(projects.flatMap((p) => p.tags || []))];
    let active = "All";
    const drawCards = () => {
      $("cards").innerHTML = projects.filter((p) => active === "All" || (p.tags || []).includes(active)).map((p) => {
        const links = p.links || {};
        const linkHtml = [
          links.github && `<a href="${esc(links.github)}" target="_blank" rel="noopener">Code →</a>`,
          links.demo && `<a href="${esc(links.demo)}" target="_blank" rel="noopener">Live demo →</a>`,
          links.writeup && `<a href="${esc(links.writeup)}" target="_blank" rel="noopener">Write-up →</a>`,
          links.video && `<a href="${esc(links.video)}" target="_blank" rel="noopener">Video →</a>`,
        ].filter(Boolean).join("");
        const img = p.image
          ? `<div class="card-img" style="background-image:url('${esc(p.image)}')">`
          : `<div class="card-img placeholder">${esc(initials(p.name))}`;
        return `<article class="card">
          ${img}${p.status ? `<span class="status">${esc(p.status)}</span>` : ""}</div>
          <div class="card-body">
            <h3>${esc(p.name)}</h3>
            <p>${md(p.summary)}</p>
            <div class="chips">${(p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
            <div class="card-links">${linkHtml}</div>
          </div></article>`;
      }).join("");
    };
    if (projects.length < 3) $("filters").hidden = true;
    $("filters").innerHTML = ["All", ...tags].map((t) => `<button class="${t === "All" ? "on" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
    $("filters").addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      active = b.dataset.t;
      $("filters").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
      drawCards();
    const others = data.other_builds || [];
    if (others.length) {
      $("otherBuilds").hidden = false;
      $("otherBuilds").textContent = "Also built along the way: " + others.join(" · ");
    }
    });
    drawCards();
    const others = data.other_builds || [];
    if (others.length) {
      $("otherBuilds").hidden = false;
      $("otherBuilds").textContent = "Also built along the way: " + others.join(" · ");
    }

    // Build log
    $("logList").innerHTML = (data.updates || []).map((u) => {
      const d = String(u.date);
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const pretty = m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : d;
      return `<li><time datetime="${esc(d)}">${esc(pretty)}</time><div>${md(u.text)}</div></li>`;
    }).join("");

    // Contact
    $("contactLinks").innerHTML = [
      cv.email && `<a class="btn btn-accent" href="mailto:${esc(cv.email)}">Email me</a>`,
      linkedin && `<a class="btn btn-ghost" href="${linkedin}" target="_blank" rel="noopener">LinkedIn</a>`,
      github && `<a class="btn btn-ghost" href="${github}" target="_blank" rel="noopener">GitHub</a>`,
      pdf && `<a class="btn btn-ghost" href="${pdf}" target="_blank" rel="noopener">Download resume (PDF)</a>`,
    ].filter(Boolean).join("");

    $("footer").textContent = `© ${new Date().getFullYear()} ${cv.name} · Built from one YAML file that also generates my resume.`;

    // Mobile nav + active link highlight
    $("navToggle").addEventListener("click", () => $("navLinks").classList.toggle("open"));
    $("navLinks").addEventListener("click", (ev) => { if (ev.target.tagName === "A") $("navLinks").classList.remove("open"); });
    const links = [...document.querySelectorAll(".nav-links a[href^='#']")];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section").forEach((s) => obs.observe(s));
  }

  function typeTerminal(lines) {
    const el = $("terminal");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lineHtml = (l) => (l.startsWith("$") ? `<span class="cmd">${esc(l)}</span>` : esc(l));
    if (reduce) { el.innerHTML = lines.map(lineHtml).join("\n") + ' <span class="cursor"></span>'; return; }
    let i = 0, j = 0, done = [];
    (function tick() {
      if (i >= lines.length) { el.innerHTML = done.join("\n") + '\n<span class="cmd">$</span> <span class="cursor"></span>'; return; }
      const line = lines[i];
      const isCmd = line.startsWith("$");
      const partial = isCmd ? line.slice(0, j) : line;
      el.innerHTML = [...done, isCmd ? `<span class="cmd">${esc(partial)}</span>` : esc(partial)].join("\n") + '<span class="cursor"></span>';
      if (isCmd && j < line.length) { j++; setTimeout(tick, 38 + Math.random() * 40); }
      else { done.push(lineHtml(line)); i++; j = 0; setTimeout(tick, isCmd ? 350 : 500); }
    })();
  }

  if (window.__DATA__) render(window.__DATA__);
  else fetch("data.json", { cache: "no-store" }).then((r) => r.json()).then(render)
    .catch((e) => { document.body.insertAdjacentHTML("afterbegin", `<p style="padding:80px 24px">Could not load data.json: ${esc(e.message)}</p>`); });
})();
