import { CONFIG } from "./config.js";
import { sb, signInWithPassword, signUp, signOut, currentUser, signInWithPasskey, hasPasskey } from "./supabase-client.js";
import { $, el, longDate, toast } from "./util.js";

import { renderToday } from "./view-today.js";
import { renderJournal } from "./view-journal.js";
import { renderHabits } from "./view-habits.js";
import { renderMood } from "./view-mood.js";
import { renderGoals } from "./view-goals.js";
import { renderMedia, renderGaming, renderEdits, renderFinance, renderHealth } from "./view-tables.js";

(async function boot() {
  await sleep(1800);
  document.getElementById("boot").style.display = "none";

  const user = await currentUser();
  if (user && user.email?.toLowerCase() === CONFIG.OWNER_EMAIL.toLowerCase()) {
    showApp(user);
  } else {
    showAuth();
  }
})();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showAuth() {
  const auth = document.getElementById("auth");
  auth.classList.remove("hidden");

  const form = document.getElementById("auth-form");
  const emailIn = document.getElementById("auth-email");
  const passIn = document.getElementById("auth-password");
  const submitBtn = document.getElementById("auth-submit");
  const errorEl = document.getElementById("auth-error");
  const passkeyBtn = document.getElementById("passkey-btn");
  const tabs = document.querySelectorAll(".auth__tab");

  let mode = "signin";
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("is-active"));
    t.classList.add("is-active");
    mode = t.dataset.tab;
    submitBtn.querySelector(".btn__label").textContent = mode === "signin" ? "Enter Atlas" : "Create account";
  }));

  emailIn.value = CONFIG.OWNER_EMAIL;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    submitBtn.disabled = true;
    try {
      if (mode === "signin") {
        const { user } = await signInWithPassword(emailIn.value.trim(), passIn.value);
        await onSignedIn(user);
      } else {
        await signUp(emailIn.value.trim(), passIn.value);
        toast("Check your email to confirm, then sign in.");
      }
    } catch (err) {
      errorEl.textContent = err.message || "Something went wrong.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  passkeyBtn.addEventListener("click", async () => {
    errorEl.textContent = "";
    try {
      await signInWithPasskey();
      const user = await currentUser();
      await onSignedIn(user);
    } catch (err) {
      errorEl.textContent = err.message || "Passkey sign-in failed.";
    }
  });
}

async function onSignedIn(user) {
  if (!user || user.email?.toLowerCase() !== CONFIG.OWNER_EMAIL.toLowerCase()) {
    toast("Unauthorized.");
    await signOut();
    return;
  }
  document.getElementById("auth").classList.add("hidden");
  showApp(user);

  if (!(await hasPasskey()) && window.PublicKeyCredential) {
    setTimeout(() => toast("Tip: enroll a passkey for one-tap sign-in next time."), 1500);
  }
}

const ROUTES = {
  today:   { title: "Today",   render: renderToday,   showDate: true },
  journal: { title: "Journal", render: renderJournal },
  habits:  { title: "Habits",  render: renderHabits },
  mood:    { title: "Mood",    render: renderMood },
  goals:   { title: "Goals",   render: renderGoals },
  media:   { title: "Media",   render: renderMedia },
  gaming:  { title: "Gaming",  render: renderGaming },
  edits:   { title: "Edits",   render: renderEdits },
  finance: { title: "Finance", render: renderFinance },
  health:  { title: "Health",  render: renderHealth }
};

let currentUserRef = null;
let currentView = null;
let renderToken = 0;

function showApp(user) {
  currentUserRef = user;
  document.getElementById("app").classList.remove("hidden");

  // Restore collapse preference
  if (localStorage.getItem("atlas-rail-collapsed") === "1") {
    document.getElementById("app").classList.add("is-collapsed");
  }

  // Rail nav
  document.querySelectorAll(".rail__link[data-view]").forEach(link => {
    link.addEventListener("click", () => navigate(link.dataset.view));
  });

  // Rail collapse toggle
  document.getElementById("rail-toggle").addEventListener("click", () => {
    const app = document.getElementById("app");
    app.classList.toggle("is-collapsed");
    localStorage.setItem("atlas-rail-collapsed", app.classList.contains("is-collapsed") ? "1" : "0");
  });

  document.getElementById("sign-out").addEventListener("click", async () => {
    await signOut();
    location.reload();
  });

  // External navigate event
  window.addEventListener("atlas:navigate", (e) => navigate(e.detail));

  // Hash sync — only navigate when hash actually changes from current view
  window.addEventListener("hashchange", () => {
    const v = (location.hash || "#today").slice(1);
    if (ROUTES[v] && v !== currentView) navigate(v);
  });

  const initial = (location.hash || "#today").slice(1);
  navigate(ROUTES[initial] ? initial : "today");
}

async function navigate(view) {
  if (!ROUTES[view]) return;
  if (view === currentView) return;          // no-op if already here — stops double render
  currentView = view;

  // Update hash silently (no hashchange fires if same value)
  if (location.hash !== "#" + view) {
    history.replaceState(null, "", "#" + view);
  }

  // Cancel any in-flight render
  const myToken = ++renderToken;

  // Update rail
  document.querySelectorAll(".rail__link[data-view]").forEach(l => {
    l.classList.toggle("is-active", l.dataset.view === view);
  });

  // Header
  const route = ROUTES[view];
  document.getElementById("stage-date").textContent = route.showDate ? longDate(new Date()) : "";
  document.getElementById("stage-title").textContent = route.title;
  document.getElementById("stage-actions").innerHTML = "";

  // Body — clear immediately, render once
  const body = document.getElementById("view");
  body.innerHTML = "";
  body.style.opacity = 0;
  await sleep(80);
  if (myToken !== renderToken) return;       // newer navigation came in, abandon

  try {
    await route.render(body, currentUserRef);
  } catch (err) {
    console.error(err);
    if (myToken !== renderToken) return;
    body.innerHTML = "";
    body.appendChild(el("div", { class: "empty" },
      el("div", { class: "empty__icon" }, "⚠"),
      el("h3", { class: "empty__title" }, "Something went wrong"),
      el("p", { class: "empty__sub" }, err.message || "Check the console.")
    ));
  }
  if (myToken === renderToken) body.style.opacity = 1;
}
