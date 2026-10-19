/* Ghost AI — Kokoro-82M running entirely in the browser (module worker).
 * Text -> normalised English -> espeak-ng phonemes (phonemizer) -> Kokoro tokens
 * -> ONNX Runtime Web (WASM) -> 24 kHz float audio.
 * Normalisation and phoneme fix-ups follow kokoro-js (Apache-2.0).
 */
import * as ort from "./ort.wasm.min.mjs";
import { phonemize } from "./phonemizer.js";

const BASE = new URL("../", import.meta.url).href;
const MODEL_PARTS = 7;
const MODEL_BYTES = 92361271;
const MODEL_KEY = "kokoro-v1.0-int8";
const STYLE_DIM = 256;
const MAX_TOKENS = 510;

ort.env.wasm.wasmPaths = new URL("./", import.meta.url).href;
ort.env.wasm.numThreads = 1; // the page is not cross-origin isolated, so no shared memory
ort.env.wasm.proxy = false;

let session = null, vocab = null, tokenInput = "tokens";
const voices = new Map();
const post = (m, t) => self.postMessage(m, t || []);

/* ---------- model bytes, cached in IndexedDB after the first download ---------- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("ghost-voice", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function cacheGet(key) {
  try {
    const db = await idb();
    return await new Promise((res) => {
      const q = db.transaction("files").objectStore("files").get(key);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch { return null; }
}
async function cachePut(key, val) {
  try {
    const db = await idb();
    db.transaction("files", "readwrite").objectStore("files").put(val, key);
  } catch { /* storage blocked: the model just downloads again next time */ }
}

async function loadModelBytes() {
  const cached = await cacheGet(MODEL_KEY);
  if (cached && cached.byteLength === MODEL_BYTES) {
    post({ type: "progress", loaded: MODEL_BYTES, total: MODEL_BYTES, cached: true });
    return new Uint8Array(cached);
  }
  const out = new Uint8Array(MODEL_BYTES);
  let offset = 0;
  for (let i = 0; i < MODEL_PARTS; i++) {
    const res = await fetch(`${BASE}model/part-${String(i).padStart(2, "0")}.wasm`);
    if (!res.ok) throw new Error(`Model part ${i} failed to download (${res.status})`);
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out.set(value, offset);
      offset += value.length;
      post({ type: "progress", loaded: offset, total: MODEL_BYTES });
    }
  }
  if (offset !== MODEL_BYTES) throw new Error("The voice model download was incomplete. Reload and try again.");
  cachePut(MODEL_KEY, out.buffer);
  return out;
}

async function init() {
  if (session) return;
  vocab = await (await fetch(`${BASE}engine/vocab.json`)).json();
  const bytes = await loadModelBytes();
  post({ type: "status", text: "Starting the voice engine" });
  session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  tokenInput = session.inputNames.includes("input_ids") ? "input_ids" : "tokens";
  await phonemize("warm up", "en-us");
}

async function voice(id) {
  if (!voices.has(id)) {
    const res = await fetch(`${BASE}voices/${id}.wasm`);
    if (!res.ok) throw new Error(`Voice ${id} is missing`);
    voices.set(id, new Float32Array(await res.arrayBuffer()));
  }
  return voices.get(id);
}

/* ---------- text normalisation (kokoro-js) ---------- */
function splitNum(e) {
  if (e.includes(".")) return e;
  if (e.includes(":")) {
    const [a, t] = e.split(":").map(Number);
    return t === 0 ? `${a} o'clock` : t < 10 ? `${a} oh ${t}` : `${a} ${t}`;
  }
  const a = parseInt(e.slice(0, 4), 10);
  if (a < 1100 || a % 1e3 < 10) return e;
  const t = e.slice(0, 2), r = parseInt(e.slice(2, 4), 10), s = e.endsWith("s") ? "s" : "";
  if (a % 1e3 >= 100 && a % 1e3 <= 999) {
    if (r === 0) return `${t} hundred${s}`;
    if (r < 10) return `${t} oh ${r}${s}`;
  }
  return `${t} ${r}${s}`;
}
function money(e) {
  const unit = e[0] === "$" ? "dollar" : "pound";
  if (isNaN(Number(e.slice(1)))) return `${e.slice(1)} ${unit}s`;
  if (!e.includes(".")) return `${e.slice(1)} ${unit}${e.slice(1) === "1" ? "" : "s"}`;
  const [w, f] = e.slice(1).split(".");
  const c = parseInt(f.padEnd(2, "0"), 10);
  return `${w} ${unit}${w === "1" ? "" : "s"} and ${c} ${e[0] === "$" ? (c === 1 ? "cent" : "cents") : c === 1 ? "penny" : "pence"}`;
}
const point = (e) => { const [a, t] = e.split("."); return `${a} point ${t.split("").join(" ")}`; };
function normalize(e) {
  return e
    .replace(/[‘’]/g, "'").replace(/«/g, "“").replace(/»/g, "”").replace(/[“”]/g, '"')
    .replace(/\(/g, "«").replace(/\)/g, "»")
    .replace(/[^\S \n]/g, " ").replace(/  +/, " ").replace(/(?<=\n) +(?=\n)/g, "")
    .replace(/\bD[Rr]\.(?= [A-Z])/g, "Doctor")
    .replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, "Mister")
    .replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, "Miss")
    .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, "Mrs")
    .replace(/\betc\.(?! [A-Z])/gi, "etc")
    .replace(/\b(y)eah?\b/gi, "$1e'a")
    .replace(/\d*\.\d+|\b\d{4}s?\b|(?<!:)\b(?:[1-9]|1[0-2]):[0-5]\d\b(?!:)/g, splitNum)
    .replace(/(?<=\d),(?=\d)/g, "")
    .replace(/[$£]\d+(?:\.\d+)?(?: hundred| thousand| (?:[bm]|tr)illion)*\b|[$£]\d+\.\d\d?\b/gi, money)
    .replace(/\d*\.\d+/g, point)
    .replace(/(?<=\d)-(?=\d)/g, " to ")
    .replace(/(?<=\d)S/g, " S")
    .replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\b/g, "'S")
    .replace(/(?<=X')S\b/g, "s")
    .replace(/(?:[A-Za-z]\.){2,} [a-z]/g, (m) => m.replace(/\./g, "-"))
    .replace(/(?<=[A-Z])\.(?=[A-Z])/gi, "-")
    .trim();
}
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+/g;
async function toPhonemes(text, lang) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(PUNCT)) {
    if (last < m.index) parts.push({ p: false, t: text.slice(last, m.index) });
    if (m[0].length) parts.push({ p: true, t: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ p: false, t: text.slice(last) });
  const code = lang === "b" ? "en" : "en-us";
  let ps = (await Promise.all(parts.map(async ({ p, t }) => (p ? t : (await phonemize(t, code)).join(" "))))).join("");
  ps = ps
    .replace(/kəkˈoːɹoʊ/g, "kˈoʊkəɹoʊ").replace(/kəkˈɔːɹəʊ/g, "kˈəʊkəɹəʊ")
    .replace(/ʲ/g, "j").replace(/r/g, "ɹ").replace(/x/g, "k").replace(/ɬ/g, "l")
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, " ")
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z");
  if (lang === "a") ps = ps.replace(/(?<=nˈaɪn)ti(?!ː)/g, "di");
  return ps.trim();
}
const tokenize = (ps) => [...ps].map((c) => vocab[c]).filter((v) => v !== undefined);

