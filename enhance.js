// Haircraft Barber — efekt katmanı: loader, cursor, hero parçacıkları, tilt, sayaç, parallax
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Loader (en fazla ~1.2 sn)
  const loader = document.getElementById("loader"), bar = loader?.querySelector("i");
  if (loader) {
    let p = 0; const t = setInterval(() => { p = Math.min(p + 12 + Math.random() * 10, 100); bar.style.transform = `scaleX(${p / 100})`; if (p >= 100) clearInterval(t); }, 90);
    const done = () => { loader.classList.add("is-done"); setTimeout(() => loader.remove(), 1000); };
    addEventListener("load", () => setTimeout(done, 500)); setTimeout(done, 2500);
  }

  // Hero: fare ile derinlik + parçacık ağı
  const hero = document.querySelector(".hero");
  if (hero && !reduce) {
    if (desktop) hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--gx", ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty("--gy", ((e.clientY - r.top) / r.height - .5).toFixed(3));
    }, { passive: true });

    const cv = hero.querySelector(".hero-canvas"), ctx = cv.getContext("2d");
    let w, h, pts = [], mx = -999, my = -999, run = true;
    const size = () => { w = cv.width = hero.clientWidth; h = cv.height = hero.clientHeight;
      pts = Array.from({ length: w < 768 ? 22 : 55 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 })); };
    size(); addEventListener("resize", size);
    hero.addEventListener("mousemove", (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    new IntersectionObserver(([en]) => { run = en.isIntersecting; if (run) loop(); }).observe(hero);
    function loop() {
      if (!run) return;
      ctx.clearRect(0, 0, w, h);
      for (const a of pts) {
        const dx = a.x - mx, dy = a.y - my, d = Math.hypot(dx, dy);
        if (d < 120) { a.x += dx / d * 1.2; a.y += dy / d * 1.2; }          // fareden kaçış
        a.x = (a.x + a.vx + w) % w; a.y = (a.y + a.vy + h) % h;
        ctx.fillStyle = "rgba(173,132,82,.7)"; ctx.fillRect(a.x, a.y, 2, 2);
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 110) { ctx.strokeStyle = `rgba(173,132,82,${.18 * (1 - d / 110)})`; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  // Custom cursor (yalnızca masaüstü)
  if (desktop && !reduce) {
    const c = document.querySelector(".cursor"), dot = document.querySelector(".cursor-dot");
    document.documentElement.classList.add("has-cursor");
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; }, { passive: true });
    (function tick() { cx += (x - cx) * .18; cy += (y - cy) * .18; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(tick); })();
    document.addEventListener("mouseover", (e) => {
      const view = e.target.closest(".gallery-item,.media-frame");
      const link = e.target.closest("a,button,[data-tilt]");
      c.classList.toggle("is-view", !!view); c.classList.toggle("is-link", !view && !!link);
      c.textContent = view ? "VIEW" : "";
    });
  }

  // 3D tilt + parlama
  if (desktop && !reduce) document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%"); el.style.setProperty("--my", py * 100 + "%");
      el.style.transform = `perspective(800px) rotateX(${(.5 - py) * 8}deg) rotateY(${(px - .5) * 10}deg) translateY(-4px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  // İstatistik sayacı
  document.querySelectorAll(".stat-num").forEach((el) => {
    const n = parseInt(el.textContent, 10), suf = el.textContent.replace(/[\d]/g, ""); if (!n || reduce) return;
    new IntersectionObserver(([en], o) => { if (!en.isIntersecting) return; o.disconnect(); const s = performance.now();
      (function f(t) { const k = Math.min((t - s) / 1400, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(f); })(s); }).observe(el);
  });

  // Görsellerde hafif scroll parallax
  if (!reduce) {
    const imgs = [...document.querySelectorAll(".about-media img,.gallery-item img")]; let tick = false;
    addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false;
      for (const im of imgs) { const r = im.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
        im.style.objectPosition = `50% ${50 + ((r.top + r.height / 2) / innerHeight - .5) * 14}%`; } }); }, { passive: true });
  }
})();
