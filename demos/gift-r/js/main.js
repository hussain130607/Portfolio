/* ==========================================================
   Gift R — Storefront script
   Shared layout, cart store, and per-page behaviour.
   Each page sets <body data-page="..."> to pick its init.
   Data comes from window.GiftAPI (js/api.js).
   ========================================================== */

(function () {
  "use strict";

  /* ---------------- Store state (filled by GiftAPI.loadStore) ---------------- */
  const STORE = { loaded: false, categories: [], products: [] };
  const S = { ...GiftAPI.DEFAULT_SETTINGS };

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  // ৳1,650 / ৳49.99 — thousands separated, decimals only when needed
  const money = (n) => {
    const v = Math.round((+n || 0) * 100) / 100;
    return (
      S.currency +
      v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })
    );
  };
  const getProduct = (id) => STORE.products.find((p) => p.id === id);
  const getCategory = (slug) => STORE.categories.find((c) => c.slug === slug);
  const escapeHTML = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const enc = encodeURIComponent;

  // n-th image of a product (1-based); falls back to a generated placeholder
  function img(p, n = 1) {
    const list = (p.images || []).filter(Boolean);
    if (!list.length) return GiftAPI.placeholderImage(p.emoji, p.colors);
    return list[Math.min(n, list.length) - 1];
  }
  const catImage = (c) => c.image || GiftAPI.placeholderImage(c.emoji, c.colors);
  // Round icon for the homepage strip (falls back to the category image)
  const catIcon = (c) =>
    c.image && c.image.includes("category-") ? c.image.replace("category-", "icon-") : catImage(c);
  // Round photo chip used in menus and filters (falls back to the category emoji)
  const catBadge = (c) =>
    c.slug === "all"
      ? `<span class="cat-thumb cat-thumb--all">${ICON.grid}</span>`
      : `<img class="cat-thumb" src="${escapeHTML(catIcon(c))}" alt="" loading="lazy" decoding="async" width="52" height="52">`;

  function stars(rating) {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  // "Gifts that say *everything*" → emphasised word
  const emphasis = (text) => escapeHTML(text).replace(/\*(.+?)\*/g, "<em>$1</em>");

  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* storage unavailable — cart lives for this page only */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },
  };

  /* ---------------- Icons ---------------- */
  const ICON = {
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
    ribbon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 13c-3 0-6-2.2-6-5.5C6 5 7.6 3 9.8 3c1.6 0 2.4 1.2 2.2 3 .3-1.8 1.1-3 2.7-3C16.9 3 18 5 18 7.5 18 10.8 15 13 12 13Zm0-2c2 0 4-1.4 4-3.5C16 6 15.4 5 14.4 5c-1.1 0-1.6 1.2-1.4 3.4L12 11l-1-2.6C10.8 6.2 10.3 5 9.2 5 8.2 5 7.6 6 7.6 7.5 7.6 9.6 10 11 12 11Zm-1 3h2l3 7-4-2.2L8 21Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L20 7H5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 15 6-6 6 6"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h11v11H2z"/><path d="M13 9h4l4 4v4h-8"/><circle cx="7" cy="18.5" r="1.8"/><circle cx="17.5" cy="18.5" r="1.8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2.2-2.6v-3a5.6 5.6 0 1 0 5.2 5.6V9.4a6.6 6.6 0 0 0 4 1.3v-3a3.7 3.7 0 0 1-4-3.7Z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7C19 15.6 12 20 12 20Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.4 3.3 8.3 8 9 4.7-.7 8-4.6 8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
    ribbonWrap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8c-2.5 0-4-1-4-2.5S9 3 10 3.5 12 6 12 8Zm0 0c2.5 0 4-1 4-2.5S15 3 14 3.5 12 6 12 8Z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    cartEmpty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L20 7H5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.6 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"/></svg>',
  };

  /* ==========================================================
     Cart store
     ========================================================== */
  const Cart = {
    KEY: "giftr_cart",
    PROMO_KEY: "giftr_promo_v2",

    items() {
      const raw = storage.get(this.KEY, []);
      // Drop lines whose product no longer exists (only once the catalogue is known)
      return STORE.loaded ? raw.filter((i) => getProduct(i.id)) : raw;
    },
    save(items) {
      storage.set(this.KEY, items);
      updateCartCount(true);
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    lineKey(id, opts) {
      return [id, opts.giftWrap ? "wrap" : "", (opts.message || "").trim()].join("|");
    },
    add(id, qty = 1, opts = {}) {
      const items = this.items();
      const key = this.lineKey(id, opts);
      const existing = items.find((i) => i.key === key);
      if (existing) existing.qty = Math.min(99, existing.qty + qty);
      else
        items.push({
          key,
          id,
          qty: Math.min(99, qty),
          giftWrap: !!opts.giftWrap,
          message: (opts.message || "").trim(),
        });
      this.save(items);
    },
    setQty(key, qty) {
      let items = this.items();
      const item = items.find((i) => i.key === key);
      if (!item) return;
      if (qty <= 0) items = items.filter((i) => i.key !== key);
      else item.qty = Math.min(99, qty);
      this.save(items);
    },
    remove(key) {
      this.save(this.items().filter((i) => i.key !== key));
    },
    clear() {
      storage.remove(this.KEY);
      storage.remove(this.PROMO_KEY);
      updateCartCount();
    },
    count() {
      return this.items().reduce((n, i) => n + i.qty, 0);
    },
    linePrice(item) {
      return getProduct(item.id).price + (item.giftWrap ? S.giftWrapPrice : 0);
    },
    // {code, type, value, min} as confirmed by GiftAPI.validatePromo
    promo() {
      return storage.get(this.PROMO_KEY, null);
    },
    setPromo(promo) {
      if (promo) storage.set(this.PROMO_KEY, promo);
      else storage.remove(this.PROMO_KEY);
    },
    // Estimate for display — the server recalculates the real total on checkout
    totals(shippingMethod = "standard") {
      const items = this.items();
      const subtotal = items.reduce((s, i) => s + this.linePrice(i) * i.qty, 0);
      const promo = this.promo();
      let discount = 0;
      if (promo && subtotal >= (promo.min || 0)) {
        discount =
          promo.type === "percent" ? Math.round(subtotal * promo.value) / 100 : Math.min(promo.value, subtotal);
      }
      const afterDiscount = subtotal - discount;
      let shipping = 0;
      if (items.length) {
        if (shippingMethod === "express") shipping = S.shippingExpress;
        else if (shippingMethod === "pickup") shipping = 0;
        else shipping = afterDiscount >= S.freeShippingMin ? 0 : S.shippingStandard;
      }
      const tax = Math.round(afterDiscount * S.taxRate) / 100;
      return {
        subtotal,
        discount,
        promoCode: promo && discount > 0 ? promo.code : null,
        shipping,
        tax,
        total: afterDiscount + shipping + tax,
      };
    },
  };

  function promoLabel(p) {
    return p.type === "percent" ? `${p.value}% off` : `${money(p.value)} off`;
  }

  function updateCartCount(bump) {
    const n = Cart.count();
    $$(".cart-count").forEach((el) => {
      el.textContent = n > 99 ? "99+" : n;
      el.classList.toggle("is-empty", n === 0);
      if (bump) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }
    });
  }

  /* ==========================================================
     Shared layout: header & footer
     ========================================================== */
  function renderHeader() {
    const mount = $("#site-header");
    if (!mount) return;
    const page = document.body.dataset.page;
    const currentCat = new URLSearchParams(location.search).get("category");
    const isActive = (key) => {
      if (page === "shop") return currentCat ? key === "categories" : key === "shop";
      if (page === "product") return key === "shop";
      return key === page;
    };

    mount.outerHTML = `
      <div class="topbar">
        <div class="container topbar__inner">
          <span class="topbar__msg">${ICON.gift} ${escapeHTML(S.announcement || "Surprise Your Loved Ones with the Perfect Gift")}</span>
          <span class="topbar__msg">${ICON.truck} Free Delivery on Orders Above ${money(S.freeShippingMin)}</span>
          <span class="topbar__socials">
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">${ICON.tiktok}</a>
          </span>
        </div>
      </div>
      <header class="site-header" id="top">
        <nav class="container nav" aria-label="Main navigation">
          <a href="index.html" class="logo" aria-label="Gift R — home">
            <span class="logo__name">Gift R<span class="logo__ribbon">${ICON.ribbon}</span></span>
            <span class="logo__tag">Making Every Moment Special</span>
          </a>
          <div class="nav__links" id="navLinks">
            <a href="index.html" data-key="home" class="${isActive("home") ? "is-active" : ""}">Home</a>
            <a href="shop.html" data-key="shop" class="${isActive("shop") ? "is-active" : ""}">Shop</a>
            <div class="nav__item" id="catItem">
              <button type="button" class="nav__trigger" id="catTrigger" aria-expanded="false" aria-haspopup="true">Categories ${ICON.chevron}</button>
              <div class="nav__menu" role="menu">
                ${STORE.categories
                  .map(
                    (c) =>
                      `<a href="shop.html?category=${enc(c.slug)}" role="menuitem">${catBadge(c)} ${escapeHTML(c.name)}</a>`
                  )
                  .join("") || '<a href="shop.html" role="menuitem">All Gifts</a>'}
              </div>
            </div>
            <a href="about.html" data-key="about" class="${isActive("about") ? "is-active" : ""}">About Us</a>
            <a href="contact.html" data-key="contact" class="${isActive("contact") ? "is-active" : ""}">Contact</a>
          </div>
          <div class="nav__actions">
            <button class="icon-btn" id="searchToggle" aria-label="Search gifts" aria-expanded="false">${ICON.search}</button>
            <a href="login.html" class="icon-btn" id="accountLink" aria-label="Sign in">${ICON.user}</a>
            <a href="cart.html" class="icon-btn" aria-label="Shopping cart">
              ${ICON.bag}<span class="cart-count is-empty">0</span>
            </a>
            <button class="icon-btn nav__toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">${ICON.menu}</button>
          </div>
        </nav>
        <div class="search-bar" id="searchBar">
          <form class="container" id="headerSearch" role="search">
            <label class="sr-only" for="headerSearchInput">Search gifts</label>
            <input type="search" id="headerSearchInput" placeholder="Search for gifts, flowers, cakes…">
            <button type="submit" class="btn btn--primary">Search</button>
          </form>
        </div>
      </header>`;

    // Mobile menu
    const toggle = $("#navToggle");
    const menu = $("#navLinks");
    const setOpen = (open) => {
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open);
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.innerHTML = open ? ICON.close : ICON.menu;
    };
    toggle.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    window.addEventListener("resize", () => window.innerWidth > 900 && setOpen(false));

    // Categories dropdown
    const catItem = $("#catItem");
    const catTrigger = $("#catTrigger");
    const setCatOpen = (open) => {
      catItem.classList.toggle("is-open", open);
      catTrigger.setAttribute("aria-expanded", open);
    };
    catTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      setCatOpen(!catItem.classList.contains("is-open"));
    });
    catItem.addEventListener("mouseenter", () => window.innerWidth > 900 && setCatOpen(true));
    catItem.addEventListener("mouseleave", () => window.innerWidth > 900 && setCatOpen(false));

    // Search bar
    const searchBar = $("#searchBar");
    const searchToggle = $("#searchToggle");
    searchToggle.addEventListener("click", () => {
      const open = !searchBar.classList.contains("is-open");
      searchBar.classList.toggle("is-open", open);
      searchToggle.setAttribute("aria-expanded", open);
      if (open) $("#headerSearchInput").focus();
    });
    $("#headerSearch").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#headerSearchInput").value.trim();
      location.href = q ? `shop.html?q=${enc(q)}` : "shop.html";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setCatOpen(false);
      searchBar.classList.remove("is-open");
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest(".nav") || e.target.closest(".search-bar")) return;
      setOpen(false);
      setCatOpen(false);
    });

    const header = $(".site-header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const mount = $("#site-footer");
    if (!mount) return;
    const year = new Date().getFullYear();
    const tel = S.contactPhone.replace(/[^\d+]/g, "");
    const wa = tel.replace(/\D/g, "");
    mount.outerHTML = `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div>
            <a href="index.html" class="logo logo--light">
              <span class="logo__name">Gift R<span class="logo__ribbon">${ICON.ribbon}</span></span>
            </a>
            <p>Gift R is your one-stop destination for premium gifts. We help you make every moment special.</p>
            <div class="socials">
              <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">${ICON.facebook}</a>
              <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">${ICON.instagram}</a>
              <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok">${ICON.tiktok}</a>
              <a href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.whatsapp}</a>
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="shop.html">Shop</a></li>
              ${STORE.categories
                .slice(0, 3)
                .map((c) => `<li><a href="shop.html?category=${enc(c.slug)}">${escapeHTML(c.name)}</a></li>`)
                .join("")}
              <li><a href="about.html">About Us</a></li>
              <li><a href="contact.html">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4>Customer Service</h4>
            <ul class="footer-links">
              <li><a href="cart.html">My Cart</a></li>
              <li><a href="checkout.html">Checkout</a></li>
              <li><a href="contact.html#faq">Shipping Policy</a></li>
              <li><a href="contact.html#faq">Return &amp; Refund Policy</a></li>
              <li><a href="login.html">My Account</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact Us</h4>
            <ul class="footer-contact">
              <li>${ICON.phone}<a href="tel:${escapeHTML(tel)}">${escapeHTML(S.contactPhone)}</a></li>
              <li>${ICON.mail}<a href="mailto:${escapeHTML(S.contactEmail)}">${escapeHTML(S.contactEmail)}</a></li>
              <li>${ICON.pin}<span>${escapeHTML(S.contactAddress)}</span></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="container footer-bottom__inner">
            <span>© ${year} Gift R. All Rights Reserved.</span>
            <span>Made with ❤️ for You</span>
            <div class="pay-icons" aria-label="Accepted payments">
              <span>bKash</span><span>Nagad</span><span>Rocket</span><span>VISA</span><span>Mastercard</span>
            </div>
          </div>
        </div>
      </footer>
      <a class="whatsapp-float" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${ICON.whatsapp}</a>
      <button class="back-to-top" aria-label="Back to top">${ICON.up}</button>
      <div class="toast-wrap" aria-live="polite"></div>`;

    const btn = $(".back-to-top");
    window.addEventListener("scroll", () => btn.classList.toggle("is-visible", window.scrollY > 600), { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // Elements like <span data-setting="contactPhone"> get live values from settings
  function applySettingsToPage() {
    $$("[data-setting]").forEach((el) => {
      const value = S[el.dataset.setting];
      if (value === undefined || value === "") return;
      el.textContent = value;
      if (el.tagName === "A" && el.dataset.setting === "contactPhone") el.href = "tel:" + value.replace(/[^\d+]/g, "");
      if (el.tagName === "A" && el.dataset.setting === "contactEmail") el.href = "mailto:" + value;
    });
    $$("[data-setting-money]").forEach((el) => (el.textContent = money(S[el.dataset.settingMoney] || 0)));
  }

  /* Newsletter forms (footer + homepage) */
  function initNewsletters() {
    $$(".js-newsletter").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("input[type=email]", form);
        if (!isEmail(input.value)) {
          toast({ title: "Please enter a valid email", text: "e.g. name@example.com", icon: ICON.mail });
          input.focus();
          return;
        }
        form.reset();
        toast({ title: "You're subscribed!", text: "Watch your inbox for festive offers." });
      });
    });
  }

  /* ---------------- Toast ---------------- */
  function toast({ title, text = "", image, icon, link, duration = 3200 }) {
    const wrap = $(".toast-wrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = `
      ${image ? `<img src="${escapeHTML(image)}" alt="">` : `<span class="toast__icon">${icon || ICON.gift}</span>`}
      <div class="toast__text"><strong>${escapeHTML(title)}</strong>${escapeHTML(text)}</div>
      ${link ? `<a href="${link.href}">${link.label}</a>` : ""}`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => el.remove());
    }, duration);
  }

  /* ---------------- Product card ---------------- */
  const skeletonCards = (n) => Array.from({ length: n }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join("");

  function productCard(p, index = 0) {
    const badgeClass = { Bestseller: "badge--gold", New: "badge--mint", Premium: "badge--gold" }[p.badge] || "";
    const badge = !p.inStock
      ? `<span class="badge badge--muted">Sold out</span>`
      : p.badge
      ? `<span class="badge ${badgeClass}">${escapeHTML(p.badge)}</span>`
      : "";
    const name = escapeHTML(p.name);
    const url = `product.html?id=${enc(p.id)}`;
    return `
      <article class="product-card${p.inStock ? "" : " is-soldout"}" style="animation-delay:${Math.min(index, 12) * 50}ms">
        ${badge}
        <a href="${url}" class="product-card__media" aria-label="${name}">
          <img src="${escapeHTML(img(p, 1))}" alt="${name}" loading="lazy" decoding="async" width="400" height="400">
          <img src="${escapeHTML(img(p, 3))}" alt="" class="img-alt" loading="lazy" decoding="async" width="400" height="400">
        </a>
        <div class="product-card__body">
          <h3><a href="${url}">${name}</a></h3>
          <div class="rating"><span class="stars" aria-hidden="true">${stars(p.rating)}</span> ${p.rating} (${p.reviews})</div>
          <span class="price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</span>
          ${
            p.inStock
              ? `<button class="btn btn--primary btn--sm btn--block btn--square js-add" data-id="${escapeHTML(p.id)}">${ICON.bag} ${p.requiresPersonalization ? "Personalize" : "Add to Cart"}</button>`
              : `<a href="${url}" class="btn btn--ghost btn--sm btn--block btn--square">View details</a>`
          }
        </div>
      </article>`;
  }

  // One delegated listener handles every quick "Add to Cart" button on any page
  function initQuickAdd() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".js-add");
      if (!btn) return;
      e.preventDefault();
      const p = getProduct(btn.dataset.id);
      if (!p) return;
      if (!p.inStock) return toast({ title: "Sorry, sold out", text: p.name, icon: ICON.alert });
      if (p.requiresPersonalization) {
        location.href = `product.html?id=${enc(p.id)}#addForm`;
        return;
      }
      Cart.add(p.id, 1);
      toast({ title: "Added to cart", text: p.name, image: img(p, 1), link: { href: "cart.html", label: "View cart" } });
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const els = $$(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("is-visible"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- Form validation ---------------- */
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  }

  // Validates every [data-validate] field inside form; returns true when valid.
  function validateForm(form) {
    let firstInvalid = null;
    $$("[data-validate]", form).forEach((input) => {
      const field = input.closest(".field");
      if (!field || input.closest("[hidden]")) return;
      const rules = input.dataset.validate.split(" ");
      const v = input.value.trim();
      let ok = true;
      if (rules.includes("required") && !v) ok = false;
      if (ok && v && rules.includes("email") && !isEmail(v)) ok = false;
      if (ok && v && rules.includes("phone") && v.replace(/\D/g, "").length < 7) ok = false;
      if (ok && v && rules.includes("zip") && !/^[A-Za-z0-9 -]{3,10}$/.test(v)) ok = false;
      if (ok && v && rules.includes("card") && !luhn(v.replace(/\s/g, ""))) ok = false;
      if (ok && v && rules.includes("expiry") && !validExpiry(v)) ok = false;
      if (ok && v && rules.includes("cvc") && !/^\d{3,4}$/.test(v)) ok = false;
      field.classList.toggle("has-error", !ok);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function clearErrorOnInput(form) {
    form.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });
  }

  function luhn(num) {
    if (!/^\d{12,19}$/.test(num)) return false;
    let sum = 0;
    let dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = +num[i];
      if (dbl && (d *= 2) > 9) d -= 9;
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  function validExpiry(v) {
    const m = v.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (!m) return false;
    const month = +m[1];
    const year = 2000 + +m[2];
    if (month < 1 || month > 12) return false;
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
  }

  /* ==========================================================
     Page: Home
     ========================================================== */
  function initHome() {
    const title = $("#heroTitle");
    if (title && S.heroTitle) title.innerHTML = emphasis(S.heroTitle);
    const lead = $("#heroLead");
    if (lead && S.heroSubtitle) lead.textContent = S.heroSubtitle;

    const featuredList = STORE.products.filter((p) => p.featured);
    const floats = $("#heroFloats");
    if (floats) {
      floats.innerHTML = featuredList
        .slice(0, 2)
        .map(
          (p, i) => `
          <a href="product.html?id=${enc(p.id)}" class="hero__float hero__float--${i ? "b" : "a"}">
            <img src="${escapeHTML(img(p, 1))}" alt="" width="52" height="52" />
            <div><small>${escapeHTML(p.badge || (i ? "Just arrived" : "Featured"))}</small><strong>${escapeHTML(p.name)}</strong><br /><span class="price">${money(p.price)}</span></div>
          </a>`
        )
        .join("");
    }

    const strip = $("#catStrip");
    if (strip) {
      strip.innerHTML = STORE.categories
        .map(
          (c) => `
          <a href="shop.html?category=${enc(c.slug)}" class="cat-pill">
            <img src="${escapeHTML(catIcon(c))}" alt="" loading="lazy" decoding="async" width="150" height="150">
            <span>${escapeHTML(c.name)}</span>
          </a>`
        )
        .join("");
    }

    const cats = $("#homeCategories");
    if (cats) {
      cats.innerHTML = STORE.categories
        .map((c) => {
          const count = STORE.products.filter((p) => p.category === c.slug).length;
          return `
          <a href="shop.html?category=${enc(c.slug)}" class="cat-card reveal">
            <img src="${escapeHTML(catImage(c))}" alt="${escapeHTML(c.name)}" loading="lazy" decoding="async" width="600" height="450">
            <div class="cat-card__body">
              <h3>${escapeHTML(c.name)}</h3>
              <p>${escapeHTML(c.tagline)} · ${count} gift${count === 1 ? "" : "s"}</p>
              <span class="cat-card__link">Shop now →</span>
            </div>
          </a>`;
        })
        .join("");
    }

    const featured = $("#featuredProducts");
    if (featured) {
      const list = (featuredList.length ? featuredList : STORE.products).slice(0, 6);
      featured.innerHTML = list.map(productCard).join("") || emptyCatalog();
    }

    const best = $("#bestSellers");
    if (best)
      best.innerHTML = [...STORE.products]
        .sort((a, b) => b.reviews - a.reviews)
        .slice(0, 6)
        .map(productCard)
        .join("");

    const copy = $("#copyCode");
    if (copy)
      copy.addEventListener("click", () => {
        const code = $("#promoCodeText").textContent.trim();
        const done = () => toast({ title: "Code copied!", text: `Use ${code} at checkout.`, icon: ICON.copy });
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done);
        else done();
      });
  }

  const emptyCatalog = () => `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state__icon">${ICON.gift}</div>
      <h3>New gifts are on their way</h3>
      <p>Our shelves are being restocked. Please check back soon!</p>
    </div>`;

  /* ==========================================================
     Page: Shop / product listing
     ========================================================== */
  function initShop() {
    const params = new URLSearchParams(location.search);
    const maxPrice = Math.max(10, Math.ceil(Math.max(0, ...STORE.products.map((p) => p.price)) / 10) * 10);
    const state = {
      category: getCategory(params.get("category")) ? params.get("category") : "all",
      q: params.get("q") || "",
      sort: "featured",
      max: maxPrice,
      onSale: false,
    };

    const grid = $("#productGrid");
    const countEl = $("#resultCount");
    const catList = $("#catList");
    const chips = $("#catChips");
    const search = $("#searchInput");
    const sort = $("#sortSelect");
    const range = $("#priceRange");
    const rangeVal = $("#priceValue");
    const sale = $("#onSale");

    range.min = 0;
    range.max = maxPrice;
    range.value = maxPrice;
    $("#priceMin").textContent = money(0);
    search.value = state.q;

    const catOptions = [{ slug: "all", name: "All Gifts", emoji: "✨" }, ...STORE.categories];
    const countFor = (slug) =>
      slug === "all" ? STORE.products.length : STORE.products.filter((p) => p.category === slug).length;

    catList.innerHTML = catOptions
      .map(
        (c) =>
          `<li><button type="button" data-cat="${escapeHTML(c.slug)}"><span class="cat-list__name">${catBadge(c)} ${escapeHTML(c.name)}</span><span class="count">${countFor(c.slug)}</span></button></li>`
      )
      .join("");
    chips.innerHTML = catOptions
      .map((c) => `<button type="button" class="chip" data-cat="${escapeHTML(c.slug)}">${catBadge(c)} ${escapeHTML(c.name)}</button>`)
      .join("");

    function updateHeading() {
      const cat = getCategory(state.category);
      $("#shopTitle").textContent = cat ? cat.name : "All Gifts";
      $("#shopTagline").textContent = cat ? cat.tagline : "Explore our full collection of thoughtfully curated gifts.";
      $("#crumbCurrent").textContent = cat ? cat.name : "All Gifts";
      document.title = `${cat ? cat.name : "Shop All Gifts"} | Gift R`;
      $$("[data-cat]").forEach((b) => b.classList.toggle("is-active", b.dataset.cat === state.category));
    }

    function render() {
      const q = state.q.trim().toLowerCase();
      let list = STORE.products.filter((p) => {
        const cat = getCategory(p.category);
        return (
          (state.category === "all" || p.category === state.category) &&
          p.price <= state.max &&
          (!state.onSale || p.oldPrice) &&
          (!q || (p.name + " " + p.short + " " + (cat ? cat.name : "")).toLowerCase().includes(q))
        );
      });
      const sorters = {
        featured: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sortOrder - b.sortOrder,
        "price-asc": (a, b) => a.price - b.price,
        "price-desc": (a, b) => b.price - a.price,
        rating: (a, b) => b.rating - a.rating,
        name: (a, b) => a.name.localeCompare(b.name),
      };
      list = [...list].sort(sorters[state.sort]);

      countEl.textContent = `Showing ${list.length} of ${STORE.products.length} gifts`;
      grid.innerHTML = list.length
        ? list.map(productCard).join("")
        : `<div class="empty-state" style="grid-column:1/-1">
             <div class="empty-state__icon">${ICON.search}</div>
             <h3>No gifts match your filters</h3>
             <p>Try a different search term or widen your price range.</p>
             <button class="btn btn--outline" id="resetFilters">Reset filters</button>
           </div>`;
      const reset = $("#resetFilters");
      if (reset) reset.addEventListener("click", resetFilters);
    }

    function syncURL() {
      const p = new URLSearchParams();
      if (state.category !== "all") p.set("category", state.category);
      if (state.q) p.set("q", state.q);
      const qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
      // keep nav highlighting in step with the chosen category
      $$("#navLinks a").forEach((a) => {
        const key = a.dataset.key;
        a.classList.toggle("is-active", state.category === "all" ? key === "shop" : key === state.category);
      });
    }

    function resetFilters() {
      Object.assign(state, { category: "all", q: "", max: maxPrice, onSale: false });
      search.value = "";
      range.value = maxPrice;
      rangeVal.textContent = money(maxPrice);
      sale.checked = false;
      updateHeading();
      syncURL();
      render();
    }

    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cat]");
      if (!b) return;
      state.category = b.dataset.cat;
      updateHeading();
      syncURL();
      render();
    });

    let t;
    search.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.q = search.value;
        syncURL();
        render();
      }, 200);
    });
    sort.addEventListener("change", () => {
      state.sort = sort.value;
      render();
    });
    range.addEventListener("input", () => {
      state.max = +range.value;
      rangeVal.textContent = money(state.max);
      render();
    });
    sale.addEventListener("change", () => {
      state.onSale = sale.checked;
      render();
    });
    $("#clearFilters").addEventListener("click", resetFilters);

    rangeVal.textContent = money(maxPrice);
    updateHeading();
    render();
  }

  /* ==========================================================
     Page: Product detail
     ========================================================== */
  function initProduct() {
    const root = $("#productRoot");
    const id = new URLSearchParams(location.search).get("id");
    const p = getProduct(id);

    if (!p) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${ICON.gift}</div>
          <h2>Gift not found</h2>
          <p>Sorry, we couldn't find that product. It may have been unwrapped already!</p>
          <a href="shop.html" class="btn btn--primary">Browse all gifts</a>
        </div>`;
      const related = $("#relatedProducts");
      if (related) related.innerHTML = STORE.products.filter((x) => x.featured).slice(0, 4).map(productCard).join("");
      return;
    }

    const cat = getCategory(p.category) || { slug: p.category, name: "Gifts", emoji: "🎁" };
    const name = escapeHTML(p.name);
    document.title = `${p.name} | Gift R`;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute("content", p.short);

    const images = (p.images || []).filter(Boolean);
    const gallery = images.length ? images : [img(p, 1)];

    const reviewsSample = [
      ["Aisha K.", 5, "Absolutely gorgeous — the packaging alone made them tear up. Arrived a day early too!"],
      ["Daniel M.", 5, "Exactly as pictured and such great quality. Will definitely order from Gift R again."],
      ["Priya S.", 4, "Lovely gift and beautiful wrapping. Delivery took one extra day but worth the wait."],
    ];

    root.innerHTML = `
      <ol class="breadcrumb breadcrumb--left" aria-label="Breadcrumb">
        <li><a href="index.html">Home</a></li>
        <li><a href="shop.html">Shop</a></li>
        <li><a href="shop.html?category=${enc(cat.slug)}">${escapeHTML(cat.name)}</a></li>
        <li aria-current="page">${name}</li>
      </ol>

      <div class="pd">
        <div class="gallery">
          <div class="gallery__main">
            ${!p.inStock ? `<span class="badge badge--muted">Sold out</span>` : p.badge ? `<span class="badge">${escapeHTML(p.badge)}</span>` : ""}
            <img id="mainImage" src="${escapeHTML(gallery[0])}" alt="${name}" width="800" height="800">
          </div>
          ${
            gallery.length > 1
              ? `<div class="gallery__thumbs">
                  ${gallery
                    .map(
                      (src, i) =>
                        `<button type="button" class="${i === 0 ? "is-active" : ""}" data-img="${escapeHTML(src)}" aria-label="View image ${i + 1}">
                           <img src="${escapeHTML(src)}" alt="" width="200" height="200" loading="lazy" decoding="async">
                         </button>`
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>

        <div class="pd__info">
          <a href="shop.html?category=${enc(cat.slug)}" class="product-card__cat">${escapeHTML(cat.name)}</a>
          <h1>${name}</h1>
          <div class="rating"><span class="stars" aria-hidden="true">${stars(p.rating)}</span> ${p.rating} · ${p.reviews} reviews</div>
          <div class="pd__price">
            <span class="price">${money(p.price)}${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}</span>
            ${p.oldPrice && p.oldPrice > p.price ? `<span class="save-tag">Save ${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}
            ${p.inStock ? "" : `<span class="save-tag save-tag--out">Out of stock</span>`}
          </div>
          <p class="pd__desc">${escapeHTML(p.description || p.short)}</p>
          ${p.features.length ? `<ul class="pd__features">${p.features.map((f) => `<li>${escapeHTML(f)}</li>`).join("")}</ul>` : ""}

          <form id="addForm">
            <div class="pd__options">
              ${
                p.requiresPersonalization
                  ? `<div class="field">
                       <label for="personalText">Personalization text <span class="req">*</span></label>
                       <input id="personalText" maxlength="40" placeholder="e.g. Emma & Liam · 14.02.2020" data-validate="required">
                       <span class="error-msg">Please enter the text you'd like engraved or printed.</span>
                     </div>`
                  : `<div class="field">
                       <label for="personalText">Gift message (optional)</label>
                       <input id="personalText" maxlength="80" placeholder="Happy celebrations! With love…">
                     </div>`
              }
              <label class="check"><input type="checkbox" id="giftWrap"> Add premium gift wrapping (+${money(S.giftWrapPrice)})</label>
              <div>
                <span class="option-label" id="qtyLabel">Quantity</span>
                <div class="qty" role="group" aria-labelledby="qtyLabel">
                  <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
                  <input type="number" id="qty" value="1" min="1" max="99" aria-label="Quantity">
                  <button type="button" data-step="1" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>
            <div class="pd__buy">
              <button type="submit" class="btn btn--primary" ${p.inStock ? "" : "disabled"}>${ICON.bag.replace("<svg", '<svg width="18" height="18"')} ${p.inStock ? "Add to Cart" : "Sold out"}</button>
              <button type="button" class="btn btn--gold" id="buyNow" ${p.inStock ? "" : "disabled"}>Buy Now</button>
            </div>
          </form>

          <div class="pd__meta">
            <div><span>${ICON.truck}</span>Free shipping over ${money(S.freeShippingMin)}</div>
            <div><span>${ICON.ribbonWrap}</span>Beautifully gift-wrapped</div>
            <div><span>${ICON.refresh}</span>30-day easy returns</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div class="tabs__nav" role="tablist">
          <button type="button" role="tab" class="is-active" data-tab="details" aria-selected="true">Details</button>
          <button type="button" role="tab" data-tab="shipping" aria-selected="false">Shipping &amp; Returns</button>
          <button type="button" role="tab" data-tab="reviews" aria-selected="false">Reviews (${p.reviews})</button>
        </div>
        <div class="tabs__panel" data-panel="details" role="tabpanel">
          <p>${escapeHTML(p.description || p.short)}</p>
          <p>Every Gift R order is hand-checked and packed in our signature pink box with tissue paper. A complimentary card is included — just add your message above.</p>
        </div>
        <div class="tabs__panel" data-panel="shipping" role="tabpanel" hidden>
          <p><strong>Standard delivery (2–4 working days):</strong> ${money(S.shippingStandard)}, free on orders over ${money(S.freeShippingMin)}.</p>
          <p><strong>Express delivery (next day):</strong> ${money(S.shippingExpress)}.</p>
          <p><strong>Returns:</strong> Unused, non-personalized items can be returned within 30 days for a full refund. Personalized gifts are made to order and can only be returned if faulty.</p>
        </div>
        <div class="tabs__panel" data-panel="reviews" role="tabpanel" hidden>
          ${reviewsSample
            .map(
              ([who, r, text]) =>
                `<div class="review"><span class="stars">${stars(r)}</span> <strong>${who}</strong><p>${text}</p></div>`
            )
            .join("")}
        </div>
      </div>`;

    // Gallery
    const main = $("#mainImage");
    $$(".gallery__thumbs button").forEach((b) =>
      b.addEventListener("click", () => {
        $$(".gallery__thumbs button").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        main.src = b.dataset.img;
        main.style.animation = "none";
        void main.offsetWidth;
        main.style.animation = "";
      })
    );

    // Quantity stepper
    const qty = $("#qty");
    const clampQty = () => (qty.value = Math.max(1, Math.min(99, parseInt(qty.value, 10) || 1)));
    $$(".qty [data-step]").forEach((b) =>
      b.addEventListener("click", () => {
        qty.value = (parseInt(qty.value, 10) || 1) + +b.dataset.step;
        clampQty();
      })
    );
    qty.addEventListener("change", clampQty);

    // Tabs
    $$(".tabs__nav button").forEach((b) =>
      b.addEventListener("click", () => {
        $$(".tabs__nav button").forEach((x) => {
          x.classList.toggle("is-active", x === b);
          x.setAttribute("aria-selected", x === b);
        });
        $$(".tabs__panel").forEach((panel) => (panel.hidden = panel.dataset.panel !== b.dataset.tab));
      })
    );

    // Add to cart / Buy now
    const form = $("#addForm");
    clearErrorOnInput(form);
    const addToCart = () => {
      if (!p.inStock || !validateForm(form)) return false;
      clampQty();
      Cart.add(p.id, +qty.value, { giftWrap: $("#giftWrap").checked, message: $("#personalText").value });
      return true;
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (addToCart())
        toast({
          title: `Added ${qty.value} to cart`,
          text: p.name,
          image: img(p, 1),
          link: { href: "cart.html", label: "View cart" },
        });
    });
    $("#buyNow").addEventListener("click", () => {
      if (addToCart()) location.href = "checkout.html";
    });
    if (location.hash === "#addForm" && p.requiresPersonalization) setTimeout(() => $("#personalText").focus(), 300);

    // Related products
    const related = $("#relatedProducts");
    if (related) {
      const same = STORE.products.filter((x) => x.category === p.category && x.id !== p.id);
      const others = STORE.products.filter((x) => x.category !== p.category && x.featured);
      related.innerHTML = [...same, ...others].slice(0, 4).map(productCard).join("");
    }
  }

  /* ==========================================================
     Page: Cart
     ========================================================== */
  function summaryRows(t) {
    return `
      <div class="summary__row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="summary__row discount"><span>Discount (${escapeHTML(t.promoCode)})</span><span>−${money(t.discount)}</span></div>` : ""}
      <div class="summary__row"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
      <div class="summary__row"><span>Estimated tax (${S.taxRate}%)</span><span>${money(t.tax)}</span></div>
      <div class="summary__total"><span>Total</span><span>${money(t.total)}</span></div>`;
  }

  function lineDetails(item) {
    const bits = [];
    if (item.giftWrap) bits.push("Gift wrapped");
    if (item.message) bits.push(`“${escapeHTML(item.message)}”`);
    return bits.join(" · ");
  }

  function initCart() {
    const root = $("#cartRoot");
    let busy = false;

    function promoHint(promo, t) {
      if (!promo) return "Have a promo code? Enter it above.";
      if (promo.min && t.subtotal < promo.min)
        return `<span style="color:var(--danger)">${escapeHTML(promo.code)} needs a subtotal of ${money(promo.min)} or more.</span>`;
      return `<span style="color:var(--success)">✓ ${escapeHTML(promo.code)} applied — ${promoLabel(promo)}</span>`;
    }

    function render() {
      const items = Cart.items();
      if (!items.length) {
        root.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">${ICON.bag}</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any gifts yet. Let's find something special!</p>
            <a href="shop.html" class="btn btn--primary">Start shopping</a>
          </div>`;
        return;
      }
      const t = Cart.totals();
      const toFree = Math.max(0, S.freeShippingMin - (t.subtotal - t.discount));
      const promo = Cart.promo();
      const soldOut = items.some((i) => !getProduct(i.id).inStock);

      root.innerHTML = `
        <div class="cart-layout">
          <div>
            <div class="cart-list">
              <div class="cart-list__head"><span>Product</span><span>Price</span><span>Quantity</span><span style="text-align:right">Total</span></div>
              ${items
                .map((i) => {
                  const p = getProduct(i.id);
                  const unit = Cart.linePrice(i);
                  const cat = getCategory(p.category);
                  return `
                  <div class="cart-item" data-key="${escapeHTML(i.key)}">
                    <div class="cart-item__product">
                      <a href="product.html?id=${enc(p.id)}"><img src="${escapeHTML(img(p, 1))}" alt="${escapeHTML(p.name)}" width="84" height="84"></a>
                      <div>
                        <h3><a href="product.html?id=${enc(p.id)}">${escapeHTML(p.name)}</a></h3>
                        <div class="cart-item__meta">${cat ? escapeHTML(cat.name) : ""}${lineDetails(i) ? " · " + lineDetails(i) : ""}</div>
                        ${p.inStock ? "" : `<div class="cart-item__meta" style="color:var(--danger)">Sold out — please remove to continue</div>`}
                        <button class="cart-item__remove" data-action="remove">Remove</button>
                      </div>
                    </div>
                    <span class="cart-item__unit">${money(unit)}</span>
                    <div class="qty qty--sm" role="group" aria-label="Quantity">
                      <button type="button" data-action="dec" aria-label="Decrease">−</button>
                      <input type="number" value="${i.qty}" min="1" max="99" data-action="set" aria-label="Quantity">
                      <button type="button" data-action="inc" aria-label="Increase">+</button>
                    </div>
                    <span class="cart-item__total">${money(unit * i.qty)}</span>
                  </div>`;
                })
                .join("")}
            </div>
            <div class="cart-actions">
              <a href="shop.html" class="btn btn--ghost">← Continue shopping</a>
              <button class="btn btn--outline" id="clearCart">Clear cart</button>
            </div>
          </div>

          <aside class="summary" aria-label="Order summary">
            <h2>Order Summary</h2>
            <div class="free-ship">
              ${toFree > 0 ? `You're <strong>${money(toFree)}</strong> away from free shipping` : `You've unlocked <strong>free standard shipping!</strong>`}
              <div class="progress"><span style="width:${S.freeShippingMin ? Math.min(100, ((t.subtotal - t.discount) / S.freeShippingMin) * 100) : 100}%"></span></div>
            </div>
            ${summaryRows(t)}
            <form class="promo-form" id="promoForm">
              <label for="promoInput" class="sr-only">Promo code</label>
              <input id="promoInput" placeholder="Promo code" value="${promo ? escapeHTML(promo.code) : ""}" ${promo ? "readonly" : ""}>
              <button class="btn btn--ghost btn--sm" type="submit">${promo ? "Remove" : "Apply"}</button>
            </form>
            <p class="form-hint" id="promoHint">${promoHint(promo, t)}</p>
            ${
              soldOut
                ? `<button class="btn btn--primary btn--block" disabled>Remove sold-out items to continue</button>`
                : `<a href="checkout.html" class="btn btn--primary btn--block">Proceed to Checkout</a>`
            }
            <div class="secure-note">${ICON.lock} Secure checkout · 30-day returns</div>
          </aside>
        </div>`;
    }

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn && btn.tagName === "BUTTON") {
        const key = btn.closest(".cart-item").dataset.key;
        const item = Cart.items().find((i) => i.key === key);
        if (!item) return;
        if (btn.dataset.action === "inc") Cart.setQty(key, item.qty + 1);
        if (btn.dataset.action === "dec") Cart.setQty(key, item.qty - 1);
        if (btn.dataset.action === "remove") {
          Cart.remove(key);
          toast({ title: "Removed from cart", text: getProduct(item.id).name, icon: ICON.trash });
        }
      }
      if (e.target.id === "clearCart") {
        if (confirm("Remove all items from your cart?")) Cart.save([]);
      }
    });

    root.addEventListener("change", (e) => {
      if (e.target.dataset.action === "set") {
        const key = e.target.closest(".cart-item").dataset.key;
        Cart.setQty(key, Math.max(0, parseInt(e.target.value, 10) || 0));
      }
    });

    root.addEventListener("submit", async (e) => {
      if (e.target.id !== "promoForm") return;
      e.preventDefault();
      if (busy) return;
      if (Cart.promo()) {
        Cart.setPromo(null);
        render();
        return;
      }
      const hint = $("#promoHint");
      const code = $("#promoInput").value.trim().toUpperCase();
      if (!code) {
        hint.className = "form-hint is-error";
        hint.textContent = "Please enter a promo code.";
        return;
      }
      busy = true;
      hint.className = "form-hint";
      hint.textContent = "Checking…";
      try {
        const res = await GiftAPI.validatePromo(code, Cart.totals().subtotal);
        if (!res || !res.valid) {
          hint.className = "form-hint is-error";
          hint.textContent = `“${code}” isn't a valid promo code.`;
          return;
        }
        const promo = { code: res.code, type: res.type, value: res.value, min: res.min_subtotal || 0 };
        Cart.setPromo(promo);
        toast({ title: "Promo applied!", text: `${promo.code} — ${promoLabel(promo)}`, icon: ICON.tag });
        render();
      } catch (err) {
        hint.className = "form-hint is-error";
        hint.textContent = err.message;
      } finally {
        busy = false;
      }
    });

    document.addEventListener("cart:change", render);
    render();
  }

  /* ==========================================================
     Page: Checkout
     ========================================================== */
  // A signed-in shopper's saved details fill the empty checkout fields.
  // Anything already typed is left alone, and guests are unaffected.
  async function prefillCheckout() {
    if (GiftAPI.isDemo) return;
    let profile = null;
    try {
      profile = await GiftAPI.account.getProfile();
    } catch (e) {
      return;
    }
    if (!profile) return;
    const [first, ...rest] = (profile.fullName || "").trim().split(/\s+/);
    const fill = (id, value) => {
      const el = $("#" + id);
      if (el && !el.value && value) el.value = value;
    };
    fill("firstName", first);
    fill("lastName", rest.join(" "));
    fill("email", profile.email);
    fill("phone", profile.phone);
    fill("address", profile.address);
    fill("city", profile.city);
    fill("zip", profile.zip);
  }

  function initCheckout() {
    const form = $("#checkoutForm");
    const summary = $("#checkoutSummary");
    const wrapper = $("#checkoutRoot");
    let placing = false;

    prefillCheckout();

    if (!Cart.items().length) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${ICON.cartEmpty}</div>
          <h2>Nothing to check out yet</h2>
          <p>Add a few gifts to your cart and come back here to complete your order.</p>
          <a href="shop.html" class="btn btn--primary">Browse gifts</a>
        </div>`;
      return;
    }

    const method = () => ($("input[name=shipping]:checked", form) || {}).value || "standard";

    function renderSummary() {
      const items = Cart.items();
      const t = Cart.totals(method());
      const std = $("#stdPrice");
      if (std) std.textContent = t.subtotal - t.discount >= S.freeShippingMin ? "Free" : money(S.shippingStandard);
      const exp = $("#expPrice");
      if (exp) exp.textContent = money(S.shippingExpress);

      summary.innerHTML = `
        <h2>Order Summary</h2>
        <div class="mini-items">
          ${items
            .map((i) => {
              const p = getProduct(i.id);
              return `
              <div class="mini-item">
                <div class="mini-item__img"><img src="${escapeHTML(img(p, 1))}" alt="" width="58" height="58"><b>${i.qty}</b></div>
                <div class="mini-item__name">${escapeHTML(p.name)}${lineDetails(i) ? `<small>${lineDetails(i)}</small>` : ""}</div>
                <div class="mini-item__price">${money(Cart.linePrice(i) * i.qty)}</div>
              </div>`;
            })
            .join("")}
        </div>
        ${summaryRows(t)}
        <button type="submit" form="checkoutForm" class="btn btn--primary btn--block" id="placeOrderBtn" style="margin-top:20px" ${placing ? "disabled" : ""}>
          ${placing ? "Placing your order…" : `${ICON.lock} Place Order · ${money(t.total)}`}
        </button>
        <div class="secure-note"><a href="cart.html" style="color:var(--red)">← Edit cart</a></div>`;
    }

    // Payment method toggling
    const syncPayment = () => {
      const val = ($("input[name=payment]:checked", form) || {}).value;
      $$(".pay-fields", form).forEach((el) => (el.hidden = el.dataset.pay !== val));
    };
    $$("input[name=payment]", form).forEach((r) => r.addEventListener("change", syncPayment));
    $$("input[name=shipping]", form).forEach((r) => r.addEventListener("change", renderSummary));

    // Input formatting for card fields
    const card = $("#cardNumber");
    card.addEventListener("input", () => {
      card.value = card.value
        .replace(/\D/g, "")
        .slice(0, 19)
        .replace(/(.{4})/g, "$1 ")
        .trim();
    });
    const exp = $("#cardExpiry");
    exp.addEventListener("input", (e) => {
      let v = exp.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3 || (v.length === 2 && e.inputType !== "deleteContentBackward")) v = v.slice(0, 2) + " / " + v.slice(2);
      exp.value = v;
    });
    $("#cardCvc").addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4)));

    // Gift recipient toggle
    const giftToggle = $("#isGift");
    const giftFields = $("#giftFields");
    giftToggle.addEventListener("change", () => (giftFields.hidden = !giftToggle.checked));

    clearErrorOnInput(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (placing) return;
      if (!validateForm(form)) {
        toast({ title: "Please check your details", text: "Some fields need your attention.", icon: ICON.alert });
        return;
      }
      const val = (id) => $("#" + id).value.trim();
      const isGift = giftToggle.checked;
      // Card details are only checked in the browser and never sent anywhere.
      const customer = {
        first_name: val("firstName"),
        last_name: val("lastName"),
        email: val("email"),
        phone: val("phone"),
        address: val("address"),
        city: val("city"),
        zip: val("zip"),
        country: val("country"),
        is_gift: isGift,
        recipient: isGift ? val("recipient") : "",
        delivery_date: isGift ? val("deliveryDate") : "",
        gift_note: isGift ? val("giftNote") : "",
        shipping_method: method(),
        payment_method: ($("input[name=payment]:checked", form) || {}).value || "card",
      };
      const items = Cart.items().map((i) => ({ id: i.id, qty: i.qty, gift_wrap: i.giftWrap, message: i.message }));
      const promo = Cart.promo();
      const estimate = Cart.totals(method());

      placing = true;
      renderSummary();
      try {
        const order = await GiftAPI.placeOrder(customer, items, promo ? promo.code : null, estimate);
        Cart.clear();
        showOrderModal({
          orderNo: order.order_no,
          name: customer.first_name,
          email: customer.email,
          total: order.total,
          method: customer.shipping_method,
        });
      } catch (err) {
        toast({ title: "We couldn't place your order", text: err.message, icon: ICON.alert, duration: 6000 });
        placing = false;
        renderSummary();
      }
    });

    syncPayment();
    renderSummary();
  }

  function showOrderModal({ orderNo, name, email, total, method }) {
    const eta = { standard: "2–4 working days", express: "next working day", pickup: "ready for pickup tomorrow" }[method];
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "orderTitle");
    modal.innerHTML = `
      <div class="modal__box">
        <div class="modal__icon">${ICON.check}</div>
        <h2 id="orderTitle">Thank you, ${escapeHTML(name)}!</h2>
        <p>Your order has been placed successfully. We're wrapping your gifts with love.</p>
        <div class="modal__order">Order ${escapeHTML(orderNo)}</div>
        <p>Order total: <strong>${money(total)}</strong>. We'll send updates to <strong>${escapeHTML(email)}</strong>.<br>Estimated delivery: ${eta}.</p>
        <div class="modal__actions">
          <a href="index.html" class="btn btn--ghost">Back to home</a>
          <a href="shop.html" class="btn btn--primary">Continue shopping</a>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    $("a", modal).focus();
  }

  /* ==========================================================
     Page: Contact
     ========================================================== */
  /* ==========================================================
     Page: My Account (signed-in shopper)
     ========================================================== */
  const ORDER_STAGES = ["pending", "processing", "shipped", "delivered"];

  function accountDate(v) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  async function initAccount() {
    const root = $("#accountRoot");
    if (!root) return;

    if (GiftAPI.isDemo) {
      root.innerHTML = `<div class="load-error">Accounts need the backend — see <code>SETUP.md</code>.</div>`;
      return;
    }

    root.innerHTML = '<div class="page-loader" role="status"><span class="spinner"></span> Loading your account…</div>';

    let user;
    try {
      user = await GiftAPI.auth.getUser();
    } catch (e) {
      user = null;
    }
    if (!user) return location.replace("login.html");

    // Staff belong in the dashboard, not here.
    const role = await GiftAPI.auth.role();
    if (role === "super" || role === "admin") return location.replace("admin.html");

    let profile, orders;
    try {
      [profile, orders] = await Promise.all([GiftAPI.account.getProfile(), GiftAPI.account.myOrders()]);
    } catch (err) {
      root.innerHTML = `<div class="load-error" role="alert">⚠️ ${escapeHTML(err.message)}</div>`;
      return;
    }

    const spent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + +o.total, 0);

    root.innerHTML = `
      <div class="account">
        <div class="account__head">
          <div>
            <h2>Hello, ${escapeHTML(profile.fullName || profile.email.split("@")[0])}</h2>
            <p class="muted">${escapeHTML(profile.email)}</p>
          </div>
          <button type="button" class="btn btn--outline btn--sm" id="accountSignOut">Sign out</button>
        </div>

        <div class="account__stats">
          <div class="account__stat"><small>Orders placed</small><strong>${orders.length}</strong></div>
          <div class="account__stat"><small>Total spent</small><strong>${money(spent)}</strong></div>
          <div class="account__stat"><small>Member since</small><strong>${accountDate(profile.createdAt)}</strong></div>
        </div>

        <div class="account__grid">
          <section class="account__panel">
            <h3>My orders</h3>
            <div id="ordersList">
              ${
                orders.length
                  ? orders.map(orderCard).join("")
                  : `<p class="muted">No orders yet. <a href="shop.html">Start shopping →</a></p>`
              }
            </div>
          </section>

          <section class="account__panel">
            <h3>Delivery details</h3>
            <p class="muted">Saved here so checkout is one tap faster next time.</p>
            <form id="profileForm" novalidate>
              <div class="field">
                <label for="pfName">Full name</label>
                <input id="pfName" type="text" autocomplete="name" value="${escapeHTML(profile.fullName)}" />
              </div>
              <div class="field">
                <label for="pfPhone">Phone</label>
                <input id="pfPhone" type="tel" autocomplete="tel" value="${escapeHTML(profile.phone)}" />
              </div>
              <div class="field">
                <label for="pfAddress">Address</label>
                <input id="pfAddress" type="text" autocomplete="street-address" value="${escapeHTML(profile.address)}" />
              </div>
              <div class="form-row">
                <div class="field">
                  <label for="pfCity">City</label>
                  <input id="pfCity" type="text" autocomplete="address-level2" value="${escapeHTML(profile.city)}" />
                </div>
                <div class="field">
                  <label for="pfZip">Postcode</label>
                  <input id="pfZip" type="text" autocomplete="postal-code" value="${escapeHTML(profile.zip)}" />
                </div>
              </div>
              <div class="field">
                <label for="pfCountry">Country</label>
                <input id="pfCountry" type="text" autocomplete="country-name" value="${escapeHTML(profile.country)}" />
              </div>
              <button type="submit" class="btn btn--primary btn--block" id="pfSave">Save details</button>
            </form>
          </section>
        </div>
      </div>`;

    $("#accountSignOut").addEventListener("click", async () => {
      await GiftAPI.auth.signOut();
      location.replace("login.html?signedout=1");
    });

    $("#profileForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#pfSave");
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Saving…";
      try {
        await GiftAPI.account.saveProfile({
          fullName: $("#pfName").value,
          phone: $("#pfPhone").value,
          address: $("#pfAddress").value,
          city: $("#pfCity").value,
          zip: $("#pfZip").value,
          country: $("#pfCountry").value,
        });
        toast({ title: "Details saved", text: "We'll use these at checkout." });
      } catch (err) {
        toast({ title: "Could not save", text: err.message });
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  function orderCard(o) {
    const stage = ORDER_STAGES.indexOf(o.status);
    const items = o.order_items || [];
    return `
      <article class="order-card">
        <header class="order-card__head">
          <div>
            <strong>${escapeHTML(o.order_no)}</strong>
            <span class="muted">${accountDate(o.created_at)}</span>
          </div>
          <span class="pill pill--${escapeHTML(o.status)}">${escapeHTML(o.status)}</span>
        </header>
        ${
          o.status === "cancelled"
            ? ""
            : `<ol class="order-track" aria-label="Order progress">
                ${ORDER_STAGES.map(
                  (s, i) => `<li class="${i <= stage ? "is-done" : ""}">${s}</li>`
                ).join("")}
              </ol>`
        }
        <ul class="order-card__items">
          ${items
            .map(
              (i) =>
                `<li><span>${escapeHTML(i.product_name)} × ${i.qty}</span><span>${money(i.line_total)}</span></li>`
            )
            .join("")}
        </ul>
        <footer class="order-card__foot">
          <span class="muted">${escapeHTML(o.shipping_method)} · ${escapeHTML(o.payment_method)}</span>
          <strong>${money(o.total)}</strong>
        </footer>
      </article>`;
  }

  function initContact() {
    const form = $("#contactForm");
    const success = $("#contactSuccess");
    clearErrorOnInput(form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      success.classList.remove("is-visible");
      if (!validateForm(form)) return;
      const first = $("#cName").value.trim().split(" ")[0];
      $("#contactSuccessText").textContent = `Thanks, ${first}! Your message has been sent — we'll reply within 24 hours.`;
      success.classList.add("is-visible");
      form.reset();
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ==========================================================
     Boot
     ========================================================== */
  function showLoading() {
    ["#featuredProducts", "#bestSellers", "#productGrid", "#relatedProducts"].forEach((sel) => {
      const el = $(sel);
      if (el) el.innerHTML = skeletonCards(4);
    });
    const cats = $("#homeCategories");
    if (cats) cats.innerHTML = skeletonCards(4);
    ["#productRoot", "#cartRoot"].forEach((sel) => {
      const el = $(sel);
      if (el) el.innerHTML = '<div class="page-loader" role="status"><span class="spinner"></span> Loading…</div>';
    });
  }

  // The header renders synchronously, so the session is checked afterwards and
  // the account icon is upgraded in place once we know who is signed in.
  async function updateAccountLink() {
    const link = $("#accountLink");
    if (!link || GiftAPI.isDemo) return;
    try {
      const user = await GiftAPI.auth.getUser();
      if (!user) return;
      const role = await GiftAPI.auth.role();
      link.href = role === "super" || role === "admin" ? "admin.html" : "account.html";
      link.setAttribute("aria-label", "Your account");
      link.classList.add("is-signed-in");
    } catch (e) {
      /* leave the signed-out link in place */
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    showLoading();
    let loadError = null;
    try {
      const data = await GiftAPI.loadStore();
      STORE.categories = data.categories;
      STORE.products = data.products;
      Object.assign(S, data.settings);
      STORE.loaded = true;
    } catch (err) {
      loadError = err;
      console.error("Gift R: failed to load store", err);
    }

    renderHeader();
    renderFooter();
    updateAccountLink();
    applySettingsToPage();
    updateCartCount();
    initNewsletters();
    initQuickAdd();

    if (loadError) {
      const main = $("main");
      main.insertAdjacentHTML(
        "afterbegin",
        `<div class="load-error" role="alert">⚠️ We couldn't load the shop right now (${escapeHTML(loadError.message)}). Please refresh the page in a moment.</div>`
      );
      $$(".skeleton-card, .page-loader").forEach((el) => el.remove());
      initReveal();
      return;
    }

    const pages = {
      home: initHome,
      shop: initShop,
      product: initProduct,
      cart: initCart,
      checkout: initCheckout,
      contact: initContact,
      account: initAccount,
    };
    const init = pages[document.body.dataset.page];
    if (init) init();

    initReveal();

    // Keep the badge in sync if the cart changes in another tab
    window.addEventListener("storage", (e) => e.key === Cart.KEY && updateCartCount());
  });
})();
