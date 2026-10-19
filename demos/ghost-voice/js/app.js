/* Ghost AI — studio, voices and generation logic (browser edition). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const RATE = 24000;
  const VOICES = [
    { id: "af_heart", name: "Heart", lang: "American", gender: "F", grade: "A" },
    { id: "af_bella", name: "Bella", lang: "American", gender: "F", grade: "A-" },
    { id: "af_nicole", name: "Nicole", lang: "American", gender: "F", grade: "B-" },
    { id: "af_aoede", name: "Aoede", lang: "American", gender: "F", grade: "C+" },
    { id: "af_sarah", name: "Sarah", lang: "American", gender: "F", grade: "C+" },
    { id: "am_fenrir", name: "Fenrir", lang: "American", gender: "M", grade: "C+" },
    { id: "am_michael", name: "Michael", lang: "American", gender: "M", grade: "C+" },
    { id: "am_puck", name: "Puck", lang: "American", gender: "M", grade: "C+" },
    { id: "bf_emma", name: "Emma", lang: "British", gender: "F", grade: "B-" },
    { id: "bf_isabella", name: "Isabella", lang: "British", gender: "F", grade: "C" },
    { id: "bm_george", name: "George", lang: "British", gender: "M", grade: "C" },
    { id: "bm_fable", name: "Fable", lang: "British", gender: "M", grade: "C" },
  ];
  const state = { voice: "af_heart", speed: 1, format: "mp3", busy: false };
  const messages = $("#messages"), input = $("#input"), sendBtn = $("#sendBtn");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const voiceName = (id) => VOICES.find((v) => v.id === id)?.name || id;

  /* ---------- the in-browser voice engine (a module worker) ---------- */
  const engine = (() => {
    const worker = new Worker("engine/kokoro-worker.js", { type: "module" });
    let seq = 0, ready = null, listener = null;
    const pending = new Map();
    worker.onmessage = ({ data: m }) => {
      if (m.type === "progress" || m.type === "status" || m.type === "chunk") { listener?.(m); return; }
      if (m.type === "ready") { ready?.resolve(); return; }
      const p = pending.get(m.id);
      if (m.type === "error" && m.id === undefined) { ready?.reject(new Error(m.message)); ready = null; return; }
      if (!p) return;
      pending.delete(m.id);
      m.type === "audio" ? p.resolve(m) : p.reject(new Error(m.message));
    };
    worker.onerror = (e) => { const err = new Error(e.message || "The voice engine could not start in this browser."); ready?.reject(err); pending.forEach((p) => p.reject(err)); pending.clear(); };
    return {
      onProgress(fn) { listener = fn; },
      warm() {
        if (!ready) {
          let res, rej;
          const pr = new Promise((a, b) => { res = a; rej = b; });
          ready = { promise: pr, resolve: res, reject: rej };
          worker.postMessage({ type: "init" });
        }
        return ready.promise;
      },
      async speak(text, voice, speed) {
        await this.warm();
        const id = ++seq;
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
          worker.postMessage({ type: "synth", id, text, voice, speed });
        });
      },
    };
  })();

  /* ---------- encoding: WAV, MP3 (LAME), and a zip wrapper for saving ---------- */
  function wav(samples) {
    const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Uint8Array(buf);
  }
  function mp3(samples) {
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
    const enc = new lamejs.Mp3Encoder(1, RATE, 160), parts = [];
    for (let i = 0; i < pcm.length; i += 1152) { const b = enc.encodeBuffer(pcm.subarray(i, i + 1152)); if (b.length) parts.push(b); }
    const end = enc.flush(); if (end.length) parts.push(end);
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(name, data) {
    const fn = new TextEncoder().encode(name), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30)), central = new DataView(new ArrayBuffer(46)), end = new DataView(new ArrayBuffer(22));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, fn.length, true);
    central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true); central.setUint32(24, data.length, true); central.setUint16(28, fn.length, true);
    const cdOffset = 30 + fn.length + data.length;
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true);
    end.setUint32(12, 46 + fn.length, true); end.setUint32(16, cdOffset, true);
    return new Blob([local, fn, data, central, fn, end], { type: "application/zip" });
  }

  /* Saving: inside Claude the page saves through the viewer (which accepts .zip, not .mp3/.wav),
     anywhere else it is a normal download. */
  const downloadsP = window.claude?.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
  async function save(file, bytes, mime) {
    const dl = await downloadsP;
    if (dl) {
      try {
        await dl.save({ filename: file.replace(/\.\w+$/, ".zip"), data: zip(file, bytes) });
        toast("Saved. Your audio file is inside the zip.");
      } catch (e) {
        if (e?.code !== "declined") toast(`Could not save: ${e?.message || e?.code || e}`);
      }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bytes], { type: mime })); a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- voices ---------- */
  function selectVoice(id, from) {
    state.voice = id;
    $("#voiceSelect").value = id;
    $("#heroVoice").textContent = `Voice · ${voiceName(id)}`;
    document.querySelectorAll(".vcard").forEach((c) => c.classList.toggle("selected", c.dataset.id === id));
    if (from === "card") FX.go("studio");
  }
  function renderVoices() {
    $("#voiceSelect").innerHTML = VOICES
      .map((v) => `<option value="${v.id}">${v.name} · ${v.lang} ${v.gender === "F" ? "female" : "male"}</option>`).join("");
    const froms = ["left", "bottom", "right", "spin"];
    $("#voiceGrid").innerHTML = VOICES.map((v, k) => `
      <div class="reveal" data-from="${froms[k % 4]}" data-delay="${(k % 4) * 0.08}">
        <div class="vcard glass tilt spot" data-id="${v.id}" data-max="14">
          <div class="vcard-top"><h3>${v.name}</h3><span class="grade" title="Quality grade from the Kokoro voice list">${v.grade}</span></div>
          <p>${v.lang} English · ${v.gender === "F" ? "Female" : "Male"}</p>
          <div class="vcard-actions">
            <button class="vbtn pre" data-preview="${v.id}"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span>Preview</span></button>
            <button class="vbtn use" data-use="${v.id}">Use voice</button>
          </div>
        </div>
      </div>`).join("");
    $("#voiceSelect").addEventListener("change", (e) => selectVoice(e.target.value));
    selectVoice(state.voice);
  }

  const previews = {};
  let previewAudio = null;
  document.addEventListener("click", async (e) => {
    const use = e.target.closest("[data-use]");
    if (use) { selectVoice(use.dataset.use, "card"); return; }
    const pre = e.target.closest("[data-preview]");
    if (!pre || pre.classList.contains("busy")) return;
    const id = pre.dataset.preview, label = $("span", pre);
    if (previewAudio) previewAudio.pause();
    pre.classList.add("busy"); label.textContent = "Loading…";
    engine.onProgress((m) => { if (m.type === "progress" && !m.cached) label.textContent = `Model ${Math.round((m.loaded / m.total) * 100)}%`; else if (m.type === "status") label.textContent = "Starting…"; });
    try {
      if (!previews[id]) {
        label.textContent = "Recording…";
        const r = await engine.speak(`Hi, I'm ${voiceName(id)}. This is how your next voice-over could sound.`, id, 1);
        previews[id] = URL.createObjectURL(new Blob([wav(r.audio)], { type: "audio/wav" }));
      }
      previewAudio = new Audio(previews[id]);
      FX.orb.attach(previewAudio);
      previewAudio.onplay = () => setOrb("playing", "Speaking");
      previewAudio.onended = previewAudio.onpause = () => setOrb("idle", "Ready");
      await previewAudio.play();
      const r = pre.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 10);
    } catch (err) {
      toast(`Preview failed: ${err.message || err}`);
    } finally { pre.classList.remove("busy"); label.textContent = "Preview"; }
  });

  /* ---------- controls ---------- */
  const speed = $("#speed");
  speed.addEventListener("input", () => { state.speed = +speed.value; $("#speedOut").textContent = state.speed.toFixed(2) + "×"; });
  const seg = $("#formatSeg"), glider = $(".seg-glider", seg);
  seg.addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn"); if (!b) return;
    seg.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x === b));
    state.format = b.dataset.fmt; FX.glide(glider, b);
  });
  function autosize() {
    input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 180) + "px";
    $("#counter").textContent = input.value.length;
  }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#composer").requestSubmit(); }
  });
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-sample]"); if (!c) return;
    input.value = c.dataset.sample; autosize(); input.focus();
  });

  /* ---------- chat ---------- */
  function setOrb(mode, label) { FX.orb.set(mode); $("#orbLabel").textContent = label; }
  const scrollDown = () => messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" });
  function addUser(text) {
    const el = document.createElement("div");
    el.className = "msg user";
    el.innerHTML = `<div class="avatar">YOU</div><div class="bubble"></div>`;
    $(".bubble", el).textContent = text;
    messages.appendChild(el); FX.flyIn(el, "right"); scrollDown();
  }
  function addAI() {
    const el = $("#aiMsgTpl").content.firstElementChild.cloneNode(true);
    messages.appendChild(el); FX.flyIn(el, "left"); scrollDown();
    return el;
  }

  $("#composer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || state.busy) return;
    if (/[ঀ-৿]/.test(text) && !/[A-Za-z]/.test(text)) { toast("Kokoro speaks English only. Please type your script in English."); return; }
    state.busy = true; sendBtn.disabled = true;
    input.value = ""; autosize();
    addUser(text);
    const card = addAI(), note = $(".loader em", card);
    const job = { voice: state.voice, format: state.format };
    $(".tag.voice", card).textContent = voiceName(job.voice);
    setOrb("thinking", "Recording");
    engine.onProgress((m) => {
      if (m.type === "progress" && !m.cached) note.innerHTML = `Downloading the voice model, once: <b>${Math.round((m.loaded / m.total) * 100)}%</b> of 92 MB`;
      else if (m.type === "status") note.textContent = "Starting the voice engine…";
      else if (m.type === "chunk") note.innerHTML = `Recording sentence <b>${m.done + (m.done < m.total ? 1 : 0)}</b> of ${m.total}…`;
    });
    try {
      const r = await engine.speak(text, job.voice, state.speed);
      renderPlayer(card, r, job);
    } catch (err) {
      $(".loader", card).outerHTML = `<div class="error">The voice-over failed: ${esc(err.message || err)}</div>`;
      setOrb("idle", "Error");
    } finally {
      state.busy = false; sendBtn.disabled = false;
    }
  });

  function renderPlayer(card, r, job) {
    $(".loader", card).remove();
    const player = $(".player", card); player.hidden = false;
    const audio = r.audio, ext = job.format;
    const wavBytes = wav(audio);
    const fileBytes = ext === "mp3" ? mp3(audio) : wavBytes;
    const name = `ghost-voice-${voiceName(job.voice).toLowerCase()}-${Date.now().toString(36)}.${ext}`;
    $(".tag.dur", card).textContent = `${(audio.length / RATE).toFixed(1)}s · ${ext.toUpperCase()} · made in ${r.elapsed.toFixed(1)}s`;
    const dl = $(".download", card);
    $("span", dl).textContent = `Save ${ext.toUpperCase()}`;
    dl.addEventListener("click", () => save(name, fileBytes, ext === "mp3" ? "audio/mpeg" : "audio/wav"));
    downloadsP.then((d) => { if (d) { const n = document.createElement("div"); n.className = "dl-note"; n.textContent = `Saves a .zip with your ${ext.toUpperCase()} inside.`; $(".bubble", card).appendChild(n); } });

    const url = URL.createObjectURL(new Blob([wavBytes], { type: "audio/wav" }));
    const grad = document.createElement("canvas").getContext("2d").createLinearGradient(0, 0, 600, 0);
    grad.addColorStop(0, "#fb7185"); grad.addColorStop(0.5, "#fde68a"); grad.addColorStop(1, "#34d399");
    const ws = WaveSurfer.create({
      container: $(".wave", card), url, height: 46, barWidth: 3, barGap: 2, barRadius: 3,
      waveColor: "rgba(255,255,255,.22)", progressColor: grad, cursorColor: "#fff", cursorWidth: 1, normalize: true,
    });
    const play = $(".play", card);
    play.addEventListener("click", () => { FX.orb.attach(ws.getMediaElement()); ws.playPause(); });
    ws.on("play", () => { play.classList.add("playing"); setOrb("playing", "Speaking"); });
    ws.on("pause", () => { play.classList.remove("playing"); setOrb("idle", "Ready"); });
    ws.on("finish", () => { play.classList.remove("playing"); setOrb("idle", "Ready"); });
    ws.on("ready", () => {
      gsap.from($(".wave", card), { scaleY: 0, transformOrigin: "50% 50%", duration: 0.8, ease: "elastic.out(1,.5)" });
      const b = play.getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top + b.height / 2, 20);
      FX.orb.attach(ws.getMediaElement()); ws.play().catch(() => {});
    });
    scrollDown();
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "glass"; t.textContent = msg; t.setAttribute("role", "status");
    Object.assign(t.style, { position: "fixed", bottom: "calc(24px + env(safe-area-inset-bottom, 0px))", left: "50%", maxWidth: "calc(100% - 32px)", padding: "12px 20px", borderRadius: "999px", zIndex: 90, transform: "translateX(-50%)", fontSize: "14px" });
    document.body.appendChild(t);
    gsap.fromTo(t, { y: 80, opacity: 0, rotation: -6 }, { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: "back.out(2)" });
    gsap.to(t, { y: 80, opacity: 0, delay: 3.6, duration: 0.5, onComplete: () => t.remove() });
  }

  /* ---------- boot ---------- */
  renderVoices();
  FX.init();
  FX.cycler($("#cycler"), ["YouTube intros", "product ads", "podcasts", "audiobooks", "explainer videos"]);
  // start fetching the model in the background as soon as someone reaches the studio
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); engine.warm().then(() => {
      $("#statusBadge").classList.add("ok"); $("#statusText").textContent = "Voice engine ready · runs in your browser";
    }).catch((err) => { $("#statusBadge").classList.add("err"); $("#statusText").textContent = `Voice engine failed: ${err.message}`; }); }
  }, { threshold: 0.2 });
  io.observe($("#studio"));
})();