/* ---------- chunking: sentences, then words, so each run stays under 510 tokens ---------- */
function sentences(text) {
  return text.split(/\n+/).flatMap((para) => para.match(/[^.!?…]+[.!?…]+["'”)\]]*\s*|[^.!?…]+$/g) || []).map((s) => s.trim()).filter(Boolean);
}
async function chunks(text, lang) {
  const out = [];
  for (const s of sentences(normalize(text))) {
    let ids = tokenize(await toPhonemes(s, lang));
    if (ids.length <= MAX_TOKENS) { if (ids.length) out.push(ids); continue; }
    // very long sentence: break it on words
    let buf = [];
    for (const w of s.split(/\s+/)) {
      const next = [...buf, w].join(" ");
      if (tokenize(await toPhonemes(next, lang)).length > MAX_TOKENS - 10 && buf.length) {
        out.push(tokenize(await toPhonemes(buf.join(" "), lang)));
        buf = [w];
      } else buf.push(w);
    }
    if (buf.length) out.push(tokenize(await toPhonemes(buf.join(" "), lang)));
  }
  return out;
}

async function synth(text, voiceId, speed) {
  await init();
  const pack = await voice(voiceId);
  const lang = voiceId[0]; // a = American, b = British
  const runs = await chunks(text, lang);
  if (!runs.length) throw new Error("Nothing to say. Type some English words.");
  const gap = new Float32Array(Math.round(0.12 * 24000));
  const pieces = [];
  for (let i = 0; i < runs.length; i++) {
    const ids = runs[i];
    const row = Math.min(ids.length, 509);
    const style = pack.slice(row * STYLE_DIM, (row + 1) * STYLE_DIM);
    const feeds = {
      [tokenInput]: new ort.Tensor("int64", BigInt64Array.from([0, ...ids, 0].map(BigInt)), [1, ids.length + 2]),
      style: new ort.Tensor("float32", style, [1, STYLE_DIM]),
      speed: new ort.Tensor("float32", new Float32Array([speed]), [1]),
    };
    const out = await session.run(feeds);
    pieces.push(out[session.outputNames[0]].data, gap);
    post({ type: "chunk", done: i + 1, total: runs.length });
  }
  const len = pieces.reduce((n, p) => n + p.length, 0);
  const audio = new Float32Array(len);
  let o = 0;
  for (const p of pieces) { audio.set(p, o); o += p.length; }
  return polish(audio);
}

/* studio finishing: remove DC, 10 ms fades, peak at -1 dBFS */
function polish(a) {
  if (!a.length) return a;
  let mean = 0;
  for (const v of a) mean += v;
  mean /= a.length;
  let peak = 0;
  for (let i = 0; i < a.length; i++) { a[i] -= mean; peak = Math.max(peak, Math.abs(a[i])); }
  const fade = Math.min(240, a.length >> 1);
  for (let i = 0; i < fade; i++) { const g = i / fade; a[i] *= g; a[a.length - 1 - i] *= g; }
  const k = peak ? 0.891 / peak : 1;
  for (let i = 0; i < a.length; i++) a[i] *= k;
  return a;
}

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === "init") { await init(); post({ type: "ready" }); }
    if (m.type === "synth") {
      const t0 = performance.now();
      const audio = await synth(m.text, m.voice, m.speed);
      post({ type: "audio", id: m.id, audio, elapsed: (performance.now() - t0) / 1000 }, [audio.buffer]);
    }
  } catch (err) {
    post({ type: "error", id: m.id, message: String(err && err.message ? err.message : err) });
  }
};
