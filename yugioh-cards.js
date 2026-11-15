"use strict";
(() => {
  const API_ROOT = "https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/";
  // Supabase publishable browser key. No secret/service-role credentials are used in this page.
  const PUBLIC_KEY = "sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
  const PAGE_SIZE = 24;
  const $ = (id) => document.getElementById(id);
  const grid = $("yc-grid");
  const form = $("yc-search-form");
  const status = $("yc-result-status");
  const pageLabel = $("yc-page-label");
  const range = $("yc-range");
  const prev = $("yc-prev");
  const next = $("yc-next");
  const dialog = $("yc-dialog");
  const detail = $("yc-detail");
  let page = 0;
  let total = 0;
  let pending = null;
  let active = { name: "", category: "", archetype: "", attribute: "" };

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = String(content);
    return node;
  }
  function formatNumber(value) {
    return value == null || value === "" ? "—" : Number(value).toLocaleString();
  }
  function filterText(value) {
    // Avoid sending PostgREST filter control characters from user input.
    return value.trim().replace(/[%*_(),.]/g, " ").replace(/\s+/g, "*").slice(0, 80);
  }
  function textOrDash(value) {
    return value == null || value === "" ? "—" : String(value);
  }
  async function request(url, signal) {
    const response = await fetch(url, {
      headers: { apikey: PUBLIC_KEY, Prefer: "count=exact" },
      cache: "no-store",
      signal
    });
    if (!response.ok) throw new Error("Database request failed (" + response.status + ")");
    return { rows: await response.json(), count: response.headers.get("content-range") };
  }
  function readInputs() {
    return {
      name: $("yc-name").value,
      category: $("yc-category").value,
      archetype: $("yc-archetype").value,
      attribute: $("yc-attribute").value
    };
  }
  function queryUrl() {
    const url = new URL(API_ROOT + "yugioh_cards");
    url.searchParams.set("select", "card_id,name,card_type,description,race,attribute,archetype,level,attack,defense");
    url.searchParams.set("order", "name.asc,card_id.asc");
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(page * PAGE_SIZE));
    const name = filterText(active.name);
    const archetype = filterText(active.archetype);
    if (name) url.searchParams.set("name", "ilike.*" + name + "*");
    if (archetype) url.searchParams.set("archetype", "ilike.*" + archetype + "*");
    if (active.attribute) url.searchParams.set("attribute", "eq." + active.attribute);
    if (active.category === "monster") url.searchParams.set("card_type", "ilike.*Monster*");
    if (active.category === "spell") url.searchParams.set("card_type", "eq.Spell Card");
    if (active.category === "trap") url.searchParams.set("card_type", "eq.Trap Card");
    return url.toString();
  }
  function displayCards(cards) {
    grid.replaceChildren();
    if (!cards.length) {
      grid.append(el("p", "yc-empty", "No cards match these filters. Try a different card name or archetype."));
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const card of cards) {
      const button = el("button", "yc-card");
      button.type = "button";
      button.setAttribute("aria-label", "View details for " + card.name);
      const top = el("span", "yc-card-top");
      top.append(el("strong", "", card.name), el("small", "", card.card_type));
      const art = el("span", "yc-placeholder", card.card_type.includes("Spell") ? "✦" : card.card_type.includes("Trap") ? "⬡" : "★");
      art.setAttribute("aria-hidden", "true");
      const meta = el("span", "yc-card-meta");
      meta.append(el("span", "", card.attribute || card.race || card.archetype || "Yu-Gi-Oh!"));
      if (card.attack != null || card.defense != null) meta.append(el("strong", "", "ATK " + formatNumber(card.attack) + " · DEF " + formatNumber(card.defense)));
      else meta.append(el("strong", "", card.card_type));
      const excerpt = el("span", "yc-card-desc", card.description || "View card details");
      button.append(top, art, meta, excerpt);
      button.addEventListener("click", () => openDetail(card.card_id));
      fragment.append(button);
    }
    grid.append(fragment);
  }
  async function loadCards() {
    if (pending) pending.abort();
    const controller = new AbortController();
    pending = controller;
    status.textContent = "Searching the catalog…";
    grid.setAttribute("aria-busy", "true");
    prev.disabled = true;
    next.disabled = true;
    try {
      const { rows, count } = await request(queryUrl(), controller.signal);
      if (pending !== controller) return;
      total = Number((count || "").split("/").pop());
      if (!Number.isFinite(total) || total < 0) total = rows.length + page * PAGE_SIZE;
      const first = total ? page * PAGE_SIZE + 1 : 0;
      const last = total ? Math.min((page * PAGE_SIZE) + rows.length, total) : 0;
      displayCards(rows);
      status.textContent = total.toLocaleString() + " matching cards";
      range.textContent = first.toLocaleString() + "–" + last.toLocaleString() + " of " + total.toLocaleString();
      pageLabel.textContent = "PAGE " + (page + 1);
      prev.disabled = page === 0;
      next.disabled = last >= total || rows.length < PAGE_SIZE;
    } catch (error) {
      if (error.name === "AbortError") return;
      grid.replaceChildren(el("p", "yc-empty", "The card database is temporarily unavailable. Please try again."));
      status.textContent = "Could not load cards.";
      range.textContent = "—";
    } finally {
      if (pending === controller) {
        pending = null;
        grid.removeAttribute("aria-busy");
      }
    }
  }
  function detailLine(label, value, parent) {
    if (value == null || value === "") return;
    const item = el("div", "yc-detail-field");
    item.append(el("dt", "", label), el("dd", "", value));
    parent.append(item);
  }
  async function openDetail(id) {
    detail.replaceChildren(el("p", "", "Loading card details…"));
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    const url = new URL(API_ROOT + "yugioh_cards");
    url.searchParams.set("select", "*");
    url.searchParams.set("card_id", "eq." + Number(id));
    url.searchParams.set("limit", "1");
    try {
      const result = await request(url.toString());
      if (!dialog.open) return;
      const card = result.rows[0];
      if (!card) throw new Error("Card not found");
      const raw = card.card_data || {};
      detail.replaceChildren();
      const title = el("h2", "", card.name);
      title.id = "yc-detail-title";
      detail.append(title, el("p", "yc-detail-type", card.card_type + (raw.humanReadableCardType ? " · " + raw.humanReadableCardType : "")));
      const info = el("dl", "yc-detail-grid");
      detailLine("Card ID", card.card_id, info);
      detailLine("Attribute", card.attribute, info);
      detailLine("Monster type", card.race, info);
      detailLine("Archetype", card.archetype, info);
      detailLine("Level / Rank", card.level, info);
      detailLine("ATK", card.attack, info);
      detailLine("DEF", card.defense, info);
      detailLine("Link rating", raw.linkval, info);
      detailLine("Pendulum scale", raw.scale, info);
      if (raw.banlist_info) {
        const b = Object.entries(raw.banlist_info).map(([key, value]) => key.replaceAll("_", " ") + ": " + value).join(" · ");
        detailLine("Banlist status", b, info);
      }
      detail.append(info, el("h3", "", "Card text"), el("p", "yc-effect", card.description || "No effect text available."));
      if (Array.isArray(raw.card_sets) && raw.card_sets.length) {
        detail.append(el("h3", "", "Card sets"));
        const sets = el("ul", "yc-set-list");
        for (const set of raw.card_sets.slice(0, 8)) {
          sets.append(el("li", "", [set.set_name, set.set_code, set.set_rarity].filter(Boolean).join(" · ")));
        }
        detail.append(sets);
        if (raw.card_sets.length > 8) detail.append(el("small", "", "Plus " + (raw.card_sets.length - 8) + " additional printings."));
      }
    } catch (_) {
      if (dialog.open) detail.replaceChildren(el("h2", "", "Card details"), el("p", "", "Could not load this card. Try again."));
    }
  }
  async function loadCount() {
    try {
      const result = await request(API_ROOT + "yugioh_catalog_status?select=imported_cards,last_imported_at,source&id=eq.1");
      const row = result.rows[0];
      if (!row) throw new Error("No status");
      const date = row.last_imported_at ? new Date(row.last_imported_at).toLocaleDateString() : "not yet";
      $("yc-source").textContent = formatNumber(row.imported_cards) + " cards imported · Updated " + date + " · Source: " + row.source;
    } catch (_) {
      $("yc-source").textContent = "Search the Yu-Gi-Oh! card reference database.";
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    active = readInputs();
    page = 0;
    loadCards();
  });
  $("yc-clear").addEventListener("click", () => {
    form.reset();
    active = readInputs();
    page = 0;
    loadCards();
  });
  prev.addEventListener("click", () => { if (page > 0) { page--; loadCards(); } });
  next.addEventListener("click", () => { if ((page + 1) * PAGE_SIZE < total) { page++; loadCards(); } });
  $("yc-close").addEventListener("click", () => { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  loadCount();
  loadCards();
})();
