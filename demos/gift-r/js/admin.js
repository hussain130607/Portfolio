/* ==========================================================
   Gift R — Sign in & admin dashboard
   login.html  → <body data-page="login">
   admin.html  → <body data-page="admin">
   All writes go through GiftAPI.admin; Supabase RLS makes sure
   only accounts listed in the `admins` table can change data.
   ========================================================== */

(function () {
  "use strict";

  const API = window.GiftAPI;
  const A = API.admin;

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let currency = "$";
  const money = (n) => {
    const v = Math.round((+n || 0) * 100) / 100;
    return (
      currency +
      v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })
    );
  };
  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
  const productImage = (p) => (p.images && p.images[0]) || API.placeholderImage(p.emoji, p.colors);
  const categoryImage = (c) => c.image || API.placeholderImage(c.emoji, c.colors);
  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    money: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>',
    box: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8 12 3l9 5v8l-9 5-9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gift: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    trash2: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
    tag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  };

  function toast(title, text = "", icon) {
    const wrap = $(".toast-wrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<span class="toast__icon">${icon || ICON.check}</span><div class="toast__text"><strong>${esc(title)}</strong>${esc(text)}</div>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => el.remove());
    }, icon === ICON.alert ? 6000 : 3000);
  }
  const toastError = (err) => toast("Something went wrong", err.message || String(err), ICON.alert);

  async function withBusy(btn, label, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = label;
    try {
      return await fn();
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  const switchHTML = (attrs, checked, label = "") =>
    `<label class="switch"><input type="checkbox" ${attrs} ${checked ? "checked" : ""}><span class="switch__track"></span>${label ? `<span>${label}</span>` : ""}</label>`;

  /* ---------------- Modal ---------------- */
  function openModal({ title, body, foot = "", size = "", onClose }) {
    const root = $("#modalRoot");
    const el = document.createElement("div");
    el.className = `modal modal--admin ${size ? "modal--" + size : ""}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="modal__box">
        <div class="modal__head"><h2>${esc(title)}</h2><button type="button" class="modal__close" data-close aria-label="Close">×</button></div>
        <div class="modal__body">${body}</div>
        ${foot ? `<div class="modal__foot">${foot}</div>` : ""}
      </div>`;
    root.appendChild(el);
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement;

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      el.remove();
      if (!$(".modal", root)) document.body.style.overflow = "";
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      if (onClose) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape" && root.lastElementChild === el) close();
    };
    document.addEventListener("keydown", onKey);
    let downOnOverlay = false;
    el.addEventListener("mousedown", (e) => (downOnOverlay = e.target === el));
    el.addEventListener("click", (e) => {
      if ((e.target === el && downOnOverlay) || e.target.closest("[data-close]")) close();
    });
    const first = $("input, select, textarea, button:not(.modal__close)", $(".modal__body", el)) || $(".modal__close", el);
    setTimeout(() => first && first.focus(), 30);
    return { el, close };
  }

  function confirmDialog({ title, message, confirmLabel = "Delete", danger = true }) {
    return new Promise((resolve) => {
      let answer = false;
      const m = openModal({
        title,
        size: "sm",
        body: `<p class="confirm-text">${esc(message)}</p>`,
        foot: `<button type="button" class="btn btn--ghost" data-close>Cancel</button>
               <button type="button" class="btn ${danger ? "btn--primary" : "btn--gold"}" data-confirm>${esc(confirmLabel)}</button>`,
        onClose: () => resolve(answer),
      });
      $("[data-confirm]", m.el).addEventListener("click", () => {
        answer = true;
        m.close();
      });
      setTimeout(() => $("[data-confirm]", m.el).focus(), 40);
    });
  }

  // Marks .field wrappers invalid; returns true if all checks pass
  function checkFields(form, checks) {
    let first = null;
    checks.forEach(([selector, valid]) => {
      const input = $(selector, form);
      const field = input.closest(".field");
      field.classList.toggle("has-error", !valid);
      if (!valid && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }

  /* ==========================================================
     Login page
     ========================================================== */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // One door for everyone: the account's role decides where it opens.
  // Admins are recognised from their e-mail in the database, so nothing on
  // this page advertises that an admin area exists.
  function homeForRole(role) {
    return role === "super" || role === "admin" ? "admin.html" : "account.html";
  }

  async function initLogin() {
    const form = $("#loginForm");
    const signupForm = $("#signupForm");
    const errorBox = $("#loginError");
    const infoBox = $("#loginInfo");
    const showError = (msg) => {
      errorBox.textContent = msg || "";
      errorBox.hidden = !msg;
      if (msg) infoBox.hidden = true;
    };
    const showInfo = (msg) => {
      infoBox.textContent = msg || "";
      infoBox.hidden = !msg;
      if (msg) errorBox.hidden = true;
    };

    const params = new URLSearchParams(location.search);
    if (params.get("denied")) showError("That account doesn't have access to this page.");
    if (params.get("signedout")) showInfo("You have been signed out.");

    if (API.isDemo) {
      $("#demoNotice").hidden = false;
    } else {
      try {
        const user = await API.auth.getUser();
        if (user) return location.replace(homeForRole(await API.auth.role()));
      } catch (e) {
        /* stay on this page */
      }
    }

    /* ---- tabs ---- */
    const panes = { in: $("#signInPane"), up: $("#signUpPane") };
    const tabs = { in: $("#tabSignIn"), up: $("#tabSignUp") };
    function showPane(which) {
      Object.keys(panes).forEach((k) => {
        panes[k].hidden = k !== which;
        tabs[k].classList.toggle("is-active", k === which);
        tabs[k].setAttribute("aria-selected", String(k === which));
      });
      showError("");
      showInfo("");
    }
    tabs.in.addEventListener("click", () => showPane("in"));
    tabs.up.addEventListener("click", () => showPane("up"));
    if (params.get("signup")) showPane("up");

    /* ---- password reveal ---- */
    [["#togglePassword", "#loginPassword"], ["#toggleSuPassword", "#suPassword"]].forEach(([btnSel, inputSel]) => {
      $(btnSel).addEventListener("click", (e) => {
        const input = $(inputSel);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        e.currentTarget.textContent = show ? "Hide" : "Show";
        e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    });

    [form, signupForm].forEach((f) =>
      f.addEventListener("input", (e) => {
        const field = e.target.closest(".field");
        if (field) field.classList.remove("has-error");
      })
    );

    /* ---- sign in ---- */
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError("");
      const email = $("#loginEmail").value.trim();
      const password = $("#loginPassword").value;
      const valid = checkFields(form, [
        ["#loginEmail", EMAIL_RE.test(email)],
        ["#loginPassword", password.length > 0],
      ]);
      if (!valid) return;
      if (API.isDemo) return showError("The backend isn't connected yet — see SETUP.md.");

      await withBusy($("#loginBtn"), "Signing in…", async () => {
        try {
          await API.auth.signIn(email, password);
          location.replace(homeForRole(await API.auth.role()));
        } catch (err) {
          showError(/invalid login credentials/i.test(err.message) ? "Wrong email or password." : err.message);
        }
      });
    });

    /* ---- forgot password ---- */
    $("#forgotBtn").addEventListener("click", async (e) => {
      showError("");
      const email = $("#loginEmail").value.trim();
      if (!EMAIL_RE.test(email)) return showError("Enter your email address above, then tap this again.");
      if (API.isDemo) return showError("The backend isn't connected yet — see SETUP.md.");
      await withBusy(e.currentTarget, "Sending…", async () => {
        try {
          await API.auth.sendPasswordReset(email);
          showInfo("If that email has an account, a reset link is on its way.");
        } catch (err) {
          showError(err.message);
        }
      });
    });

    /* ---- create account ---- */
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError("");
      const name = $("#suName").value.trim();
      const email = $("#suEmail").value.trim();
      const password = $("#suPassword").value;
      const valid = checkFields(signupForm, [
        ["#suName", name.length > 1],
        ["#suEmail", EMAIL_RE.test(email)],
        ["#suPassword", password.length >= 8],
      ]);
      if (!valid) return;
      if (API.isDemo) return showError("The backend isn't connected yet — see SETUP.md.");

      await withBusy($("#signupBtn"), "Creating…", async () => {
        try {
          const res = await API.auth.signUp(email, password, name);
          if (res.needsConfirmation) {
            showPane("in");
            showInfo("Account created. Check " + email + " for the confirmation link, then sign in.");
            return;
          }
          location.replace(homeForRole(await API.auth.role()));
        } catch (err) {
          showError(
            /already registered|already been registered/i.test(err.message)
              ? "An account with that email already exists — sign in instead."
              : err.message
          );
        }
      });
    });
  }

  /* ==========================================================
     Admin app
     ========================================================== */
  let currentRole = null;
  const state = { products: null, categories: null, orders: null, promos: null, settings: null, team: null };
  const loaders = {
    products: () => A.listProducts(),
    categories: () => A.listCategories(),
    orders: () => A.listOrders(),
    promos: () => A.listPromos(),
    settings: () => A.getSettings(),
    team: () => A.listTeam(),
  };
  async function load(key, force) {
    if (!state[key] || force) state[key] = await loaders[key]();
    if (key === "orders") updatePendingBadge();
    if (key === "settings") currency = state.settings.currency || "$";
    return state[key];
  }

  function updatePendingBadge() {
    const badge = $("#pendingCount");
    if (!badge || !state.orders) return;
    const n = state.orders.filter((o) => o.status === "pending").length;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  const VIEWS = {
    dashboard: { title: "Dashboard", render: renderDashboard },
    products: { title: "Products", render: renderProducts },
    categories: { title: "Categories", render: renderCategories },
    orders: { title: "Orders", render: renderOrders },
    promos: { title: "Promo Codes", render: renderPromos },
    team: { title: "Admins", render: renderTeam, superOnly: true },
    settings: { title: "Store Settings", render: renderSettings },
  };
  let routeToken = 0;
  const isStale = (token) => token !== routeToken;

  async function route() {
    let name = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "dashboard";
    if (VIEWS[name].superOnly && currentRole !== "super") name = "dashboard";
    const view = VIEWS[name];
    const token = ++routeToken;
    $$(".admin-nav a").forEach((a) => a.classList.toggle("is-active", a.dataset.view === name));
    $("#viewTitle").textContent = view.title;
    document.title = `${view.title} | Gift R Admin`;
    setMenu(false);
    const container = $("#adminView");
    container.innerHTML = '<div class="page-loader"><span class="spinner"></span> Loading…</div>';
    try {
      await view.render(container, token);
      if (!isStale(token)) labelTableCells(container);
    } catch (err) {
      if (isStale(token)) return;
      container.innerHTML = `
        <div class="panel"><div class="panel__body">
          <div class="notice notice--error">⚠️ ${esc(err.message)}</div>
          <button class="btn btn--outline btn--sm" id="retryView">Try again</button>
        </div></div>`;
      $("#retryView").addEventListener("click", route);
    }
  }

  // On phones every table row is redrawn as a card (see css/admin.css), and a
  // cell without its column name is meaningless there. Copying the headers into
  // data-label here keeps the seven table markups free of duplicated labels.
  function labelTableCells(scope) {
    $$("table.table", scope).forEach((table) => {
      const heads = $$("thead th", table).map((th) => th.textContent.trim());
      $$("tbody tr", table).forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => {
          if (td.hasAttribute("colspan") || !heads[i]) return;
          td.setAttribute("data-label", heads[i]);
        });
      });
    });
  }

  function setMenu(open) {
    $("#adminSide").classList.toggle("is-open", open);
    $("#adminOverlay").classList.toggle("is-open", open);
  }

  async function initAdmin() {
    const gate = $("#adminGate");
    if (API.isDemo) {
      gate.innerHTML = `
        <div class="login__card">
          <h1>Connect your backend</h1>
          <div class="notice notice--warn">The admin dashboard needs Supabase. Add your project URL and anon key to
          <code>js/config.js</code>, run <code>supabase/schema.sql</code>, then create your admin account — see <code>SETUP.md</code>.</div>
          <a href="index.html" class="btn btn--primary btn--block">Back to the shop</a>
        </div>`;
      return;
    }

    let user = null;
    try {
      user = await API.auth.getUser();
    } catch (e) {
      /* treated as logged out */
    }
    if (!user) return location.replace("login.html");
    // A signed-in shopper simply goes to their own dashboard — no sign-out,
    // no message that hints an admin area exists.
    currentRole = await API.auth.role();
    if (currentRole !== "super" && currentRole !== "admin") return location.replace("account.html");

    document.body.classList.toggle("is-super", currentRole === "super");
    gate.hidden = true;
    $("#adminApp").hidden = false;
    $("#adminEmail").textContent = user.email;
    $("#adminAvatar").textContent = (user.email || "A")[0].toUpperCase();

    API.auth.onChange((event) => {
      if (event === "SIGNED_OUT") location.replace("login.html");
    });
    $("#logoutBtn").addEventListener("click", async (e) => {
      await withBusy(e.currentTarget, "Logging out…", () => API.auth.signOut());
      location.replace("login.html");
    });
    $("#adminMenu").addEventListener("click", () => setMenu(true));
    $("#adminOverlay").addEventListener("click", () => setMenu(false));

    try {
      await load("settings");
    } catch (e) {
      /* currency falls back to $ */
    }
    load("orders").catch(() => {});

    window.addEventListener("hashchange", route);
    route();
  }

  /* ==========================================================
     View: Admins (super admin only)
     ========================================================== */
  async function renderTeam(c, token) {
    const { admins, invites } = await load("team", true);
    if (isStale(token)) return;

    const sorted = admins.slice().sort((a, b) => (a.role === "super" ? -1 : b.role === "super" ? 1 : 0));

    c.innerHTML = `
      <div class="view">
        <div class="panel">
          <div class="panel__head">
            <h2>Admin accounts</h2>
            <button type="button" class="btn btn--primary btn--sm" id="addAdmin">Add admin</button>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Email</th><th>Role</th><th>Added</th><th class="num">Actions</th></tr></thead>
              <tbody>
                ${sorted
                  .map(
                    (a) => `
                  <tr>
                    <td><strong>${esc(a.email || "(unknown)")}</strong></td>
                    <td><span class="pill ${a.role === "super" ? "pill--delivered" : "pill--processing"}">${
                      a.role === "super" ? "Super admin" : "Admin"
                    }</span></td>
                    <td>${fmtDate(a.createdAt)}</td>
                    <td class="num">${
                      a.role === "super"
                        ? '<span class="muted">Permanent</span>'
                        : `<button type="button" class="icon-action icon-action--danger" data-remove="${esc(
                            a.userId
                          )}" data-email="${esc(a.email)}" aria-label="Remove admin">${ICON.trash}</button>`
                    }</td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h2>Pending invitations</h2></div>
          <div class="panel__body">
            <p class="muted">An invited person becomes an admin the moment they create an account with that email.</p>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Email</th><th>Note</th><th>Invited</th><th class="num">Actions</th></tr></thead>
              <tbody>
                ${
                  invites.length
                    ? invites
                        .map(
                          (i) => `
                  <tr>
                    <td><strong>${esc(i.email)}</strong></td>
                    <td>${esc(i.note) || '<span class="muted">—</span>'}</td>
                    <td>${fmtDate(i.createdAt)}</td>
                    <td class="num"><button type="button" class="icon-action icon-action--danger" data-cancel="${esc(
                      i.email
                    )}" aria-label="Cancel invitation">${ICON.trash}</button></td>
                  </tr>`
                        )
                        .join("")
                    : `<tr><td colspan="4" class="empty-row">No pending invitations.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    const view = $(".view", c);

    $("#addAdmin", view).addEventListener("click", () => {
      const m = openModal({
        title: "Add an admin",
        size: "sm",
        body: `
          <p class="muted">Enter the email of the person you want to give admin access. They sign up (or sign in)
          with that email and land straight in this dashboard.</p>
          <div class="field">
            <label for="inviteEmail">Email</label>
            <input id="inviteEmail" type="email" autocomplete="off" />
            <span class="error-msg">Please enter a valid email address.</span>
          </div>
          <div class="field">
            <label for="inviteNote">Note <span class="muted">(optional)</span></label>
            <input id="inviteNote" type="text" maxlength="80" placeholder="e.g. shop manager" />
          </div>`,
        foot: `<button type="button" class="btn btn--ghost" data-close>Cancel</button>
               <button type="button" class="btn btn--primary" id="inviteSave">Send invite</button>`,
      });
      $("#inviteSave", m.el).addEventListener("click", async (e) => {
        const email = $("#inviteEmail", m.el).value.trim();
        if (!checkFields(m.el, [["#inviteEmail", EMAIL_RE.test(email)]])) return;
        await withBusy(e.currentTarget, "Saving…", async () => {
          try {
            await A.inviteAdmin(email, $("#inviteNote", m.el).value);
            m.close();
            toast("Invitation saved", email + " becomes an admin on sign-up.");
            route();
          } catch (err) {
            toast("Could not save", err.message, ICON.alert);
          }
        });
      });
    });

    view.addEventListener("click", async (e) => {
      const remove = e.target.closest("[data-remove]");
      if (remove) {
        const ok = await confirmDialog({
          title: "Remove admin access?",
          message: `${remove.dataset.email} will keep their account but lose access to this dashboard.`,
          confirmLabel: "Remove access",
        });
        if (!ok) return;
        try {
          await A.removeAdmin(remove.dataset.remove);
          toast("Admin removed", remove.dataset.email);
          route();
        } catch (err) {
          toast("Could not remove", err.message, ICON.alert);
        }
        return;
      }

      const cancel = e.target.closest("[data-cancel]");
      if (cancel) {
        try {
          await A.cancelInvite(cancel.dataset.cancel);
          toast("Invitation cancelled", cancel.dataset.cancel);
          route();
        } catch (err) {
          toast("Could not cancel", err.message, ICON.alert);
        }
      }
    });
  }

  /* ==========================================================
     View: Dashboard
     ========================================================== */
  async function renderDashboard(c, token) {
    const [products, orders] = await Promise.all([load("products", true), load("orders", true)]);
    if (isStale(token)) return;

    const counted = orders.filter((o) => o.status !== "cancelled");
    const revenue = counted.reduce((s, o) => s + +o.total, 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const active = products.filter((p) => p.active).length;
    const outOfStock = products.filter((p) => !p.inStock);
    const hidden = products.filter((p) => !p.active);

    const sold = {};
    counted.forEach((o) =>
      (o.order_items || []).forEach((i) => {
        sold[i.product_name] = sold[i.product_name] || { qty: 0, revenue: 0 };
        sold[i.product_name].qty += i.qty;
        sold[i.product_name].revenue += +i.line_total;
      })
    );
    const top = Object.entries(sold)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5);

    c.innerHTML = `
      <div class="view">
        <div class="stat-grid">
          <div class="stat"><div class="stat__icon" style="background:var(--pink-50)">${ICON.money}</div><div><small>Revenue</small><strong>${money(revenue)}</strong></div></div>
          <div class="stat"><div class="stat__icon" style="background:var(--pink-50)">${ICON.box}</div><div><small>Total orders</small><strong>${orders.length}</strong></div></div>
          <div class="stat"><div class="stat__icon" style="background:var(--pink-100)">${ICON.clock}</div><div><small>Pending orders</small><strong>${pending}</strong></div></div>
          <div class="stat"><div class="stat__icon" style="background:var(--pink-100)">${ICON.gift}</div><div><small>Live products</small><strong>${active}<span class="muted" style="font-family:var(--font-body);font-size:.85rem"> / ${products.length}</span></strong></div></div>
        </div>

        <div class="dash-grid">
          <div class="panel">
            <div class="panel__head"><h2>Recent orders</h2><a href="#orders" class="btn btn--ghost btn--sm">View all</a></div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Order</th><th>Customer</th><th class="num">Total</th><th>Status</th></tr></thead>
                <tbody>
                  ${
                    orders.length
                      ? orders
                          .slice(0, 6)
                          .map(
                            (o) => `
                        <tr>
                          <td><strong>${esc(o.order_no)}</strong><br><span class="muted">${fmtDate(o.created_at)}</span></td>
                          <td>${esc(o.first_name)} ${esc(o.last_name)}<br><span class="muted">${esc(o.email)}</span></td>
                          <td class="num">${money(o.total)}</td>
                          <td><span class="pill pill--${esc(o.status)}">${esc(o.status)}</span></td>
                        </tr>`
                          )
                          .join("")
                      : `<tr><td colspan="4" class="empty-row">No orders yet. They'll appear here as soon as customers check out.</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div class="panel">
              <div class="panel__head"><h2>Quick actions</h2></div>
              <div class="panel__body" style="display:grid;gap:10px">
                <button class="btn btn--primary btn--block" data-quick="add-product">＋ Add new product</button>
                <a href="#orders" class="btn btn--ghost btn--block">Manage orders</a>
                <a href="#settings" class="btn btn--ghost btn--block">Edit store settings</a>
              </div>
            </div>
            <div class="panel">
              <div class="panel__head"><h2>Needs attention</h2></div>
              <div class="panel__body">
                ${pending ? `<p><strong>${pending}</strong> order${pending > 1 ? "s are" : " is"} waiting to be processed.</p>` : ""}
                ${outOfStock.length ? `<p>Out of stock: ${outOfStock.map((p) => esc(p.name)).join(", ")}</p>` : ""}
                ${hidden.length ? `<p>${hidden.length} product${hidden.length > 1 ? "s are" : " is"} hidden from the store.</p>` : ""}
                ${!pending && !outOfStock.length && !hidden.length ? `<p class="muted" style="margin:0">All good — nothing needs your attention.</p>` : ""}
              </div>
            </div>
            <div class="panel">
              <div class="panel__head"><h2>Top sellers</h2></div>
              <div class="panel__body">
                ${
                  top.length
                    ? top
                        .map(
                          ([name, s], i) =>
                            `<div class="summary__row"><span>${i + 1}. ${esc(name)}</span><span>${s.qty} sold</span></div>`
                        )
                        .join("")
                    : `<p class="muted" style="margin:0">Sales data will appear after the first orders.</p>`
                }
              </div>
            </div>
          </div>
        </div>
      </div>`;

    $("[data-quick=add-product]", c).addEventListener("click", async () => {
      await load("categories");
      openProductModal(null, () => route());
    });
  }

  /* ==========================================================
     View: Products
     ========================================================== */
  const productFilter = { q: "", category: "all", status: "all" };

  async function renderProducts(c, token) {
    const [products, categories] = await Promise.all([load("products"), load("categories")]);
    if (isStale(token)) return;

    c.innerHTML = `
      <div class="view">
        <div class="toolbar">
          <div class="search-box">${ICON.search}<label class="sr-only" for="pSearch">Search products</label>
            <input type="search" id="pSearch" placeholder="Search products…" value="${esc(productFilter.q)}"></div>
          <select class="select" id="pCategory" aria-label="Filter by category">
            <option value="all">All categories</option>
            ${categories.map((cat) => `<option value="${esc(cat.slug)}">${esc(cat.name)}</option>`).join("")}
          </select>
          <select class="select" id="pStatus" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="featured">Featured</option>
            <option value="out">Out of stock</option>
            <option value="sale">On sale</option>
          </select>
          <span class="toolbar__spacer"></span>
          <button class="btn btn--primary" id="addProduct">＋ Add product</button>
        </div>
        <div class="panel">
          <div class="table-wrap">
            <table class="table">
              <thead><tr>
                <th>Product</th><th>Category</th><th class="num">Price</th>
                <th>In stock</th><th>Featured</th><th>Visible</th><th class="actions">Actions</th>
              </tr></thead>
              <tbody id="productRows"></tbody>
            </table>
          </div>
        </div>
        <p class="muted" id="productCount"></p>
      </div>`;

    const view = c.firstElementChild;
    $("#pCategory", view).value = categories.some((x) => x.slug === productFilter.category) ? productFilter.category : "all";
    $("#pStatus", view).value = productFilter.status;
    const catName = (slug) => (categories.find((x) => x.slug === slug) || { name: slug }).name;

    function paint() {
      const q = productFilter.q.trim().toLowerCase();
      const list = state.products.filter((p) => {
        if (productFilter.category !== "all" && p.category !== productFilter.category) return false;
        const s = productFilter.status;
        if (s === "active" && !p.active) return false;
        if (s === "hidden" && p.active) return false;
        if (s === "featured" && !p.featured) return false;
        if (s === "out" && p.inStock) return false;
        if (s === "sale" && !p.oldPrice) return false;
        return !q || `${p.name} ${p.id} ${p.badge}`.toLowerCase().includes(q);
      });
      $("#productRows", view).innerHTML = list.length
        ? list
            .map(
              (p) => `
          <tr data-id="${esc(p.id)}">
            <td><div class="cell-product">
              <img class="thumb" src="${esc(productImage(p))}" alt="" loading="lazy" decoding="async">
              <div><strong>${esc(p.name)}</strong><small>ID: ${esc(p.id)}${p.badge ? ` · ${esc(p.badge)}` : ""}${p.active ? "" : ' · <span class="pill pill--hidden">Hidden</span>'}</small></div>
            </div></td>
            <td>${esc(catName(p.category))}</td>
            <td class="num">
              <input class="price-input" type="number" min="0" step="0.01" value="${p.price}" data-price aria-label="Price of ${esc(p.name)}">
              ${p.oldPrice ? `<div class="muted">was ${money(p.oldPrice)}</div>` : ""}
            </td>
            <td>${switchHTML(`data-toggle="inStock" aria-label="In stock"`, p.inStock)}</td>
            <td>${switchHTML(`data-toggle="featured" aria-label="Featured"`, p.featured)}</td>
            <td>${switchHTML(`data-toggle="active" aria-label="Visible in store"`, p.active)}</td>
            <td class="actions">
              <a class="icon-action" href="product.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener" title="View in store" aria-label="View in store">${ICON.eye}</a>
              <button class="icon-action" data-edit title="Edit" aria-label="Edit ${esc(p.name)}">${ICON.edit}</button>
              <button class="icon-action icon-action--danger" data-delete title="Delete" aria-label="Delete ${esc(p.name)}">${ICON.trash}</button>
            </td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="7" class="empty-row">${state.products.length ? "No products match these filters." : "No products yet — click “Add product” to create your first one."}</td></tr>`;
      $("#productCount", view).textContent = `Showing ${list.length} of ${state.products.length} products`;
    }

    const replaceProduct = (updated) => {
      const i = state.products.findIndex((x) => x.id === updated.id);
      if (i >= 0) state.products[i] = updated;
    };

    $("#pSearch", view).addEventListener("input", (e) => {
      productFilter.q = e.target.value;
      paint();
    });
    $("#pCategory", view).addEventListener("change", (e) => {
      productFilter.category = e.target.value;
      paint();
    });
    $("#pStatus", view).addEventListener("change", (e) => {
      productFilter.status = e.target.value;
      paint();
    });
    $("#addProduct", view).addEventListener("click", () => openProductModal(null, paint));

    const rows = $("#productRows", view);

    rows.addEventListener("change", async (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      const product = state.products.find((x) => x.id === tr.dataset.id);

      if (e.target.matches("[data-price]")) {
        const input = e.target;
        const value = Math.round(parseFloat(input.value) * 100) / 100;
        if (!(value >= 0)) {
          input.value = product.price;
          return toast("Invalid price", "Enter a number of 0 or more.", ICON.alert);
        }
        if (value === product.price) return;
        input.classList.add("is-saving");
        try {
          replaceProduct(await A.updateProductFields(product.id, { price: value }));
          input.value = value;
          toast("Price updated", `${product.name} → ${money(value)}`, ICON.money);
        } catch (err) {
          input.value = product.price;
          toastError(err);
        } finally {
          input.classList.remove("is-saving");
        }
      }

      if (e.target.matches("[data-toggle]")) {
        const input = e.target;
        const field = input.dataset.toggle;
        input.disabled = true;
        try {
          replaceProduct(await A.updateProductFields(product.id, { [field]: input.checked }));
          const labels = {
            inStock: input.checked ? "Marked in stock" : "Marked out of stock",
            featured: input.checked ? "Added to featured" : "Removed from featured",
            active: input.checked ? "Now visible in the store" : "Hidden from the store",
          };
          toast(labels[field], product.name);
          if (field === "active") paint();
        } catch (err) {
          input.checked = !input.checked;
          toastError(err);
        } finally {
          input.disabled = false;
        }
      }
    });

    // Save price on Enter
    rows.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("[data-price]")) e.target.blur();
    });

    rows.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      const product = state.products.find((x) => x.id === tr.dataset.id);
      if (e.target.closest("[data-edit]")) openProductModal(product, paint);
      if (e.target.closest("[data-delete]")) {
        const ok = await confirmDialog({
          title: "Delete product?",
          message: `“${product.name}” will be permanently removed from the store. Past orders keep their details. Tip: switch “Visible” off instead if you only want to hide it.`,
        });
        if (!ok) return;
        try {
          await A.deleteProduct(product.id);
          state.products = state.products.filter((x) => x.id !== product.id);
          paint();
          toast("Product deleted", product.name, ICON.trash2);
        } catch (err) {
          toastError(err);
        }
      }
    });

    paint();
  }

  function openProductModal(product, onSaved) {
    const categories = state.categories || [];
    if (!categories.length) {
      toast("Create a category first", "Every product needs a category.", ICON.alert);
      location.hash = "#categories";
      return;
    }
    const isNew = !product;
    const nextOrder = Math.max(0, ...(state.products || []).map((p) => p.sortOrder || 0)) + 1;
    const p = product
      ? JSON.parse(JSON.stringify(product))
      : {
          name: "",
          category: categories[0].slug,
          price: "",
          oldPrice: null,
          rating: 5,
          reviews: 0,
          emoji: "🎁",
          colors: ["#FDE2E4", "#F7A8B8"],
          badge: "",
          short: "",
          description: "",
          features: [],
          images: [],
          featured: false,
          active: true,
          inStock: true,
          requiresPersonalization: false,
          sortOrder: nextOrder,
        };
    let images = [...p.images];
    const uploaded = [];
    let saved = false;

    const m = openModal({
      title: isNew ? "Add new product" : "Edit product",
      body: `
        <form id="productForm" class="form-grid" novalidate>
          <h3 class="form-section full">Basic details</h3>
          <div class="field full">
            <label for="fName">Product name <span class="req">*</span></label>
            <input id="fName" maxlength="120" value="${esc(p.name)}">
            <span class="error-msg">Please enter a product name.</span>
          </div>
          <div class="field">
            <label for="fCategory">Category <span class="req">*</span></label>
            <select id="fCategory">${categories
              .map((cat) => `<option value="${esc(cat.slug)}" ${cat.slug === p.category ? "selected" : ""}>${esc(cat.name)}</option>`)
              .join("")}</select>
          </div>
          <div class="field">
            <label for="fBadge">Badge</label>
            <input id="fBadge" list="badgeList" maxlength="20" value="${esc(p.badge)}" placeholder="e.g. New, Sale, Bestseller">
            <datalist id="badgeList"><option value="New"><option value="Sale"><option value="Bestseller"><option value="Premium"><option value="Limited"></datalist>
          </div>
          <div class="field">
            <label for="fPrice">Price (${esc(currency)}) <span class="req">*</span></label>
            <input id="fPrice" type="number" min="0" step="0.01" value="${p.price === "" ? "" : (+p.price).toFixed(2)}">
            <span class="error-msg">Enter a price of 0 or more.</span>
          </div>
          <div class="field">
            <label for="fOldPrice">Old price (${esc(currency)})</label>
            <input id="fOldPrice" type="number" min="0" step="0.01" value="${p.oldPrice ? (+p.oldPrice).toFixed(2) : ""}">
            <span class="hint">Optional. Shows the price crossed out, e.g. for sales.</span>
            <span class="error-msg">Old price must be a number of 0 or more.</span>
          </div>
          <div class="field full">
            <label for="fShort">Short description</label>
            <input id="fShort" maxlength="160" value="${esc(p.short)}" placeholder="One sentence shown on product cards">
          </div>
          <div class="field full">
            <label for="fDescription">Full description</label>
            <textarea id="fDescription" rows="4">${esc(p.description)}</textarea>
          </div>
          <div class="field full">
            <label for="fFeatures">Features</label>
            <textarea id="fFeatures" rows="4" placeholder="One feature per line">${esc(p.features.join("\n"))}</textarea>
            <span class="hint">One per line — shown as a bullet list.</span>
          </div>

          <h3 class="form-section full">Images</h3>
          <div class="full">
            <div class="img-manager" id="imgManager"></div>
            <input type="file" id="imgFile" accept="image/*" multiple hidden>
            <div class="img-url-row">
              <label for="imgUrl" class="sr-only">Image URL</label>
              <input id="imgUrl" class="select" style="background:var(--cream);padding-right:16px" placeholder="…or paste an image URL (https://…)">
              <button type="button" class="btn btn--ghost btn--sm" id="imgUrlAdd">Add URL</button>
            </div>
            <span class="hint muted">The first image is the main photo. JPG/PNG/WebP up to 5 MB. With no images, a colourful emoji placeholder is used.</span>
          </div>

          <h3 class="form-section full">Appearance &amp; rating</h3>
          <div class="field">
            <label for="fEmoji">Placeholder emoji</label>
            <input id="fEmoji" maxlength="8" value="${esc(p.emoji)}">
          </div>
          <div class="field">
            <label>Placeholder colours</label>
            <div class="color-pair">
              <input type="color" id="fColor1" value="${esc(p.colors[0])}" aria-label="Colour 1">
              <input type="color" id="fColor2" value="${esc(p.colors[1])}" aria-label="Colour 2">
            </div>
          </div>
          <div class="field">
            <label for="fRating">Rating (0–5)</label>
            <input id="fRating" type="number" min="0" max="5" step="0.1" value="${p.rating}">
            <span class="error-msg">Rating must be between 0 and 5.</span>
          </div>
          <div class="field">
            <label for="fReviews">Number of reviews</label>
            <input id="fReviews" type="number" min="0" step="1" value="${p.reviews}">
          </div>
          <div class="field">
            <label for="fSort">Sort order</label>
            <input id="fSort" type="number" step="1" value="${p.sortOrder}">
            <span class="hint">Lower numbers appear first.</span>
          </div>

          <h3 class="form-section full">Visibility</h3>
          <div class="full switch-row">
            ${switchHTML('id="fActive"', p.active, "Visible in store")}
            ${switchHTML('id="fInStock"', p.inStock, "In stock")}
            ${switchHTML('id="fFeatured"', p.featured, "Featured on homepage")}
            ${switchHTML('id="fPersonal"', p.requiresPersonalization, "Requires personalization text")}
          </div>
        </form>`,
      foot: `<button type="button" class="btn btn--ghost" data-close>Cancel</button>
             <button type="submit" form="productForm" class="btn btn--primary" id="saveProduct">${isNew ? "Create product" : "Save changes"}</button>`,
      onClose: () => {
        if (!saved) A.removeImages(uploaded).catch(() => {});
      },
    });

    const form = $("#productForm", m.el);
    const manager = $("#imgManager", m.el);
    const fileInput = $("#imgFile", m.el);
    let uploading = 0;

    function paintImages() {
      manager.innerHTML =
        images
          .map(
            (src, i) => `
          <div class="img-tile">
            <img src="${esc(src)}" alt="Product image ${i + 1}">
            ${i === 0 ? '<span class="img-tile__main">Main</span>' : ""}
            <div class="img-tile__actions">
              ${i > 0 ? `<button type="button" data-img-main="${i}">★ Main</button>` : "<span></span>"}
              <button type="button" data-img-remove="${i}">Remove</button>
            </div>
          </div>`
          )
          .join("") +
        `<button type="button" class="img-add" id="imgAdd">${uploading ? `<div><span class="spinner" style="margin:0 auto 6px"></span>Uploading ${uploading}…</div>` : "<div><span>＋</span>Upload images</div>"}</button>`;
    }
    paintImages();

    manager.addEventListener("click", (e) => {
      const main = e.target.closest("[data-img-main]");
      const remove = e.target.closest("[data-img-remove]");
      if (main) {
        const [img] = images.splice(+main.dataset.imgMain, 1);
        images.unshift(img);
        paintImages();
      } else if (remove) {
        images.splice(+remove.dataset.imgRemove, 1);
        paintImages();
      } else if (e.target.closest("#imgAdd") && !uploading) {
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files);
      fileInput.value = "";
      for (const file of files) {
        uploading++;
        paintImages();
        try {
          const url = await A.uploadImage(file);
          uploaded.push(url);
          images.push(url);
        } catch (err) {
          toastError(err);
        } finally {
          uploading--;
          paintImages();
        }
      }
    });

    $("#imgUrlAdd", m.el).addEventListener("click", () => {
      const input = $("#imgUrl", m.el);
      const url = input.value.trim();
      if (!/^(https?:\/\/|images\/)\S+$/i.test(url)) return toast("Invalid image URL", "It should start with https://", ICON.alert);
      images.push(url);
      input.value = "";
      paintImages();
    });
    $("#imgUrl", m.el).addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        $("#imgUrlAdd", m.el).click();
      }
    });

    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (uploading) return toast("Please wait", "Images are still uploading.", ICON.clock);
      const val = (id) => $("#" + id, form).value;
      const price = parseFloat(val("fPrice"));
      const oldPriceRaw = val("fOldPrice").trim();
      const oldPrice = oldPriceRaw === "" ? null : parseFloat(oldPriceRaw);
      const rating = parseFloat(val("fRating"));
      const valid = checkFields(form, [
        ["#fName", val("fName").trim().length > 0],
        ["#fPrice", price >= 0],
        ["#fOldPrice", oldPrice === null || oldPrice >= 0],
        ["#fRating", rating >= 0 && rating <= 5],
      ]);
      if (!valid) return;

      const data = {
        ...p,
        name: val("fName").trim(),
        category: val("fCategory"),
        badge: val("fBadge").trim(),
        price: Math.round(price * 100) / 100,
        oldPrice: oldPrice === null ? null : Math.round(oldPrice * 100) / 100,
        short: val("fShort").trim(),
        description: val("fDescription").trim(),
        features: val("fFeatures").split("\n").map((s) => s.trim()).filter(Boolean),
        images,
        emoji: val("fEmoji").trim() || "🎁",
        colors: [val("fColor1"), val("fColor2")],
        rating: Math.round(rating * 10) / 10,
        reviews: Math.max(0, parseInt(val("fReviews"), 10) || 0),
        sortOrder: parseInt(val("fSort"), 10) || 0,
        active: $("#fActive", form).checked,
        inStock: $("#fInStock", form).checked,
        featured: $("#fFeatured", form).checked,
        requiresPersonalization: $("#fPersonal", form).checked,
      };

      await withBusy($("#saveProduct", m.el), "Saving…", async () => {
        try {
          const result = await A.saveProduct(data, isNew);
          if (isNew) state.products.push(result);
          else state.products = state.products.map((x) => (x.id === result.id ? result : x));
          state.products.sort((a, b) => a.sortOrder - b.sortOrder);
          saved = true;
          // uploads that were removed again before saving are no longer needed
          A.removeImages(uploaded.filter((u) => !images.includes(u))).catch(() => {});
          toast(isNew ? "Product created" : "Product saved", result.name, ICON.gift);
          m.close();
          if (onSaved) onSaved(result);
        } catch (err) {
          toastError(err);
        }
      });
    });
  }

  /* ==========================================================
     View: Categories
     ========================================================== */
  async function renderCategories(c, token) {
    const [categories, products] = await Promise.all([load("categories", true), load("products")]);
    if (isStale(token)) return;

    c.innerHTML = `
      <div class="view">
        <div class="toolbar">
          <p class="muted" style="margin:0">Categories group your products and appear in the menu, homepage and shop filters.</p>
          <span class="toolbar__spacer"></span>
          <button class="btn btn--primary" id="addCategory">＋ Add category</button>
        </div>
        <div class="panel"><div class="table-wrap">
          <table class="table">
            <thead><tr><th>Category</th><th>Slug (URL)</th><th class="num">Products</th><th class="num">Order</th><th class="actions">Actions</th></tr></thead>
            <tbody id="categoryRows"></tbody>
          </table>
        </div></div>
      </div>`;
    const view = c.firstElementChild;

    function paint() {
      const count = (slug) => state.products.filter((p) => p.category === slug).length;
      $("#categoryRows", view).innerHTML = state.categories.length
        ? state.categories
            .map(
              (cat) => `
          <tr data-slug="${esc(cat.slug)}">
            <td><div class="cell-product">
              <img class="thumb" src="${esc(categoryImage(cat))}" alt="">
              <div><strong>${esc(cat.emoji)} ${esc(cat.name)}</strong><small>${esc(cat.tagline)}</small></div>
            </div></td>
            <td><code>${esc(cat.slug)}</code></td>
            <td class="num">${count(cat.slug)}</td>
            <td class="num">${cat.sortOrder}</td>
            <td class="actions">
              <button class="icon-action" data-edit aria-label="Edit ${esc(cat.name)}">${ICON.edit}</button>
              <button class="icon-action icon-action--danger" data-delete aria-label="Delete ${esc(cat.name)}">${ICON.trash}</button>
            </td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="5" class="empty-row">No categories yet. Add one to start adding products.</td></tr>`;
    }

    $("#addCategory", view).addEventListener("click", () => openCategoryModal(null, paint));
    $("#categoryRows", view).addEventListener("click", async (e) => {
      const tr = e.target.closest("tr[data-slug]");
      if (!tr) return;
      const cat = state.categories.find((x) => x.slug === tr.dataset.slug);
      if (e.target.closest("[data-edit]")) openCategoryModal(cat, paint);
      if (e.target.closest("[data-delete]")) {
        const n = state.products.filter((p) => p.category === cat.slug).length;
        if (n) return toast("Can't delete yet", `${cat.name} still has ${n} product${n > 1 ? "s" : ""}. Move or delete them first.`, ICON.alert);
        const ok = await confirmDialog({ title: "Delete category?", message: `“${cat.name}” will be removed from the store.` });
        if (!ok) return;
        try {
          await A.deleteCategory(cat.slug);
          state.categories = state.categories.filter((x) => x.slug !== cat.slug);
          paint();
          toast("Category deleted", cat.name, ICON.trash2);
        } catch (err) {
          toastError(err);
        }
      }
    });
    paint();
  }

  function openCategoryModal(cat, onSaved) {
    const isNew = !cat;
    const c = cat
      ? { ...cat, colors: [...cat.colors] }
      : {
          slug: "",
          name: "",
          emoji: "🎁",
          tagline: "",
          colors: ["#FDE2E4", "#F9B8C0"],
          image: "",
          sortOrder: Math.max(0, ...state.categories.map((x) => x.sortOrder || 0)) + 1,
        };
    let slugTouched = !isNew;

    const m = openModal({
      title: isNew ? "Add category" : "Edit category",
      body: `
        <form id="categoryForm" class="form-grid" novalidate>
          <div class="field">
            <label for="cName">Name <span class="req">*</span></label>
            <input id="cName" maxlength="60" value="${esc(c.name)}" placeholder="e.g. Wedding Gifts">
            <span class="error-msg">Please enter a name.</span>
          </div>
          <div class="field">
            <label for="cSlug">Slug <span class="req">*</span></label>
            <input id="cSlug" maxlength="40" value="${esc(c.slug)}" placeholder="wedding">
            <span class="hint">Used in links: shop.html?category=<b id="slugPreview">${esc(c.slug || "…")}</b></span>
            <span class="error-msg">Lowercase letters, numbers and dashes only.</span>
          </div>
          <div class="field full">
            <label for="cTagline">Tagline</label>
            <input id="cTagline" maxlength="120" value="${esc(c.tagline)}" placeholder="A short line shown under the name">
          </div>
          <div class="field">
            <label for="cEmoji">Emoji</label>
            <input id="cEmoji" maxlength="8" value="${esc(c.emoji)}">
          </div>
          <div class="field">
            <label>Colours</label>
            <div class="color-pair">
              <input type="color" id="cColor1" value="${esc(c.colors[0])}" aria-label="Colour 1">
              <input type="color" id="cColor2" value="${esc(c.colors[1])}" aria-label="Colour 2">
            </div>
          </div>
          <div class="field full">
            <label for="cImage">Image</label>
            <div class="img-url-row" style="margin:0">
              <input id="cImage" value="${esc(c.image)}" placeholder="Image URL (optional)">
              <button type="button" class="btn btn--ghost btn--sm" id="cUpload">Upload…</button>
              <input type="file" id="cFile" accept="image/*" hidden>
            </div>
            <span class="hint">Leave empty to use a colourful emoji placeholder.</span>
          </div>
          <div class="field">
            <label for="cSort">Sort order</label>
            <input id="cSort" type="number" step="1" value="${c.sortOrder}">
          </div>
          ${!isNew ? `<div class="full notice notice--info" style="margin:0">Changing the slug updates all products in this category automatically.</div>` : ""}
        </form>`,
      foot: `<button type="button" class="btn btn--ghost" data-close>Cancel</button>
             <button type="submit" form="categoryForm" class="btn btn--primary" id="saveCategory">${isNew ? "Create category" : "Save changes"}</button>`,
    });

    const form = $("#categoryForm", m.el);
    const nameInput = $("#cName", form);
    const slugInput = $("#cSlug", form);
    const preview = $("#slugPreview", form);
    nameInput.addEventListener("input", () => {
      if (!slugTouched) {
        slugInput.value = slugify(nameInput.value);
        preview.textContent = slugInput.value || "…";
      }
    });
    slugInput.addEventListener("input", () => {
      slugTouched = true;
      preview.textContent = slugInput.value || "…";
    });
    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });
    $("#cUpload", form).addEventListener("click", () => $("#cFile", form).click());
    $("#cFile", form).addEventListener("change", async (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      await withBusy($("#cUpload", form), "Uploading…", async () => {
        try {
          $("#cImage", form).value = await A.uploadImage(file);
        } catch (err) {
          toastError(err);
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const slug = slugInput.value.trim().toLowerCase();
      const valid = checkFields(form, [
        ["#cName", nameInput.value.trim().length > 0],
        ["#cSlug", /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)],
      ]);
      if (!valid) return;
      const data = {
        slug,
        name: nameInput.value.trim(),
        tagline: $("#cTagline", form).value.trim(),
        emoji: $("#cEmoji", form).value.trim() || "🎁",
        colors: [$("#cColor1", form).value, $("#cColor2", form).value],
        image: $("#cImage", form).value.trim(),
        sortOrder: parseInt($("#cSort", form).value, 10) || 0,
      };
      await withBusy($("#saveCategory", m.el), "Saving…", async () => {
        try {
          const result = await A.saveCategory(data, isNew ? null : cat.slug);
          if (isNew) state.categories.push(result);
          else {
            state.categories = state.categories.map((x) => (x.slug === cat.slug ? result : x));
            if (cat.slug !== result.slug)
              state.products.forEach((p) => p.category === cat.slug && (p.category = result.slug));
          }
          state.categories.sort((a, b) => a.sortOrder - b.sortOrder);
          toast(isNew ? "Category created" : "Category saved", result.name, ICON.box);
          m.close();
          onSaved();
        } catch (err) {
          toastError(err);
        }
      });
    });
  }

  /* ==========================================================
     View: Orders
     ========================================================== */
  const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
  const orderFilter = { status: "all", q: "" };
  const itemCount = (o) => (o.order_items || []).reduce((n, i) => n + i.qty, 0);
  const statusSelect = (o) =>
    `<select class="select status-select" data-status aria-label="Order status">${STATUSES.map(
      (s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`
    ).join("")}</select>`;

  async function renderOrders(c, token) {
    await load("orders", true);
    if (isStale(token)) return;

    c.innerHTML = `
      <div class="view">
        <div class="toolbar">
          <div class="filter-tabs" id="orderTabs"></div>
          <span class="toolbar__spacer"></span>
          <div class="search-box">${ICON.search}<label class="sr-only" for="oSearch">Search orders</label>
            <input type="search" id="oSearch" placeholder="Order no, name or email…" value="${esc(orderFilter.q)}"></div>
          <button class="btn btn--ghost btn--sm" id="refreshOrders">↻ Refresh</button>
          <button class="btn btn--ghost btn--sm" id="exportOrders">⬇ Export CSV</button>
        </div>
        <div class="panel"><div class="table-wrap">
          <table class="table">
            <thead><tr><th>Order</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Delivery / Payment</th><th>Status</th><th class="actions">Actions</th></tr></thead>
            <tbody id="orderRows"></tbody>
          </table>
        </div></div>
      </div>`;
    const view = c.firstElementChild;

    const filtered = () => {
      const q = orderFilter.q.trim().toLowerCase();
      return state.orders.filter(
        (o) =>
          (orderFilter.status === "all" || o.status === orderFilter.status) &&
          (!q || `${o.order_no} ${o.first_name} ${o.last_name} ${o.email} ${o.phone}`.toLowerCase().includes(q))
      );
    };

    function paint() {
      const counts = { all: state.orders.length };
      STATUSES.forEach((s) => (counts[s] = state.orders.filter((o) => o.status === s).length));
      $("#orderTabs", view).innerHTML = ["all", ...STATUSES]
        .map(
          (s) =>
            `<button type="button" data-filter="${s}" class="${orderFilter.status === s ? "is-active" : ""}">${s}<b>${counts[s]}</b></button>`
        )
        .join("");

      const list = filtered();
      $("#orderRows", view).innerHTML = list.length
        ? list
            .map(
              (o) => `
          <tr data-id="${esc(o.id)}">
            <td><strong>${esc(o.order_no)}</strong><br><span class="muted">${fmtDate(o.created_at)}</span></td>
            <td>${esc(o.first_name)} ${esc(o.last_name)}<br><span class="muted">${esc(o.email)}</span></td>
            <td class="num">${itemCount(o)}</td>
            <td class="num"><strong>${money(o.total)}</strong></td>
            <td><span class="muted">${esc(o.shipping_method)} · ${esc(o.payment_method)}</span>${o.is_gift ? '<br><span class="pill pill--shipped">Gift</span>' : ""}</td>
            <td>${statusSelect(o)}</td>
            <td class="actions">
              <button class="icon-action" data-open aria-label="View order ${esc(o.order_no)}">${ICON.eye}</button>
              <button class="icon-action icon-action--danger" data-delete aria-label="Delete order ${esc(o.order_no)}">${ICON.trash}</button>
            </td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="7" class="empty-row">${state.orders.length ? "No orders match this filter." : "No orders yet."}</td></tr>`;
    }

    $("#orderTabs", view).addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      orderFilter.status = b.dataset.filter;
      paint();
    });
    $("#oSearch", view).addEventListener("input", (e) => {
      orderFilter.q = e.target.value;
      paint();
    });
    $("#refreshOrders", view).addEventListener("click", (e) =>
      withBusy(e.currentTarget, "Refreshing…", async () => {
        try {
          await load("orders", true);
          paint();
        } catch (err) {
          toastError(err);
        }
      })
    );
    $("#exportOrders", view).addEventListener("click", () => exportOrdersCSV(filtered()));

    const rows = $("#orderRows", view);
    rows.addEventListener("change", async (e) => {
      if (!e.target.matches("[data-status]")) return;
      const order = state.orders.find((o) => o.id === e.target.closest("tr").dataset.id);
      await changeOrderStatus(order, e.target, paint);
    });
    rows.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      const order = state.orders.find((o) => o.id === tr.dataset.id);
      if (e.target.closest("[data-open]")) openOrderModal(order, paint);
      if (e.target.closest("[data-delete]")) deleteOrder(order, paint);
    });

    paint();
  }

  async function changeOrderStatus(order, select, after) {
    const previous = order.status;
    select.disabled = true;
    try {
      const updated = await A.updateOrderStatus(order.id, select.value);
      order.status = updated.status;
      updatePendingBadge();
      toast("Status updated", `${order.order_no} → ${order.status}`, ICON.box);
      after();
    } catch (err) {
      select.value = previous;
      toastError(err);
    } finally {
      select.disabled = false;
    }
  }

  async function deleteOrder(order, after) {
    const ok = await confirmDialog({
      title: "Delete order?",
      message: `Order ${order.order_no} and its items will be permanently deleted. Consider setting it to “Cancelled” instead to keep a record.`,
    });
    if (!ok) return false;
    try {
      await A.deleteOrder(order.id);
      state.orders = state.orders.filter((o) => o.id !== order.id);
      updatePendingBadge();
      toast("Order deleted", order.order_no, ICON.trash2);
      after();
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  }

  function openOrderModal(o, after) {
    const items = o.order_items || [];
    const m = openModal({
      title: `Order ${o.order_no}`,
      body: `
        <p class="muted" style="margin-top:-6px">Placed ${fmtDate(o.created_at)} · <span class="pill pill--${esc(o.status)}">${esc(o.status)}</span></p>
        <div class="order-meta">
          <div><h4>Customer</h4>${esc(o.first_name)} ${esc(o.last_name)}<br>
            <a href="mailto:${esc(o.email)}" style="color:var(--red)">${esc(o.email)}</a><br>
            <a href="tel:${esc(String(o.phone).replace(/[^\d+]/g, ""))}">${esc(o.phone)}</a></div>
          <div><h4>Ship to</h4>${o.is_gift && o.recipient ? `<strong>${esc(o.recipient)}</strong><br>` : ""}${esc(o.address)}<br>${esc(o.city)} ${esc(o.zip)}<br>${esc(o.country)}</div>
          <div><h4>Delivery &amp; payment</h4>Delivery: ${esc(o.shipping_method)}<br>Payment: ${esc(o.payment_method)}${o.promo_code ? `<br>Promo: <strong>${esc(o.promo_code)}</strong>` : ""}</div>
          ${
            o.is_gift
              ? `<div><h4>Gift</h4>${o.delivery_date ? `Deliver on: ${esc(o.delivery_date)}<br>` : ""}${o.gift_note ? `“${esc(o.gift_note)}”` : "No card message"}</div>`
              : ""
          }
        </div>
        <h3 class="form-section">Items</h3>
        <div class="order-lines">
          ${items
            .map(
              (i) => `
            <div class="mini-item">
              <div class="mini-item__img"><img src="${esc(i.product_image || API.placeholderImage("🎁"))}" alt="" width="58" height="58"><b>${i.qty}</b></div>
              <div class="mini-item__name">${esc(i.product_name)}
                <small>${i.qty} × ${money(i.unit_price)}${i.gift_wrap ? " · Gift wrap" : ""}${i.message ? ` · “${esc(i.message)}”` : ""}</small></div>
              <div class="mini-item__price">${money(i.line_total)}</div>
            </div>`
            )
            .join("")}
        </div>
        <div class="order-totals">
          <div class="summary__row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
          ${+o.discount ? `<div class="summary__row discount"><span>Discount</span><span>−${money(o.discount)}</span></div>` : ""}
          <div class="summary__row"><span>Shipping</span><span>${+o.shipping ? money(o.shipping) : "Free"}</span></div>
          <div class="summary__row"><span>Tax</span><span>${money(o.tax)}</span></div>
          <div class="summary__total"><span>Total</span><span>${money(o.total)}</span></div>
        </div>`,
      foot: `
        <button type="button" class="btn btn--ghost" style="margin-right:auto;color:var(--danger)" data-delete-order>Delete</button>
        <label class="sr-only" for="modalStatus">Status</label>
        ${statusSelect(o).replace("data-status", 'data-status id="modalStatus"')}
        <button type="button" class="btn btn--primary" data-close>Done</button>`,
    });
    $("#modalStatus", m.el).addEventListener("change", (e) => changeOrderStatus(o, e.target, after));
    $("[data-delete-order]", m.el).addEventListener("click", async () => {
      if (await deleteOrder(o, after)) m.close();
    });
  }

  function exportOrdersCSV(orders) {
    if (!orders.length) return toast("Nothing to export", "No orders match the current filter.", ICON.info);
    const cols = [
      ["Order no", (o) => o.order_no],
      ["Date", (o) => o.created_at],
      ["Status", (o) => o.status],
      ["First name", (o) => o.first_name],
      ["Last name", (o) => o.last_name],
      ["Email", (o) => o.email],
      ["Phone", (o) => o.phone],
      ["Address", (o) => o.address],
      ["City", (o) => o.city],
      ["ZIP", (o) => o.zip],
      ["Country", (o) => o.country],
      ["Gift recipient", (o) => (o.is_gift ? o.recipient : "")],
      ["Delivery", (o) => o.shipping_method],
      ["Payment", (o) => o.payment_method],
      ["Promo", (o) => o.promo_code || ""],
      ["Items", (o) => (o.order_items || []).map((i) => `${i.qty}x ${i.product_name}`).join("; ")],
      ["Subtotal", (o) => o.subtotal],
      ["Discount", (o) => o.discount],
      ["Shipping", (o) => o.shipping],
      ["Tax", (o) => o.tax],
      ["Total", (o) => o.total],
    ];
    const cell = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s; // keep spreadsheet formulas from running
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [cols.map((c) => cell(c[0])).join(","), ...orders.map((o) => cols.map((c) => cell(c[1](o))).join(","))].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `giftr-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ==========================================================
     View: Promo codes
     ========================================================== */
  const promoText = (p) => (p.type === "percent" ? `${p.value}% off` : `${money(p.value)} off`);

  async function renderPromos(c, token) {
    await load("promos", true);
    if (isStale(token)) return;

    c.innerHTML = `
      <div class="view">
        <div class="toolbar">
          <p class="muted" style="margin:0">Customers enter these codes in the cart. Discounts are re-checked on the server when an order is placed.</p>
          <span class="toolbar__spacer"></span>
          <button class="btn btn--primary" id="addPromo">＋ Add promo code</button>
        </div>
        <div class="panel"><div class="table-wrap">
          <table class="table">
            <thead><tr><th>Code</th><th>Discount</th><th class="num">Min. subtotal</th><th>Active</th><th>Created</th><th class="actions">Actions</th></tr></thead>
            <tbody id="promoRows"></tbody>
          </table>
        </div></div>
      </div>`;
    const view = c.firstElementChild;

    function paint() {
      $("#promoRows", view).innerHTML = state.promos.length
        ? state.promos
            .map(
              (p) => `
          <tr data-code="${esc(p.code)}">
            <td><strong><code>${esc(p.code)}</code></strong></td>
            <td>${promoText(p)}</td>
            <td class="num">${p.minSubtotal ? money(p.minSubtotal) : "—"}</td>
            <td>${switchHTML('data-active aria-label="Active"', p.active)}</td>
            <td class="muted">${fmtDate(p.createdAt)}</td>
            <td class="actions">
              <button class="icon-action" data-edit aria-label="Edit ${esc(p.code)}">${ICON.edit}</button>
              <button class="icon-action icon-action--danger" data-delete aria-label="Delete ${esc(p.code)}">${ICON.trash}</button>
            </td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="6" class="empty-row">No promo codes yet.</td></tr>`;
    }

    $("#addPromo", view).addEventListener("click", () => openPromoModal(null, paint));
    const rows = $("#promoRows", view);
    rows.addEventListener("change", async (e) => {
      if (!e.target.matches("[data-active]")) return;
      const promo = state.promos.find((p) => p.code === e.target.closest("tr").dataset.code);
      e.target.disabled = true;
      try {
        const updated = await A.savePromo({ ...promo, active: e.target.checked }, promo.code);
        Object.assign(promo, updated);
        toast(promo.active ? "Code activated" : "Code deactivated", promo.code, ICON.tag);
      } catch (err) {
        e.target.checked = !e.target.checked;
        toastError(err);
      } finally {
        e.target.disabled = false;
      }
    });
    rows.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr[data-code]");
      if (!tr) return;
      const promo = state.promos.find((p) => p.code === tr.dataset.code);
      if (e.target.closest("[data-edit]")) openPromoModal(promo, paint);
      if (e.target.closest("[data-delete]")) {
        const ok = await confirmDialog({ title: "Delete promo code?", message: `Customers will no longer be able to use ${promo.code}.` });
        if (!ok) return;
        try {
          await A.deletePromo(promo.code);
          state.promos = state.promos.filter((p) => p.code !== promo.code);
          paint();
          toast("Promo code deleted", promo.code, ICON.trash2);
        } catch (err) {
          toastError(err);
        }
      }
    });
    paint();
  }

  function openPromoModal(promo, onSaved) {
    const isNew = !promo;
    const p = promo || { code: "", type: "percent", value: 10, minSubtotal: 0, active: true };
    const m = openModal({
      title: isNew ? "Add promo code" : `Edit ${p.code}`,
      size: "sm",
      body: `
        <form id="promoForm" class="form-grid" novalidate>
          <div class="field full">
            <label for="prCode">Code <span class="req">*</span></label>
            <input id="prCode" maxlength="30" value="${esc(p.code)}" placeholder="SUMMER15" style="text-transform:uppercase">
            <span class="error-msg">2–30 characters: letters, numbers, - or _.</span>
          </div>
          <div class="field">
            <label for="prType">Type</label>
            <select id="prType">
              <option value="percent" ${p.type === "percent" ? "selected" : ""}>Percentage (%)</option>
              <option value="fixed" ${p.type === "fixed" ? "selected" : ""}>Fixed amount (${esc(currency)})</option>
            </select>
          </div>
          <div class="field">
            <label for="prValue">Value <span class="req">*</span></label>
            <input id="prValue" type="number" min="0.01" step="0.01" value="${p.value}">
            <span class="error-msg">Must be more than 0 (max 100 for %).</span>
          </div>
          <div class="field full">
            <label for="prMin">Minimum subtotal (${esc(currency)})</label>
            <input id="prMin" type="number" min="0" step="0.01" value="${p.minSubtotal}">
            <span class="hint">0 = no minimum.</span>
          </div>
          <div class="full">${switchHTML('id="prActive"', p.active, "Active")}</div>
        </form>`,
      foot: `<button type="button" class="btn btn--ghost" data-close>Cancel</button>
             <button type="submit" form="promoForm" class="btn btn--primary" id="savePromo">${isNew ? "Create code" : "Save"}</button>`,
    });
    const form = $("#promoForm", m.el);
    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = $("#prCode", form).value.trim().toUpperCase();
      const type = $("#prType", form).value;
      const value = parseFloat($("#prValue", form).value);
      const valid = checkFields(form, [
        ["#prCode", /^[A-Z0-9_-]{2,30}$/.test(code)],
        ["#prValue", value > 0 && (type !== "percent" || value <= 100)],
      ]);
      if (!valid) return;
      const data = {
        code,
        type,
        value,
        minSubtotal: Math.max(0, parseFloat($("#prMin", form).value) || 0),
        active: $("#prActive", form).checked,
      };
      await withBusy($("#savePromo", m.el), "Saving…", async () => {
        try {
          const result = await A.savePromo(data, isNew ? null : p.code);
          if (isNew) state.promos.unshift(result);
          else state.promos = state.promos.map((x) => (x.code === p.code ? result : x));
          toast(isNew ? "Promo code created" : "Promo code saved", result.code, ICON.tag);
          m.close();
          onSaved();
        } catch (err) {
          toastError(err);
        }
      });
    });
  }

  /* ==========================================================
     View: Store settings
     ========================================================== */
  async function renderSettings(c, token) {
    const s = await load("settings", true);
    if (isStale(token)) return;

    const field = (id, label, value, attrs = "", hint = "") => `
      <div class="field">
        <label for="${id}">${label}</label>
        <input id="${id}" value="${esc(value)}" ${attrs}>
        ${hint ? `<span class="hint">${hint}</span>` : ""}
        <span class="error-msg">Please enter a valid value.</span>
      </div>`;
    const moneyAttrs = 'type="number" min="0" step="0.01"';

    c.innerHTML = `
      <div class="view">
        <form id="settingsForm" class="settings-grid" novalidate>
          <div class="panel">
            <div class="panel__head"><h2>📣 Announcement &amp; homepage</h2></div>
            <div class="panel__body form-grid">
              <div class="field full">
                <label for="sAnnouncement">Announcement bar</label>
                <input id="sAnnouncement" maxlength="200" value="${esc(s.announcement)}">
                <span class="hint">Shown at the top of every page. Leave empty to hide it. Wrap words in *stars* to highlight them.</span>
              </div>
              <div class="field full">
                <label for="sHeroTitle">Homepage headline</label>
                <input id="sHeroTitle" maxlength="120" value="${esc(s.heroTitle)}">
                <span class="hint">Wrap a word in *stars* to show it in red italics, e.g. Gifts that say *everything* you feel.</span>
              </div>
              <div class="field full">
                <label for="sHeroSubtitle">Homepage intro text</label>
                <textarea id="sHeroSubtitle" rows="3" maxlength="400">${esc(s.heroSubtitle)}</textarea>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head"><h2>💲 Pricing, shipping &amp; tax</h2></div>
            <div class="panel__body form-grid">
              ${field("sCurrency", "Currency symbol", s.currency, 'maxlength="4"', "e.g. $, €, £, ৳, Rs")}
              ${field("sTax", "Tax rate (%)", s.taxRate, 'type="number" min="0" max="100" step="0.01"')}
              ${field("sFreeShip", "Free standard shipping from", s.freeShippingMin, moneyAttrs, "Order subtotal (after discount) needed for free shipping.")}
              ${field("sGiftWrap", "Gift wrap price (per item)", s.giftWrapPrice, moneyAttrs)}
              ${field("sStandard", "Standard delivery price", s.shippingStandard, moneyAttrs)}
              ${field("sExpress", "Express delivery price", s.shippingExpress, moneyAttrs)}
            </div>
          </div>

          <div class="panel">
            <div class="panel__head"><h2>📍 Contact details</h2></div>
            <div class="panel__body form-grid">
              <div class="field full">
                <label for="sAddress">Shop address</label>
                <input id="sAddress" maxlength="200" value="${esc(s.contactAddress)}">
              </div>
              ${field("sPhone", "Phone", s.contactPhone, 'type="tel" maxlength="40"')}
              ${field("sEmail", "Email", s.contactEmail, 'type="email" maxlength="120"')}
            </div>
          </div>

          <div class="sticky-save">
            <button type="button" class="btn btn--ghost" id="resetSettings">Undo changes</button>
            <button type="submit" class="btn btn--primary" id="saveSettings">Save settings</button>
          </div>
        </form>
      </div>`;

    const form = $("#settingsForm", c);
    const val = (id) => $("#" + id, form).value.trim();
    form.addEventListener("input", (e) => {
      const f = e.target.closest(".field");
      if (f) f.classList.remove("has-error");
    });
    $("#resetSettings", form).addEventListener("click", () => route());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nums = ["sTax", "sFreeShip", "sGiftWrap", "sStandard", "sExpress"];
      const valid = checkFields(form, [
        ["#sCurrency", val("sCurrency").length > 0],
        ...nums.map((id) => [`#${id}`, val(id) !== "" && +val(id) >= 0 && (id !== "sTax" || +val(id) <= 100)]),
        ["#sEmail", !val("sEmail") || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("sEmail"))],
      ]);
      if (!valid) return;
      const data = {
        announcement: val("sAnnouncement"),
        heroTitle: val("sHeroTitle"),
        heroSubtitle: val("sHeroSubtitle"),
        currency: val("sCurrency"),
        taxRate: +val("sTax"),
        freeShippingMin: +val("sFreeShip"),
        giftWrapPrice: +val("sGiftWrap"),
        shippingStandard: +val("sStandard"),
        shippingExpress: +val("sExpress"),
        contactAddress: val("sAddress"),
        contactPhone: val("sPhone"),
        contactEmail: val("sEmail"),
      };
      await withBusy($("#saveSettings", form), "Saving…", async () => {
        try {
          state.settings = await A.saveSettings(data);
          currency = state.settings.currency;
          toast("Settings saved", "Changes are live on the store.", ICON.info);
        } catch (err) {
          toastError(err);
        }
      });
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "login") initLogin();
    if (page === "admin") initAdmin();
  });
})();
