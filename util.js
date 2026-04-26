// ---------- DOM ----------
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") n.innerHTML = v;
    else if (v === false || v == null) continue;
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
  }
  return n;
}

// ---------- Dates ----------
const WEEKDAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function today() {
  const d = new Date(); d.setHours(0,0,0,0);
  return d;
}
export function isoDate(d = new Date()) {
  const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0,10);
}
export function prettyDate(d) {
  const x = d instanceof Date ? d : new Date(d + "T00:00:00");
  return `${WEEKDAYS_SHORT[x.getDay()]}, ${MONTHS[x.getMonth()]} ${x.getDate()}`;
}
export function longDate(d) {
  const x = d instanceof Date ? d : new Date(d + "T00:00:00");
  return `${MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
}
export function shortDate(d) {
  const x = d instanceof Date ? d : new Date(d + "T00:00:00");
  return `${MONTHS_SHORT[x.getMonth()]} ${x.getDate()}`;
}
export function relativeDate(d) {
  const x = d instanceof Date ? d : new Date(d + "T00:00:00");
  const diff = Math.round((today() - x) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return prettyDate(x);
}
export function lastNDays(n) {
  const t = today();
  return Array.from({length: n}, (_, i) => {
    const d = new Date(t); d.setDate(t.getDate() - (n - 1 - i));
    return d;
  });
}
export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late night";
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, variant = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast is-visible " + variant;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 2400);
}

// ---------- Modal ----------
export function modal({ title, sub, body, actions = [] }) {
  const host = document.getElementById("modal-host");
  const frame = document.getElementById("modal-frame");
  frame.innerHTML = "";

  const h = el("h2", { class: "modal__title" }, title);
  frame.appendChild(h);
  if (sub) frame.appendChild(el("p", { class: "modal__sub" }, sub));
  if (body) frame.appendChild(body);

  if (actions.length) {
    const row = el("div", { class: "modal__actions" });
    actions.forEach(a => {
      const b = el("button", { class: `btn btn--sm ${a.variant || "btn--subtle"}`, onClick: () => a.onClick?.(close) }, a.label);
      row.appendChild(b);
    });
    frame.appendChild(row);
  }

  host.classList.remove("hidden");
  host.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => host.classList.add("is-open"));

  // animate fields in
  const fields = frame.querySelectorAll(".field, .modal__actions");
  fields.forEach((f, i) => {
    f.style.opacity = "0";
    f.style.transform = "translateY(8px)";
    setTimeout(() => {
      f.style.transition = "opacity .35s cubic-bezier(.16,1,.3,1), transform .35s cubic-bezier(.16,1,.3,1)";
      f.style.opacity = "1";
      f.style.transform = "translateY(0)";
    }, 60 + i * 30);
  });

  function close() {
    host.classList.remove("is-open");
    setTimeout(() => {
      host.classList.add("hidden");
      host.setAttribute("aria-hidden", "true");
      frame.innerHTML = "";
      host.removeEventListener("click", onBg);
    }, 220);
  }
  function onBg(e) { if (e.target.dataset.close !== undefined) close(); }
  host.addEventListener("click", onBg);
  return { close };
}

// ---------- Debounce ----------
export function debounce(fn, ms = 500) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Currency ----------
export function money(n) {
  const v = Number(n || 0);
  return (v < 0 ? "−" : "") + "৳" + Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ---------- Reduced motion ----------
export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Number ticker ----------
// Animates an element's text content from 0 to `value` over `duration` ms.
// Honors prefers-reduced-motion.
export function tickNumber(node, value, { duration = 750, decimals = 0, prefix = "", suffix = "", format } = {}) {
  if (!node) return;
  const target = Number(value) || 0;
  if (REDUCED || target === 0) {
    node.textContent = format ? format(target) : prefix + target.toFixed(decimals) + suffix;
    return;
  }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = target * eased;
    node.textContent = format ? format(cur) : prefix + cur.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(frame);
    else node.textContent = format ? format(target) : prefix + target.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(frame);
}

// ---------- Stagger reveal ----------
// Fades + lifts a list of elements in sequence.
export function stagger(nodes, { delay = 0, step = 60, distance = 14, duration = 600 } = {}) {
  if (REDUCED) {
    nodes.forEach(n => { n.style.opacity = "1"; n.style.transform = "none"; });
    return;
  }
  nodes.forEach((n, i) => {
    n.style.opacity = "0";
    n.style.transform = `translateY(${distance}px)`;
    n.style.willChange = "opacity, transform";
    setTimeout(() => {
      n.style.transition = `opacity ${duration}ms cubic-bezier(.16,1,.3,1), transform ${duration}ms cubic-bezier(.16,1,.3,1)`;
      n.style.opacity = "1";
      n.style.transform = "translateY(0)";
      setTimeout(() => { n.style.willChange = ""; n.style.transition = ""; }, duration + 50);
    }, delay + i * step);
  });
}

// ---------- Intersection observer reveal ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in-view");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });

export function observeReveal(node) {
  if (REDUCED) { node.classList.add("in-view"); return; }
  node.classList.add("reveal");
  io.observe(node);
}

// ---------- FLIP shared element transition ----------
// Records the bounding box of a node, then on a layout change, animates from old box to new.
export function flipFrom(rect, target, { duration = 480 } = {}) {
  if (REDUCED || !rect || !target) return;
  const next = target.getBoundingClientRect();
  const dx = rect.left - next.left;
  const dy = rect.top - next.top;
  const sx = rect.width / next.width;
  const sy = rect.height / next.height;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01) return;
  target.style.transformOrigin = "top left";
  target.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  target.style.transition = "none";
  requestAnimationFrame(() => {
    target.style.transition = `transform ${duration}ms cubic-bezier(.22,1,.36,1)`;
    target.style.transform = "translate(0,0) scale(1,1)";
    setTimeout(() => { target.style.transition = ""; target.style.transform = ""; target.style.transformOrigin = ""; }, duration + 50);
  });
}

// ---------- Word splitter for stagger title reveals ----------
export function splitWords(node) {
  const text = node.textContent;
  node.textContent = "";
  const words = text.split(/(\s+)/);
  return words.map(w => {
    if (/\s+/.test(w)) { node.appendChild(document.createTextNode(w)); return null; }
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = w;
    node.appendChild(span);
    return span;
  }).filter(Boolean);
}
