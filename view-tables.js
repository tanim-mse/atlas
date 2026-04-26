import { sb, insertOwned } from "./supabase-client.js";
import { el, toast, modal, longDate, isoDate, money, tickNumber, REDUCED } from "./util.js";

// =========================================================
// MEDIA
// =========================================================
export async function renderMedia(root) {
  root.innerHTML = "";
  const actions = document.getElementById("stage-actions");
  actions.innerHTML = "";
  actions.appendChild(el("button", { class: "btn btn--sm btn--subtle", onClick: () => mediaModal(null, () => renderMedia(root)) }, "+ New entry"));

  const { data } = await sb.from("media_log").select("*").order("created_at", { ascending: false });
  if (!data?.length) return root.appendChild(empty("Nothing logged yet", "Books, films, papers, shows."));

  const card = el("article", { class: "card table-card" });
  const table = el("table", { class: "table" });
  table.innerHTML = `<thead><tr><th>Title</th><th>Kind</th><th>Status</th><th>Rating</th><th>Finished</th></tr></thead>`;
  const tbody = el("tbody");
  data.forEach(m => {
    const tr = el("tr", { onClick: () => mediaModal(m, () => renderMedia(root)) });
    tr.appendChild(el("td", {},
      el("div", { style: { fontFamily: "var(--serif)", fontSize: "16px" } }, m.title),
      m.creator ? el("div", { style: { fontSize: "11px", color: "var(--ink-3)" } }, m.creator) : null
    ));
    tr.appendChild(el("td", {}, el("span", { class: "chip" }, m.kind)));
    tr.appendChild(el("td", {}, el("span", { class: `status-pill ${m.status}` }, m.status)));
    tr.appendChild(el("td", {}, m.rating ? "★".repeat(m.rating) + "☆".repeat(5 - m.rating) : "—"));
    tr.appendChild(el("td", { style: { color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: "12px" } }, m.finished_at ? longDate(m.finished_at) : "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  root.appendChild(card);

  if (window.gsap && !REDUCED) gsap.from(card, { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" });
}

function mediaModal(existing, refresh) {
  const body = el("div", { class: "modal__form" });
  const titleF = field("Title", el("input", { type: "text", value: existing?.title || "" }));
  const creatorF = field("Creator / Author", el("input", { type: "text", value: existing?.creator || "" }));
  const kindSel = el("select", {});
  ["book","film","series","paper","other"].forEach(k => kindSel.appendChild(el("option", { value: k, selected: existing?.kind === k }, k)));
  const kindF = field("Kind", kindSel);
  const statusSel = el("select", {});
  ["active","done","abandoned","paused"].forEach(s => statusSel.appendChild(el("option", { value: s, selected: existing?.status === s }, s)));
  const statusF = field("Status", statusSel);
  const ratingSel = el("select", {});
  [["","—"],[1,"★"],[2,"★★"],[3,"★★★"],[4,"★★★★"],[5,"★★★★★"]].forEach(([v,l]) => ratingSel.appendChild(el("option", { value: v, selected: existing?.rating == v }, l)));
  const ratingF = field("Rating", ratingSel);
  const notesIn = el("textarea", { rows: "3" }); notesIn.value = existing?.notes || "";
  const notesF = field("Notes", notesIn);
  [titleF, creatorF, kindF, statusF, ratingF, notesF].forEach(f => body.appendChild(f));

  modal({
    title: existing ? "Edit entry" : "New media entry",
    body,
    actions: [
      { label: "Cancel", onClick: (c) => c() },
      existing && { label: "Delete", variant: "btn--danger", onClick: async (c) => {
        await sb.from("media_log").delete().eq("id", existing.id); c(); toast("Deleted"); refresh();
      }},
      { label: existing ? "Save" : "Add", variant: "btn--primary", onClick: async (c) => {
        const title = titleF.querySelector("input").value.trim();
        if (!title) return;
        const p = {
          title,
          creator: creatorF.querySelector("input").value.trim() || null,
          kind: kindSel.value,
          status: statusSel.value,
          rating: ratingSel.value ? Number(ratingSel.value) : null,
          notes: notesIn.value.trim() || null
        };
        if (statusSel.value === "done" && !existing?.finished_at) p.finished_at = isoDate();
        if (existing) await sb.from("media_log").update(p).eq("id", existing.id);
        else await insertOwned("media_log", p);
        c(); toast("Saved"); refresh();
      }}
    ].filter(Boolean)
  });
}

// =========================================================
// GAMING
// =========================================================
export async function renderGaming(root) {
  root.innerHTML = "";
  const actions = document.getElementById("stage-actions");
  actions.innerHTML = "";
  actions.appendChild(el("button", { class: "btn btn--sm btn--subtle", onClick: () => gamingModal(null, () => renderGaming(root)) }, "+ Log session"));

  const { data } = await sb.from("gaming_sessions").select("*").order("session_date", { ascending: false }).order("created_at", { ascending: false });
  if (!data?.length) return root.appendChild(empty("No sessions yet", "Track what you played, what you captured."));

  const totalMins = data.reduce((s, x) => s + (x.duration_minutes || 0), 0);
  const ytCount = data.filter(x => x.recorded_for_yt).length;
  const summary = el("div", { class: "grid grid--3", style: { marginBottom: "20px" } });
  summary.appendChild(statCard("Total time", `${Math.floor(totalMins/60)}h ${totalMins%60}m`, "var(--grad-aurora)", "card--violet"));
  summary.appendChild(statTickCard("Sessions", data.length, "var(--grad-ocean)", "card--cyan"));
  summary.appendChild(statTickCard("Recorded for YT", ytCount, "var(--grad-ember)", "card--rose"));
  root.appendChild(summary);

  const card = el("article", { class: "card table-card" });
  const table = el("table", { class: "table" });
  table.innerHTML = `<thead><tr><th>Date</th><th>Game</th><th>Duration</th><th>Highlight</th><th>YT</th></tr></thead>`;
  const tbody = el("tbody");
  data.forEach(s => {
    const tr = el("tr", { onClick: () => gamingModal(s, () => renderGaming(root)) });
    tr.appendChild(el("td", { style: { fontFamily: "var(--mono)", fontSize: "12px" } }, longDate(s.session_date)));
    tr.appendChild(el("td", { style: { fontFamily: "var(--serif)", fontSize: "15px" } }, s.game));
    tr.appendChild(el("td", {}, s.duration_minutes ? `${Math.floor(s.duration_minutes/60)}h ${s.duration_minutes%60}m` : "—"));
    tr.appendChild(el("td", { style: { color: "var(--ink-2)" } }, s.highlight || "—"));
    tr.appendChild(el("td", {}, s.recorded_for_yt ? el("span", { class: "chip", style: { color: "var(--a-rose)" } }, "●") : "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  root.appendChild(card);

  triggerTickers(root);
  if (window.gsap && !REDUCED) gsap.from([summary, card], { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
}

function gamingModal(existing, refresh) {
  const body = el("div", { class: "modal__form" });
  const dateF = field("Date", el("input", { type: "date", value: existing?.session_date || isoDate() }));
  const gameF = field("Game", el("input", { type: "text", value: existing?.game || "" }));
  const durF = field("Duration (minutes)", el("input", { type: "number", min: "0", value: existing?.duration_minutes || "" }));
  const hiF = field("Highlight", el("input", { type: "text", value: existing?.highlight || "" }));

  const ytCheck = el("input", { type: "checkbox" });
  if (existing?.recorded_for_yt) ytCheck.checked = true;
  const ytLabel = el("label", { style: { display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "var(--ink-2)" } }, ytCheck, "Recorded for YouTube");
  const ytUrlIn = el("input", { type: "url", placeholder: "https://youtube.com/...", value: existing?.yt_video_url || "" });
  const ytUrlF = field("YouTube URL", ytUrlIn);
  [dateF, gameF, durF, hiF, ytLabel, ytUrlF].forEach(f => body.appendChild(f));

  modal({
    title: existing ? "Edit session" : "New session",
    body,
    actions: [
      { label: "Cancel", onClick: (c) => c() },
      existing && { label: "Delete", variant: "btn--danger", onClick: async (c) => {
        await sb.from("gaming_sessions").delete().eq("id", existing.id); c(); toast("Deleted"); refresh();
      }},
      { label: existing ? "Save" : "Log", variant: "btn--primary", onClick: async (c) => {
        const game = gameF.querySelector("input").value.trim();
        if (!game) return;
        const p = {
          session_date: dateF.querySelector("input").value,
          game,
          duration_minutes: durF.querySelector("input").value ? Number(durF.querySelector("input").value) : null,
          highlight: hiF.querySelector("input").value.trim() || null,
          recorded_for_yt: ytCheck.checked,
          yt_video_url: ytUrlIn.value.trim() || null
        };
        if (existing) await sb.from("gaming_sessions").update(p).eq("id", existing.id);
        else await insertOwned("gaming_sessions", p);
        c(); toast("Saved"); refresh();
      }}
    ].filter(Boolean)
  });
}

// =========================================================
// EDITS
// =========================================================
export async function renderEdits(root) {
  root.innerHTML = "";
  const actions = document.getElementById("stage-actions");
  actions.innerHTML = "";
  actions.appendChild(el("button", { class: "btn btn--sm btn--subtle", onClick: () => editModal(null, () => renderEdits(root)) }, "+ New project"));

  const { data } = await sb.from("edit_projects").select("*").order("updated_at", { ascending: false });
  if (!data?.length) return root.appendChild(empty("No edit projects", "When you pick editing back up, track it here."));

  const grid = el("div", { class: "grid grid--2" });
  const accents = ["card--violet", "card--cyan", "card--rose", "card--amber", "card--jade", "card--lilac"];
  data.forEach((p, i) => {
    const card = el("article", { class: `card card--clickable ${accents[i % accents.length]}`, onClick: () => editModal(p, () => renderEdits(root)) });
    card.appendChild(el("div", { class: "card__eyebrow" }, p.software || "project"));
    card.appendChild(el("h3", { class: "card__title" }, p.title));
    const meta = el("div", { style: { display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" } });
    meta.appendChild(el("span", { class: `status-pill ${p.status}` }, p.status));
    if (p.duration_seconds) {
      const m = Math.floor(p.duration_seconds / 60);
      const s = p.duration_seconds % 60;
      meta.appendChild(el("span", { class: "chip" }, `${m}:${String(s).padStart(2,"0")}`));
    }
    card.appendChild(meta);
    if (p.notes) card.appendChild(el("p", { class: "card__sub", style: { marginTop: "12px" } }, p.notes.slice(0, 100)));
    grid.appendChild(card);
  });
  root.appendChild(grid);
  if (window.gsap && !REDUCED) gsap.from(grid.children, { y: 18, opacity: 0, duration: 0.6, stagger: 0.05, ease: "power3.out" });
}

function editModal(existing, refresh) {
  const body = el("div", { class: "modal__form" });
  const titleF = field("Title", el("input", { type: "text", value: existing?.title || "" }));
  const softF = field("Software", el("input", { type: "text", placeholder: "e.g. DaVinci Resolve, Premiere", value: existing?.software || "" }));
  const statusSel = el("select", {});
  ["draft","editing","review","published","archived"].forEach(s => statusSel.appendChild(el("option", { value: s, selected: existing?.status === s }, s)));
  const statusF = field("Status", statusSel);
  const durF = field("Duration (seconds)", el("input", { type: "number", min: "0", value: existing?.duration_seconds || "" }));
  const urlF = field("Published URL", el("input", { type: "url", value: existing?.published_url || "" }));
  const notesIn = el("textarea", { rows: "4" }); notesIn.value = existing?.notes || "";
  const notesF = field("Notes", notesIn);
  [titleF, softF, statusF, durF, urlF, notesF].forEach(f => body.appendChild(f));

  modal({
    title: existing ? "Edit project" : "New project",
    body,
    actions: [
      { label: "Cancel", onClick: (c) => c() },
      existing && { label: "Delete", variant: "btn--danger", onClick: async (c) => {
        await sb.from("edit_projects").delete().eq("id", existing.id); c(); toast("Deleted"); refresh();
      }},
      { label: existing ? "Save" : "Create", variant: "btn--primary", onClick: async (c) => {
        const title = titleF.querySelector("input").value.trim();
        if (!title) return;
        const p = {
          title,
          software: softF.querySelector("input").value.trim() || null,
          status: statusSel.value,
          duration_seconds: durF.querySelector("input").value ? Number(durF.querySelector("input").value) : null,
          published_url: urlF.querySelector("input").value.trim() || null,
          notes: notesIn.value.trim() || null,
          updated_at: new Date().toISOString()
        };
        if (existing) await sb.from("edit_projects").update(p).eq("id", existing.id);
        else await insertOwned("edit_projects", p);
        c(); toast("Saved"); refresh();
      }}
    ].filter(Boolean)
  });
}

// =========================================================
// FINANCE
// =========================================================
export async function renderFinance(root) {
  root.innerHTML = "";
  const actions = document.getElementById("stage-actions");
  actions.innerHTML = "";
  actions.appendChild(el("button", { class: "btn btn--sm btn--subtle", onClick: () => txModal(null, () => renderFinance(root)) }, "+ New transaction"));

  const { data } = await sb.from("transactions").select("*").order("tx_date", { ascending: false }).order("created_at", { ascending: false });

  const income = (data || []).filter(t => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (data || []).filter(t => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const summary = el("div", { class: "grid grid--3", style: { marginBottom: "20px" } });
  summary.appendChild(statTickCard("Income", income, "var(--grad-ocean)", "card--jade", { prefix: "৳" }));
  summary.appendChild(statTickCard("Expenses", expense, "var(--grad-ember)", "card--rose", { prefix: "৳" }));
  const net = income - expense;
  summary.appendChild(statTickCard("Net", Math.abs(net), net >= 0 ? "var(--grad-aurora)" : "var(--grad-ember)", net >= 0 ? "card--cyan" : "card--amber", { prefix: net < 0 ? "−৳" : "৳" }));
  root.appendChild(summary);

  if (!data?.length) {
    triggerTickers(root);
    return root.appendChild(empty("No transactions", "Log income, expenses, categories."));
  }

  const card = el("article", { class: "card table-card" });
  const table = el("table", { class: "table" });
  table.innerHTML = `<thead><tr><th>Date</th><th>Category</th><th>Note</th><th style="text-align:right">Amount</th></tr></thead>`;
  const tbody = el("tbody");
  data.forEach(t => {
    const tr = el("tr", { onClick: () => txModal(t, () => renderFinance(root)) });
    tr.appendChild(el("td", { style: { fontFamily: "var(--mono)", fontSize: "12px", color: "var(--ink-3)" } }, longDate(t.tx_date)));
    tr.appendChild(el("td", {}, t.category || "—"));
    tr.appendChild(el("td", { style: { color: "var(--ink-2)" } }, t.note || "—"));
    const amt = el("td", { class: t.kind === "income" ? "amount-pos" : "amount-neg", style: { textAlign: "right" } },
      (t.kind === "income" ? "+" : "−") + money(Math.abs(t.amount)).replace("−",""));
    tr.appendChild(amt);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  root.appendChild(card);

  triggerTickers(root);
  if (window.gsap && !REDUCED) gsap.from([summary, card], { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
}

function txModal(existing, refresh) {
  const body = el("div", { class: "modal__form" });
  const dateF = field("Date", el("input", { type: "date", value: existing?.tx_date || isoDate() }));
  const kindSel = el("select", {});
  [["income","Income"],["expense","Expense"]].forEach(([v,l]) => kindSel.appendChild(el("option", { value: v, selected: existing?.kind === v }, l)));
  const kindF = field("Type", kindSel);
  const amtF = field("Amount (৳)", el("input", { type: "number", step: "0.01", value: existing?.amount ?? "" }));
  const catF = field("Category", el("input", { type: "text", placeholder: "e.g. food, transport, freelance", value: existing?.category || "" }));
  const noteF = field("Note", el("input", { type: "text", value: existing?.note || "" }));
  [dateF, kindF, amtF, catF, noteF].forEach(f => body.appendChild(f));

  modal({
    title: existing ? "Edit transaction" : "New transaction",
    body,
    actions: [
      { label: "Cancel", onClick: (c) => c() },
      existing && { label: "Delete", variant: "btn--danger", onClick: async (c) => {
        await sb.from("transactions").delete().eq("id", existing.id); c(); toast("Deleted"); refresh();
      }},
      { label: existing ? "Save" : "Add", variant: "btn--primary", onClick: async (c) => {
        const amount = Number(amtF.querySelector("input").value);
        if (!amount) return;
        const p = {
          tx_date: dateF.querySelector("input").value,
          kind: kindSel.value,
          amount,
          category: catF.querySelector("input").value.trim() || null,
          note: noteF.querySelector("input").value.trim() || null
        };
        if (existing) await sb.from("transactions").update(p).eq("id", existing.id);
        else await insertOwned("transactions", p);
        c(); toast("Saved"); refresh();
      }}
    ].filter(Boolean)
  });
}

// =========================================================
// HEALTH — with Apple-style ring trio
// =========================================================
export async function renderHealth(root) {
  root.innerHTML = "";
  const actions = document.getElementById("stage-actions");
  actions.innerHTML = "";
  actions.appendChild(el("button", { class: "btn btn--sm btn--subtle", onClick: () => healthModal(null, () => renderHealth(root)) }, "+ Log today"));

  const { data } = await sb.from("health_logs").select("*").order("log_date", { ascending: false }).limit(60);

  if (!data?.length) return root.appendChild(empty("No health logs", "Track sleep, water, movement."));

  const last7 = data.slice(0, 7);
  const todays = data[0];

  const avg = (key) => {
    const vals = last7.map(d => d[key]).filter(v => v != null);
    if (!vals.length) return 0;
    return +(vals.reduce((a,b) => a + Number(b), 0) / vals.length).toFixed(1);
  };

  // Ring trio — sleep/water/move based on today's log vs targets
  const tSleep = todays?.sleep_hours ?? 0;
  const tWater = todays?.water_ml ?? 0;
  const tMove  = todays?.workout_minutes ?? 0;

  const TARGETS = { sleep: 8, water: 2500, move: 30 };
  const ringTrio = el("article", { class: "card card--rose", style: { padding: "30px 24px" } });
  ringTrio.appendChild(el("div", { class: "card__eyebrow", style: { textAlign: "center", marginBottom: "16px" } }, "Today"));
  const rings = el("div", { class: "ring-wrap" });
  rings.appendChild(ringEl("Sleep", tSleep, TARGETS.sleep, "h", "var(--a-rose)"));
  rings.appendChild(ringEl("Water", tWater, TARGETS.water, "ml", "var(--a-cyan)"));
  rings.appendChild(ringEl("Move", tMove, TARGETS.move, "m", "var(--a-jade)"));
  ringTrio.appendChild(rings);
  root.appendChild(ringTrio);

  // 7-day averages
  const summary = el("div", { class: "grid grid--4", style: { margin: "20px 0" } });
  summary.appendChild(statTickCard("Sleep avg", avg("sleep_hours"), "var(--grad-cosmic)", "card--violet", { decimals: 1, suffix: "h" }));
  summary.appendChild(statTickCard("Water avg", avg("water_ml"), "var(--grad-ocean)", "card--cyan", { suffix: "ml" }));
  summary.appendChild(statTickCard("Move avg", avg("workout_minutes"), "var(--grad-aurora)", "card--jade", { suffix: "m" }));
  summary.appendChild(statCard("Weight", data[0].weight_kg ? `${data[0].weight_kg}kg` : "—", "var(--grad-ember)", "card--amber"));
  root.appendChild(summary);

  const card = el("article", { class: "card table-card" });
  const table = el("table", { class: "table" });
  table.innerHTML = `<thead><tr><th>Date</th><th>Sleep</th><th>Water</th><th>Move</th><th>Weight</th><th>Notes</th></tr></thead>`;
  const tbody = el("tbody");
  data.forEach(h => {
    const tr = el("tr", { onClick: () => healthModal(h, () => renderHealth(root)) });
    tr.appendChild(el("td", { style: { fontFamily: "var(--mono)", fontSize: "12px" } }, longDate(h.log_date)));
    tr.appendChild(el("td", {}, h.sleep_hours ? `${h.sleep_hours}h` : "—"));
    tr.appendChild(el("td", {}, h.water_ml ? `${h.water_ml}ml` : "—"));
    tr.appendChild(el("td", {}, h.workout_minutes ? `${h.workout_minutes}m` : "—"));
    tr.appendChild(el("td", {}, h.weight_kg ? `${h.weight_kg}kg` : "—"));
    tr.appendChild(el("td", { style: { color: "var(--ink-3)" } }, h.notes || "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  root.appendChild(card);

  triggerTickers(root);
  if (window.gsap && !REDUCED) gsap.from([ringTrio, summary, card], { y: 16, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
}

function ringEl(label, value, target, unit, color) {
  const wrap = el("div", { class: "ring", style: { "--ring-color": color } });
  const pct = Math.min(1, value / target);
  const C = 2 * Math.PI * 50;
  const dashTarget = C * (1 - pct);
  wrap.innerHTML = `
    <svg viewBox="0 0 120 120">
      <circle class="ring__bg" cx="60" cy="60" r="50"/>
      <circle class="ring__fg" cx="60" cy="60" r="50" style="--circ:${C}; --ring-target:${dashTarget}"/>
    </svg>
    <div class="ring__center">
      <div class="ring__value">${value}${unit}</div>
      <div class="ring__label">${label}</div>
    </div>
  `;
  return wrap;
}

function healthModal(existing, refresh) {
  const body = el("div", { class: "modal__form" });
  const dateF = field("Date", el("input", { type: "date", value: existing?.log_date || isoDate() }));
  const sleepF = field("Sleep (hours)", el("input", { type: "number", step: "0.1", min: "0", max: "24", value: existing?.sleep_hours ?? "" }));
  const waterF = field("Water (ml)", el("input", { type: "number", step: "50", min: "0", value: existing?.water_ml ?? "" }));
  const workF = field("Workout (minutes)", el("input", { type: "number", min: "0", value: existing?.workout_minutes ?? "" }));
  const wtF = field("Weight (kg)", el("input", { type: "number", step: "0.1", min: "0", value: existing?.weight_kg ?? "" }));
  const notesIn = el("textarea", { rows: "2" }); notesIn.value = existing?.notes || "";
  const notesF = field("Notes", notesIn);
  [dateF, sleepF, waterF, workF, wtF, notesF].forEach(f => body.appendChild(f));

  modal({
    title: existing ? "Edit log" : "New health log",
    body,
    actions: [
      { label: "Cancel", onClick: (c) => c() },
      existing && { label: "Delete", variant: "btn--danger", onClick: async (c) => {
        await sb.from("health_logs").delete().eq("id", existing.id); c(); toast("Deleted"); refresh();
      }},
      { label: existing ? "Save" : "Log", variant: "btn--primary", onClick: async (c) => {
        const p = {
          log_date: dateF.querySelector("input").value,
          sleep_hours: sleepF.querySelector("input").value ? Number(sleepF.querySelector("input").value) : null,
          water_ml: waterF.querySelector("input").value ? Number(waterF.querySelector("input").value) : null,
          workout_minutes: workF.querySelector("input").value ? Number(workF.querySelector("input").value) : null,
          weight_kg: wtF.querySelector("input").value ? Number(wtF.querySelector("input").value) : null,
          notes: notesIn.value.trim() || null
        };
        if (existing) await sb.from("health_logs").update(p).eq("id", existing.id);
        else await insertOwned("health_logs", p);
        c(); toast("Saved"); refresh();
      }}
    ].filter(Boolean)
  });
}

// =========================================================
// helpers
// =========================================================
function field(label, input) {
  const f = el("label", { class: "field" });
  f.appendChild(el("span", {}, label));
  f.appendChild(input);
  return f;
}

function statCard(label, value, gradient, accentClass = "") {
  const c = el("article", { class: `card ${accentClass}` });
  c.appendChild(el("div", { class: "card__eyebrow" }, label));
  c.appendChild(el("div", { class: "card__big", style: { "--card-grad": gradient } }, value));
  return c;
}

function statTickCard(label, value, gradient, accentClass = "", opts = {}) {
  const c = el("article", { class: `card ${accentClass}` });
  c.appendChild(el("div", { class: "card__eyebrow" }, label));
  const big = el("div", {
    class: "card__big",
    style: { "--card-grad": gradient },
    "data-tick": String(value),
    "data-decimals": String(opts.decimals || 0),
    "data-prefix": opts.prefix || "",
    "data-suffix": opts.suffix || ""
  }, (opts.prefix || "") + "0" + (opts.suffix || ""));
  c.appendChild(big);
  return c;
}

function triggerTickers(root) {
  requestAnimationFrame(() => {
    root.querySelectorAll("[data-tick]").forEach(node => {
      const target = Number(node.dataset.tick);
      const decimals = Number(node.dataset.decimals || 0);
      const prefix = node.dataset.prefix || "";
      const suffix = node.dataset.suffix || "";
      const opts = { duration: 850, decimals, prefix, suffix };
      if (prefix === "৳" || prefix === "−৳") {
        opts.format = (n) => prefix + Math.round(n).toLocaleString("en-IN");
      }
      tickNumber(node, target, opts);
    });
  });
}

function empty(title, sub) {
  const e = el("div", { class: "empty" });
  e.appendChild(el("div", { class: "empty__icon" }, "◌"));
  e.appendChild(el("h3", { class: "empty__title" }, title));
  e.appendChild(el("p", { class: "empty__sub" }, sub));
  return e;
}
