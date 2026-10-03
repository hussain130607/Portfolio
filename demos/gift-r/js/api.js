/* ==========================================================
   Gift R — Data layer (Supabase)
   Everything that talks to the backend goes through window.GiftAPI.
   When js/config.js is empty, GiftAPI runs in demo mode using
   the sample catalogue in js/products.js.
   ========================================================== */

(function () {
  "use strict";

  const cfg = window.GIFTR_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const hasLib = !!(window.supabase && window.supabase.createClient);
  const client = configured && hasLib ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  // Demo mode only when no backend is configured. If it IS configured but the
  // library failed to load, calls throw instead of silently faking orders.
  const demo = !configured;

  const BUCKET = "product-images";
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const DEFAULT_SETTINGS = {
    announcement: "Surprise Your Loved Ones with the Perfect Gift",
    heroTitle: "Find The Perfect Gift *For Every Occasion*",
    heroSubtitle:
      "Explore our amazing collection of gifts for birthdays, anniversaries, special days and just because!",
    currency: "৳",
    freeShippingMin: 1000,
    shippingStandard: 80,
    shippingExpress: 150,
    giftWrapPrice: 50,
    taxRate: 0,
    contactAddress: "Cumilla, Bangladesh",
    contactPhone: "+880 1712-345678",
    contactEmail: "giftr.bd@gmail.com",
  };

  const DEMO_PROMOS = {
    GIFTR10: { type: "percent", value: 10, min_subtotal: 0 },
    FESTIVE20: { type: "percent", value: 20, min_subtotal: 2000 },
    WELCOME100: { type: "fixed", value: 100, min_subtotal: 500 },
  };

  /* ---------------- Mapping between DB rows and app objects ---------------- */
  const num = (v, d = 0) => (v === null || v === undefined || v === "" || isNaN(+v) ? d : +v);

  function productFromRow(r) {
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      price: num(r.price),
      oldPrice: r.old_price === null || r.old_price === undefined ? null : num(r.old_price),
      rating: num(r.rating, 5),
      reviews: num(r.reviews),
      emoji: r.emoji || "🎁",
      colors: r.colors && r.colors.length >= 2 ? r.colors : ["#FDE2E4", "#F7A8B8"],
      badge: r.badge || "",
      short: r.short || "",
      description: r.description || "",
      features: r.features || [],
      images: r.images || [],
      featured: !!r.featured,
      active: r.active !== false,
      inStock: r.in_stock !== false,
      requiresPersonalization: !!r.requires_personalization,
      sortOrder: num(r.sort_order),
      createdAt: r.created_at || null,
    };
  }

  function productToRow(p) {
    return {
      name: String(p.name || "").trim(),
      category: p.category,
      price: num(p.price),
      old_price: p.oldPrice === null || p.oldPrice === "" || p.oldPrice === undefined ? null : num(p.oldPrice),
      rating: num(p.rating, 5),
      reviews: Math.round(num(p.reviews)),
      emoji: p.emoji || "🎁",
      colors: p.colors,
      badge: p.badge ? String(p.badge).trim() : null,
      short: p.short || "",
      description: p.description || "",
      features: (p.features || []).map((f) => String(f).trim()).filter(Boolean),
      images: (p.images || []).filter(Boolean),
      featured: !!p.featured,
      active: !!p.active,
      in_stock: !!p.inStock,
      requires_personalization: !!p.requiresPersonalization,
      sort_order: Math.round(num(p.sortOrder)),
    };
  }

  function categoryFromRow(r) {
    return {
      slug: r.slug,
      name: r.name,
      emoji: r.emoji || "🎁",
      tagline: r.tagline || "",
      colors: r.colors && r.colors.length >= 2 ? r.colors : ["#FDE2E4", "#F9B8C0"],
      image: r.image || "",
      sortOrder: num(r.sort_order),
    };
  }

  function categoryToRow(c) {
    return {
      slug: String(c.slug || "").trim().toLowerCase(),
      name: String(c.name || "").trim(),
      emoji: c.emoji || "🎁",
      tagline: c.tagline || "",
      colors: c.colors,
      image: c.image || null,
      sort_order: Math.round(num(c.sortOrder)),
    };
  }

  function profileFromRow(r, user) {
    return {
      userId: (r && r.user_id) || (user && user.id) || null,
      email: (r && r.email) || (user && user.email) || "",
      fullName: (r && r.full_name) || "",
      phone: (r && r.phone) || "",
      address: (r && r.address) || "",
      city: (r && r.city) || "",
      zip: (r && r.zip) || "",
      country: (r && r.country) || "Bangladesh",
      createdAt: (r && r.created_at) || null,
    };
  }

  function profileToRow(p) {
    const t = (v) => (v === null || v === undefined ? null : String(v).trim() || null);
    return {
      full_name: t(p.fullName),
      phone: t(p.phone),
      address: t(p.address),
      city: t(p.city),
      zip: t(p.zip),
      country: t(p.country) || "Bangladesh",
    };
  }

  function settingsFromRow(r) {
    if (!r) return { ...DEFAULT_SETTINGS };
    return {
      announcement: r.announcement ?? DEFAULT_SETTINGS.announcement,
      heroTitle: r.hero_title ?? DEFAULT_SETTINGS.heroTitle,
      heroSubtitle: r.hero_subtitle ?? DEFAULT_SETTINGS.heroSubtitle,
      currency: r.currency || "$",
      freeShippingMin: num(r.free_shipping_min, DEFAULT_SETTINGS.freeShippingMin),
      shippingStandard: num(r.shipping_standard, DEFAULT_SETTINGS.shippingStandard),
      shippingExpress: num(r.shipping_express, DEFAULT_SETTINGS.shippingExpress),
      giftWrapPrice: num(r.gift_wrap_price, DEFAULT_SETTINGS.giftWrapPrice),
      taxRate: num(r.tax_rate, DEFAULT_SETTINGS.taxRate),
      contactAddress: r.contact_address ?? DEFAULT_SETTINGS.contactAddress,
      contactPhone: r.contact_phone ?? DEFAULT_SETTINGS.contactPhone,
      contactEmail: r.contact_email ?? DEFAULT_SETTINGS.contactEmail,
    };
  }

  function settingsToRow(s) {
    return {
      announcement: s.announcement,
      hero_title: s.heroTitle,
      hero_subtitle: s.heroSubtitle,
      currency: s.currency || "$",
      free_shipping_min: num(s.freeShippingMin),
      shipping_standard: num(s.shippingStandard),
      shipping_express: num(s.shippingExpress),
      gift_wrap_price: num(s.giftWrapPrice),
      tax_rate: num(s.taxRate),
      contact_address: s.contactAddress,
      contact_phone: s.contactPhone,
      contact_email: s.contactEmail,
    };
  }

  function promoFromRow(r) {
    return {
      code: r.code,
      type: r.type,
      value: num(r.value),
      minSubtotal: num(r.min_subtotal),
      active: r.active !== false,
      createdAt: r.created_at || null,
    };
  }

  /* ---------------- Errors ---------------- */
  function friendly(error) {
    if (!error) return new Error("Something went wrong.");
    const code = error.code;
    let msg = error.message || String(error);
    if (code === "23503") msg = "This item is still in use (e.g. a category that has products). Move or delete those first.";
    else if (code === "23505") msg = "That ID / code already exists. Please choose another one.";
    else if (code === "23514") msg = "Some values are not allowed: " + msg;
    else if (code === "42501" || /row-level security/i.test(msg)) msg = "You don't have permission to do that. Are you logged in as an admin?";
    else if (/Failed to fetch|NetworkError/i.test(msg)) msg = "Can't reach the server. Check your internet connection.";
    const e = new Error(msg);
    e.original = error;
    return e;
  }

  async function run(promise) {
    const { data, error } = await promise;
    if (error) throw friendly(error);
    return data;
  }

  function requireBackend() {
    if (!client) {
      throw new Error(
        configured
          ? "The Supabase library failed to load. Check your internet connection."
          : "Supabase is not configured yet. Add your project URL and anon key to js/config.js."
      );
    }
  }

  /* ---------------- Placeholder images ---------------- */
  // Used when a product/category has no uploaded image: gradient + emoji.
  function placeholderImage(emoji, colors) {
    const [c1, c2] = colors && colors.length >= 2 ? colors : ["#FFE3EC", "#F7A8B8"];
    const safe = (v) => String(v).replace(/[&<>"']/g, "");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${safe(c1)}"/><stop offset="1" stop-color="${safe(c2)}"/></linearGradient></defs>` +
      `<rect width="800" height="800" fill="url(#g)"/>` +
      `<circle cx="400" cy="400" r="215" fill="#ffffff" opacity="0.6"/>` +
      `<g transform="translate(400 400) scale(9) translate(-12 -12)" fill="none" stroke="#c2185b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` +
      `<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></g>` +
      `</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------------- Demo catalogue ---------------- */
  function demoCatalog() {
    const categories = (typeof CATEGORIES !== "undefined" ? CATEGORIES : []).map((c, i) => ({
      ...c,
      image: `images/category-${c.slug}.jpg`,
      sortOrder: i + 1,
    }));
    const products = (typeof PRODUCTS !== "undefined" ? PRODUCTS : []).map((p, i) => ({
      oldPrice: null,
      badge: "",
      ...p,
      images: [1, 2, 3].map((n) => `images/products/${p.id}-${n}.jpg`),
      active: true,
      inStock: true,
      requiresPersonalization: p.category === "personalized",
      sortOrder: i + 1,
    }));
    return { categories, products, settings: { ...DEFAULT_SETTINGS } };
  }

  /* ==========================================================
     Public API
     ========================================================== */
  const GiftAPI = {
    isConfigured: configured,
    isDemo: demo,
    client,
    DEFAULT_SETTINGS,
    placeholderImage,

    /* Store data for shoppers */
    async loadStore() {
      if (demo) return demoCatalog();
      requireBackend();
      const [cats, prods, settings] = await Promise.all([
        run(client.from("categories").select("*").order("sort_order").order("name")),
        run(client.from("products").select("*").eq("active", true).order("sort_order").order("created_at")),
        run(client.from("store_settings").select("*").eq("id", 1).maybeSingle()),
      ]);
      return {
        categories: cats.map(categoryFromRow),
        products: prods.map(productFromRow),
        settings: settingsFromRow(settings),
      };
    },

    async validatePromo(code, subtotal) {
      code = String(code || "").trim().toUpperCase();
      if (demo) {
        const p = DEMO_PROMOS[code];
        return p ? { valid: true, code, ...p } : { valid: false, message: "This promo code is not valid." };
      }
      requireBackend();
      const data = await run(client.rpc("validate_promo", { p_code: code, p_subtotal: subtotal || 0 }));
      if (data && data.valid) {
        data.value = num(data.value);
        data.min_subtotal = num(data.min_subtotal);
      }
      return data;
    },

    // customer: form fields; items: [{id, qty, gift_wrap, message}]
    // estimate: client-side totals, only used in demo mode
    async placeOrder(customer, items, promoCode, estimate) {
      if (demo) {
        await new Promise((r) => setTimeout(r, 600));
        return { order_no: "GR-" + Date.now().toString(36).toUpperCase().slice(-6), total: estimate ? estimate.total : 0, demo: true };
      }
      requireBackend();
      const data = await run(
        client.rpc("place_order", { p_customer: customer, p_items: items, p_promo: promoCode || null })
      );
      data.total = num(data.total);
      return data;
    },

    /* ---------------- Auth ---------------- */
    auth: {
      async signIn(email, password) {
        requireBackend();
        const data = await run(client.auth.signInWithPassword({ email: String(email).trim().toLowerCase(), password }));
        return data.user;
      },
      // Shoppers create their own account. Admin rights are never granted here —
      // the database decides that from the e-mail (see handle_new_user()).
      async signUp(email, password, fullName) {
        requireBackend();
        const data = await run(
          client.auth.signUp({
            email: String(email).trim().toLowerCase(),
            password,
            options: { data: { full_name: String(fullName || "").trim() } },
          })
        );
        return { user: data.user, needsConfirmation: !data.session };
      },
      async sendPasswordReset(email) {
        requireBackend();
        await run(
          client.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), {
            redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "login.html"),
          })
        );
      },
      async signOut() {
        if (client) await client.auth.signOut();
      },
      async getUser() {
        if (!client) return null;
        const { data } = await client.auth.getSession();
        return data.session ? data.session.user : null;
      },
      async isAdmin() {
        if (!client) return false;
        const { data, error } = await client.rpc("is_admin");
        return !error && data === true;
      },
      // "super" | "admin" | "customer" — drives where sign-in lands.
      async role() {
        if (!client) return null;
        const { data, error } = await client.rpc("my_role");
        if (error) return null;
        return data || "customer";
      },
      onChange(cb) {
        if (client) client.auth.onAuthStateChange((event, session) => cb(event, session));
      },
    },

    /* ---------------- Signed-in shopper ---------------- */
    account: {
      async getProfile() {
        requireBackend();
        const user = await GiftAPI.auth.getUser();
        if (!user) return null;
        const row = await run(client.from("profiles").select("*").eq("user_id", user.id).maybeSingle());
        return profileFromRow(row, user);
      },
      async saveProfile(p) {
        requireBackend();
        const user = await GiftAPI.auth.getUser();
        if (!user) throw new Error("You are not signed in.");
        const row = await run(
          client
            .from("profiles")
            .upsert({ user_id: user.id, email: user.email, ...profileToRow(p) }, { onConflict: "user_id" })
            .select()
            .single()
        );
        return profileFromRow(row, user);
      },
      async myOrders() {
        requireBackend();
        return run(
          client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200)
        );
      },
    },

    /* ---------------- Admin (RLS enforces admin-only access) ---------------- */
    admin: {
      async listProducts() {
        requireBackend();
        const rows = await run(client.from("products").select("*").order("sort_order").order("created_at"));
        return rows.map(productFromRow);
      },
      async saveProduct(p, isNew) {
        requireBackend();
        const row = productToRow(p);
        if (isNew) {
          if (p.id) row.id = p.id;
          return productFromRow(await run(client.from("products").insert(row).select().single()));
        }
        return productFromRow(await run(client.from("products").update(row).eq("id", p.id).select().single()));
      },
      async updateProductFields(id, fields) {
        requireBackend();
        const map = { price: "price", oldPrice: "old_price", active: "active", featured: "featured", inStock: "in_stock" };
        const row = {};
        Object.keys(fields).forEach((k) => (row[map[k] || k] = fields[k]));
        return productFromRow(await run(client.from("products").update(row).eq("id", id).select().single()));
      },
      async deleteProduct(id) {
        requireBackend();
        await run(client.from("products").delete().eq("id", id));
      },

      async listCategories() {
        requireBackend();
        const rows = await run(client.from("categories").select("*").order("sort_order").order("name"));
        return rows.map(categoryFromRow);
      },
      async saveCategory(c, originalSlug) {
        requireBackend();
        const row = categoryToRow(c);
        if (!originalSlug) return categoryFromRow(await run(client.from("categories").insert(row).select().single()));
        return categoryFromRow(await run(client.from("categories").update(row).eq("slug", originalSlug).select().single()));
      },
      async deleteCategory(slug) {
        requireBackend();
        await run(client.from("categories").delete().eq("slug", slug));
      },

      async listOrders() {
        requireBackend();
        return run(
          client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(1000)
        );
      },
      async updateOrderStatus(id, status) {
        requireBackend();
        return run(client.from("orders").update({ status }).eq("id", id).select().single());
      },
      async deleteOrder(id) {
        requireBackend();
        await run(client.from("orders").delete().eq("id", id));
      },

      async listPromos() {
        requireBackend();
        const rows = await run(client.from("promo_codes").select("*").order("created_at", { ascending: false }));
        return rows.map(promoFromRow);
      },
      async savePromo(p, originalCode) {
        requireBackend();
        const row = {
          code: String(p.code).trim().toUpperCase(),
          type: p.type,
          value: num(p.value),
          min_subtotal: num(p.minSubtotal),
          active: !!p.active,
        };
        if (!originalCode) return promoFromRow(await run(client.from("promo_codes").insert(row).select().single()));
        return promoFromRow(
          await run(client.from("promo_codes").update(row).eq("code", originalCode).select().single())
        );
      },
      async deletePromo(code) {
        requireBackend();
        await run(client.from("promo_codes").delete().eq("code", code));
      },

      async getSettings() {
        requireBackend();
        return settingsFromRow(await run(client.from("store_settings").select("*").eq("id", 1).maybeSingle()));
      },
      async saveSettings(s) {
        requireBackend();
        return settingsFromRow(
          await run(client.from("store_settings").update(settingsToRow(s)).eq("id", 1).select().single())
        );
      },

      /* ---- Team: the super admin adds and removes sub-admins ---- */
      async listTeam() {
        requireBackend();
        const [admins, invites] = await Promise.all([
          run(client.from("admins").select("*").order("created_at")),
          run(client.from("admin_invites").select("*").order("created_at")).catch(() => []),
        ]);
        return {
          admins: (admins || []).map((r) => ({
            userId: r.user_id,
            email: r.email || "",
            role: r.role || "admin",
            createdAt: r.created_at,
          })),
          invites: (invites || []).map((r) => ({ email: r.email, note: r.note || "", createdAt: r.created_at })),
        };
      },
      // Invites are matched on sign-up, so a sub-admin can be added before
      // they have an account — no password ever passes through the browser.
      async inviteAdmin(email, note) {
        requireBackend();
        email = String(email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Please enter a valid email address.");
        const user = await GiftAPI.auth.getUser();
        await run(
          client
            .from("admin_invites")
            .upsert(
              { email, note: String(note || "").trim() || null, invited_by: user ? user.id : null },
              { onConflict: "email" }
            )
        );
        return email;
      },
      async cancelInvite(email) {
        requireBackend();
        await run(client.from("admin_invites").delete().eq("email", String(email).toLowerCase()));
      },
      async removeAdmin(userId) {
        requireBackend();
        await run(client.from("admins").delete().eq("user_id", userId));
      },

      async uploadImage(file) {
        requireBackend();
        if (!file || !/^image\//.test(file.type)) throw new Error("Please choose an image file (JPG, PNG, WebP, GIF or SVG).");
        if (file.size > MAX_IMAGE_BYTES) throw new Error(`"${file.name}" is larger than 5 MB.`);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await run(client.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false }));
        return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      },
      // Best effort: delete files that live in our bucket (ignores other URLs)
      async removeImages(urls) {
        if (!client || !urls || !urls.length) return;
        const marker = `/storage/v1/object/public/${BUCKET}/`;
        const paths = urls
          .filter((u) => typeof u === "string" && u.includes(marker))
          .map((u) => decodeURIComponent(u.split(marker)[1].split("?")[0]));
        if (paths.length) await client.storage.from(BUCKET).remove(paths);
      },
    },
  };

  window.GiftAPI = GiftAPI;
})();
