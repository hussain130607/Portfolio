/* Ghost AI — motion layer, modelled on hmadev.pages.dev.
 * Drifting backdrop + cursor glow, dot/ring cursor, scroll progress, nav pill,
 * letter-by-letter hero, spinning fly-in reveals, tilt-and-lift cards with a
 * spotlight, magnetic buttons, count-ups, a role cycler and an audio-reactive orb.
 * Built on GSAP (SplitText, CustomEase) and Lenis.
 */
(() => {
  const FX = (window.FX = {});
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const small = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  gsap.registerPlugin(SplitText, CustomEase);
  // a soft spring: quick rise, small overshoot, settles
  CustomEase.create("spring", "M0,0 C0.14,0.7 0.27,1.06 0.45,1.06 0.62,1.06 0.75,0.99 1,1");

  /* ---------- smooth page scroll ---------- */
  FX.lenis = reduce ? null : new Lenis({ lerp: 0.1, smoothWheel: true });
  if (FX.lenis) {
    FX.lenis.on("scroll", () => {});
    gsap.ticker.add((t) => FX.lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  FX.go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (FX.lenis) FX.lenis.scrollTo(id === "top" ? 0 : el, { offset: -90, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- scroll progress bar ---------- */
  function progress() {
    const bar = document.querySelector(".progress");
    const set = gsap.quickTo(bar, "scaleX", { duration: 0.5, ease: "power3" });
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      set(max > 0 ? scrollY / max : 0);
    };
    addEventListener("scroll", on, { passive: true }); on();
  }

  /* ---------- backdrop: drifting colour fields + cursor glow ---------- */
  function backdrop() {
    if (!reduce && !small) {
      const drift = [[".f1", [120, -40], [80, 140]], [".f2", [-140, 30], [-60, 90]], [".f3", [90, -60], [-90, 0]]];
      drift.forEach(([sel, xs, ys]) => {
        gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 13, ease: "sine.inOut" } })
          .to(sel, { x: xs[0], y: ys[0] }).to(sel, { x: xs[1], y: ys[1] });
      });
    }
    if (!fine) return;
    const glow = document.querySelector(".glow");
    const gx = gsap.quickTo(glow, "x", { duration: 1.6, ease: "power2" });
    const gy = gsap.quickTo(glow, "y", { duration: 1.6, ease: "power2" });
    addEventListener("pointermove", (e) => { gx(e.clientX - 600); gy(e.clientY - 600); }, { passive: true });
  }

  /* ---------- dot + trailing ring cursor ---------- */
  function cursor() {
    if (!fine) return;
    document.documentElement.classList.add("has-cursor");
    const dot = document.querySelector(".cursor-dot"), ring = document.querySelector(".cursor-ring");
    const dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3" });
    let first = true, hover = false, down = false;
    const paint = () => {
      gsap.to(dot, { scale: hover ? 0.5 : 1, duration: 0.2 });
      gsap.to(ring, { scale: (hover ? 1.9 : 1) * (down ? 0.8 : 1), backgroundColor: hover ? "rgba(255,255,255,.12)" : "rgba(255,255,255,0)", duration: 0.45, ease: "back.out(2)" });
    };
    addEventListener("pointermove", (e) => {
      if (first) { gsap.set([dot, ring], { x: e.clientX, y: e.clientY, opacity: 1 }); first = false; }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const h = !!e.target.closest?.("a,button,select,input[type=range],[data-cursor]");
      if (h !== hover) { hover = h; paint(); }
    }, { passive: true });
    addEventListener("pointerdown", () => { down = true; paint(); });
    addEventListener("pointerup", () => { down = false; paint(); });
    document.addEventListener("pointerout", (e) => { if (!e.relatedTarget) gsap.to([dot, ring], { opacity: 0, duration: 0.2 }); });
    document.addEventListener("pointerover", () => gsap.to([dot, ring], { opacity: 1, duration: 0.2 }));
  }

  /* ---------- nav: sliding active pill ---------- */
  function nav() {
    const pill = document.querySelector(".nav-pill");
    const links = [...document.querySelectorAll(".nav-links a")];
    let current = null;
    const move = (a) => {
      if (a === current) return;
      current = a;
      links.forEach((l) => l.classList.toggle("active", l === a));
      if (!a) return gsap.to(pill, { opacity: 0, duration: 0.3 });
      gsap.to(pill, { x: a.offsetLeft, width: a.offsetWidth, opacity: 1, duration: 0.6, ease: "back.out(1.6)" });
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      move(links.find((l) => l.dataset.go === e.target.id) || null);
    }), { rootMargin: "-45% 0px -50% 0px" });
    ["top", ...links.map((l) => l.dataset.go)].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    gsap.from(".navbar", { y: -80, opacity: 0, duration: 0.9, ease: "spring" });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-go]"); if (!a) return;
      e.preventDefault(); FX.go(a.dataset.go);
    });
  }

  /* ---------- hero: letters rise and spin in; the rest follows ---------- */
  function hero() {
    document.querySelectorAll(".split").forEach((el) => {
      const s = new SplitText(el, { type: "words,chars", wordsClass: "word", charsClass: "char" });
      if (el.classList.contains("gradient")) {
        // background-clip:text does not reach transformed children, so each letter carries its slice of the gradient
        const n = s.chars.length;
        s.chars.forEach((c, k) => { c.style.backgroundSize = `${n * 100}% 100%`; c.style.backgroundPosition = `${n > 1 ? (k / (n - 1)) * 100 : 0}% 0`; });
      }
      if (reduce) return;
      gsap.from(s.chars, { opacity: 0, yPercent: 80, rotation: 20, duration: 0.9, ease: "spring", stagger: 0.03, delay: +el.dataset.delay || 0 });
    });
    if (reduce) return;
    gsap.from(".badge", { opacity: 0, scale: 0.6, duration: 0.7, ease: "back.out(2)", delay: 0.05 });
    gsap.from(".hero-sub", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out", delay: 0.6 });
    gsap.from(".hero-cta .btn", { opacity: 0, y: 20, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.72 });
    gsap.from(".stats .stat", { opacity: 0, y: 24, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.85 });
    gsap.from(".hero-card-wrap", { opacity: 0, rotation: 8, scale: 0.85, x: 40, duration: 1.3, ease: "spring", delay: 0.2 });
    gsap.from(".float-chip", { opacity: 0, scale: 0, duration: 0.8, ease: "back.out(2.4)", stagger: 0.1, delay: 0.6 });
    document.querySelectorAll(".float-chip").forEach((c, k) => {
      gsap.to(c, { y: (k % 2 ? 12 : -12), duration: 2 + k * 0.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 });
    });
    // hero drifts down and fades as you scroll past it
    const copy = document.querySelector(".hero-copy"), hint = document.querySelector(".scroll-hint");
    addEventListener("scroll", () => {
      const p = Math.min(scrollY / innerHeight, 1);
      gsap.set(copy, { y: p * 160, opacity: 1 - p * 1.25 });
      if (hint) gsap.set(hint, { opacity: 1 - p * 1.25 });
    }, { passive: true });
  }

  /* ---------- rotating phrase in the hero line ---------- */
  FX.cycler = (el, words) => {
    let i = 0;
    setInterval(() => {
      const old = el.firstElementChild;
      const next = document.createElement("span");
      next.className = "text-gradient"; next.textContent = words[(i = (i + 1) % words.length)];
      el.appendChild(next);
      if (reduce) { old.remove(); return; }
      gsap.to(old, { yPercent: -100, rotationX: 80, opacity: 0, duration: 0.7, ease: "power3.in", onComplete: () => old.remove() });
      gsap.fromTo(next, { yPercent: 100, rotationX: -80, opacity: 0 }, { yPercent: 0, rotationX: 0, opacity: 1, duration: 0.9, ease: "spring" });
    }, 2600);
  };

  /* ---------- reveals: elements fly in from a side while spinning, then settle ---------- */
  const FROM = small ? {
    left: { x: -36, y: 24 }, right: { x: 36, y: 24 }, bottom: { y: 44 },
    spin: { y: 44, rotation: -10, scale: 0.9 }, zoom: { y: 20, scale: 0.92 },
  } : {
    left: { x: -140, y: 30, rotation: -10, rotationY: 20 },
    right: { x: 140, y: 30, rotation: 10, rotationY: -20 },
    bottom: { y: 110, rotationX: 28 },
    spin: { y: 80, rotation: -160, scale: 0.5 },
    zoom: { y: 30, scale: 0.8 },
  };
  FX.reveal = (root = document) => {
    const els = [...root.querySelectorAll(".reveal:not([data-revealed])")];
    els.forEach((el) => {
      el.dataset.revealed = 1;
      gsap.set(el, reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, transformPerspective: 1200, ...FROM[el.dataset.from || "bottom"] });
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const d = (+e.target.dataset.delay || 0) * (small ? 0.4 : 1);
      gsap.to(e.target, { opacity: 1, x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, scale: 1, duration: small ? 0.8 : 1.3, ease: "spring", delay: d, clearProps: "transform" });
    }), { threshold: small ? 0.08 : 0.2, rootMargin: "0px 0px 12% 0px" });
    els.forEach((el) => io.observe(el));
  };

  /* ---------- fly-in for chat messages (from the left for Ghost, the right for you) ---------- */
  FX.flyIn = (el, from) => {
    if (reduce) return;
    gsap.from(el, { opacity: 0, transformPerspective: 1000, x: from === "right" ? 120 : -120, y: 40, rotation: from === "right" ? 8 : -8, rotationY: from === "right" ? -25 : 25, scale: 0.85, duration: 1, ease: "spring", clearProps: "transform" });
  };

  /* ---------- tilt toward the cursor, lift under it, spotlight follows ---------- */
  FX.tilt = (root = document) => {
    root.querySelectorAll(".tilt:not([data-tilted])").forEach((el) => {
      el.dataset.tilted = 1;
      const max = +el.dataset.max || 10, lift = +el.dataset.lift || 26;
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3" });
      const z = gsap.quickTo(el, "z", { duration: 0.5, ease: "power3" });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        if (!fine || reduce) return;
        ry((px - 0.5) * max * 2); rx(-(py - 0.5) * max * 2); z(lift);
      });
      el.addEventListener("pointerleave", () => {
        if (!fine || reduce) return;
        gsap.to(el, { rotationX: 0, rotationY: 0, z: 0, duration: 0.9, ease: "elastic.out(1,.5)", overwrite: true });
      });
    });
  };

  /* ---------- magnetic: pulled toward the cursor while hovered ---------- */
  FX.magnetize = (root = document) => {
    if (!fine || reduce) return;
    root.querySelectorAll(".magnetic:not([data-mag])").forEach((el) => {
      el.dataset.mag = 1;
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1,.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1,.4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35); yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
  };

  /* ---------- count up when scrolled into view ---------- */
  function counters() {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (reduce) return;
      const to = +e.target.dataset.count, o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.6, ease: "expo.out", delay: 0.9, onUpdate: () => (e.target.textContent = Math.round(o.v)) });
    }), { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
  }

  /* ---------- spark burst ---------- */
  FX.burst = (x, y, n = 16) => {
    if (reduce) return;
    const colors = ["#fb7185", "#fde68a", "#34d399", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "spark"; s.style.background = colors[i % 4]; s.style.left = x + "px"; s.style.top = y + "px";
      document.body.appendChild(s);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = 36 + Math.random() * 60;
      gsap.to(s, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, duration: 0.8 + Math.random() * 0.3, ease: "power3.out", onComplete: () => s.remove() });
    }
  };

  /* ---------- segmented control glider ---------- */
  FX.glide = (glider, target) => gsap.to(glider, { x: target.offsetLeft - 4, duration: 0.6, ease: "back.out(1.8)" });

  /* ---------- audio-reactive orb: crimson / amber / emerald rings ---------- */
  FX.orb = (() => {
    const c = document.getElementById("orb"), ctx = c.getContext("2d");
    const S = c.width, cx = S / 2, cy = S / 2;
    let analyser = null, data = null, energy = 0, mode = "idle", actx = null;
    const nodes = new WeakMap();
    const RINGS = [[225, 29, 72], [253, 230, 138], [52, 211, 153]];
    function attach(media) {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === "suspended") actx.resume();
        if (!nodes.has(media)) {
          const src = actx.createMediaElementSource(media), an = actx.createAnalyser();
          an.fftSize = 256; src.connect(an); an.connect(actx.destination); nodes.set(media, an);
        }
        analyser = nodes.get(media); data = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) { console.warn("orb analyser unavailable", e); }
    }
    function draw(t) {
      let level = 0;
      if (analyser && mode === "playing") { analyser.getByteFrequencyData(data); level = data.reduce((a, b) => a + b, 0) / data.length / 255; }
      else if (mode === "thinking") level = 0.25 + Math.sin(t * 0.008) * 0.15;
      energy += (level - energy) * 0.15;
      ctx.clearRect(0, 0, S, S);
      const base = S * 0.22 + energy * S * 0.12;
      RINGS.forEach((rgb, k) => {
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          const bin = data && mode === "playing" ? data[(i * 3 + k * 7) % data.length] / 255 : 0;
          const r = base + Math.sin(a * (3 + k) + t * 0.0012 * (k + 1)) * (5 + energy * 20) + bin * 26 - k * 7;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.35);
        g.addColorStop(0, `rgba(${rgb},${0.34 - k * 0.08})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = `rgba(${rgb},${0.75 - k * 0.15})`; ctx.lineWidth = 2; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(cx, cy, base * 0.42, 0, 6.283);
      ctx.fillStyle = `rgba(255,255,255,${0.1 + energy * 0.55})`; ctx.shadowBlur = 40; ctx.shadowColor = "#34d399"; ctx.fill(); ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    return { attach, set: (m) => (mode = m) };
  })();

  FX.init = () => {
    progress(); backdrop(); cursor(); nav(); hero(); counters();
    FX.reveal(); FX.tilt(); FX.magnetize();
  };
})();
