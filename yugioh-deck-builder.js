import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const SUPABASE_URL = "https://hsxdyxdazsdmpucyhqly.supabase.co";
const PUBLIC_KEY = "sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
const db = createClient(SUPABASE_URL, PUBLIC_KEY);
const $ = (id) => document.getElementById(id);
const ZONES = ["main", "extra", "side"];
const LIMITS = { main: 60, extra: 15, side: 15 };
const ART_BASE = SUPABASE_URL + "/storage/v1/object/public/yugioh-artwork/small/";
const ART_FALLBACK = SUPABASE_URL + "/functions/v1/yugioh-artwork?id=";
const GUEST_KEY = "ctoon-yugioh-guest-deck-v1";
const PAGE_SIZE = 18;

const cardsById = new Map();
const state = { id: null, name: "New Deck", main: [], extra: [], side: [], dirty: false };
let user = null, saved = [], searchPage = 0, searchTotal = 0;
let lastResults = [], searchToken = 0, busy = false, switchingAccount = false;
const artQueue = [];
let activeArt = 0;

function node(tag, css, value) {
  const n = document.createElement(tag);
  if (css) n.className = css;
  if (value !== undefined) n.textContent = String(value);
  return n;
}
function tell(message, isError = false) {
  const el = $("ydb-feedback");
  el.textContent = message;
  el.dataset.error = String(isError);
}
function normalizeId(raw) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function uniqueIds() {
  return [...new Set([...state.main, ...state.extra, ...state.side])];
}
function mainOrExtra(card) {
  return /fusion|synchro|xyz|link/i.test(card?.card_type || "") ? "extra" : "main";
}
function copyCount(id) {
  return ZONES.reduce((sum, zone) => sum + state[zone].filter(x => x === id).length, 0);
}
function size(zone) { return state[zone].length; }
function maxCopies(card) {
  // TCG list information is advisory only. It may change independently of this database.
  const limit = String(card?.card_data?.banlist_info?.ban_tcg || "").toLowerCase();
  if (limit === "banned" || limit === "forbidden") return 0;
  if (limit === "limited") return 1;
  if (limit === "semi-limited") return 2;
  return 3;
}
function canPlace(card, zone, moving = false) {
  if (!card || !ZONES.includes(zone) || ["Skill Card", "Token"].includes(card.card_type)) return false;
  if (size(zone) >= LIMITS[zone]) return false;
  if (zone !== "side" && zone !== mainOrExtra(card)) return false;
  if (!moving && copyCount(Number(card.card_id)) >= 3) return false;
  return true;
}
function guestWrite() {
  if (user) return;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      name: state.name, main: state.main, extra: state.extra, side: state.side
    }));
  } catch (_) { /* optional browser storage */ }
}
function guestRead() {
  try {
    const d = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    if (!d || typeof d !== "object") return false;
    const value = {};
    for (const zone of ZONES) {
      if (!Array.isArray(d[zone])) return false;
      value[zone] = d[zone].map(normalizeId);
      if (value[zone].some(x => x === null) || value[zone].length > LIMITS[zone]) return false;
    }
    const all = [...value.main, ...value.extra, ...value.side];
    if (all.some(id => all.filter(x => x === id).length > 3)) return false;
    Object.assign(state, value, { name: String(d.name || "Guest Deck").slice(0, 80), id: null, dirty: true });
    return true;
  } catch (_) { return false; }
}
function markDirty() {
  state.dirty = true;
  guestWrite();
  render();
}
function resetDeck(name = "New Deck") {
  Object.assign(state, { id: null, name, main: [], extra: [], side: [], dirty: false });
  $("ydb-name").value = name;
  if (!user) guestWrite();
  render();
}
async function loadMetadata(ids) {
  const missing = [...new Set(ids.map(normalizeId).filter(Boolean))].filter(id => !cardsById.has(id));
  if (!missing.length) return;
  for (let i = 0; i < missing.length; i += 80) {
    const group = missing.slice(i, i + 80);
    const { data, error } = await db.from("yugioh_cards")
      .select("card_id,name,card_type,art_image_id,attribute,attack,defense,card_data")
      .in("card_id", group);
    if (error) throw error;
    for (const card of data || []) cardsById.set(Number(card.card_id), card);
  }
}
function artDrain() {
  while (activeArt < 2 && artQueue.length) {
    const job = artQueue.shift();
    if (!job.image.isConnected) continue;
    activeArt++;
    let done = false;
    const timeout = setTimeout(release, 15000);
    function release() {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      activeArt--;
      setTimeout(artDrain, 150);
    }
    job.image.addEventListener("load", release, { once: true });
    job.image.addEventListener("error", release, { once: true });
    job.image.src = ART_FALLBACK + job.id + "&size=small";
  }
}
function picture(card) {
  const box = node("span", "ydb-image");
  const placeholder = node("span", "ydb-image-fallback", "✦");
  placeholder.setAttribute("aria-hidden", "true");
  box.append(placeholder);
  const id = normalizeId(card?.art_image_id);
  if (!id) return box;
  const img = document.createElement("img");
  img.loading = "lazy"; img.decoding = "async"; img.alt = "";
  img.addEventListener("load", () => box.classList.add("ydb-image-ready"));
  let retried = false;
  img.addEventListener("error", () => {
    if (!retried) {
      retried = true;
      artQueue.push({ image: img, id });
      artDrain();
    } else img.remove();
  });
  box.append(img);
  img.src = ART_BASE + id + ".jpg";
  return box;
}
function canMove(id, from, to) {
  return from !== to && state[from].includes(id) && canPlace(cardsById.get(id), to, true);
}
function modifyCard(id, zone, amount) {
  id = normalizeId(id);
  const card = cardsById.get(id);
  if (!id || !ZONES.includes(zone) || !card) return;
  if (amount > 0) {
    if (!canPlace(card, zone)) {
      tell("Cannot add that card: check the zone, deck size and three-copy limit.", true);
      return;
    }
    state[zone].push(id);
  } else {
    const index = state[zone].indexOf(id);
    if (index < 0) return;
    state[zone].splice(index, 1);
  }
  tell("");
  markDirty();
}
function moveOne(id, from, to) {
  if (!canMove(id, from, to)) return;
  state[from].splice(state[from].indexOf(id), 1);
  state[to].push(id);
  tell("");
  markDirty();
}
function renderSearchResults(items) {
  const root = $("ydb-search-results");
  root.replaceChildren();
  if (!items.length) { root.append(node("p", "ydb-empty", "No matching cards. Try a different name or filter.")); return; }
  const frag = document.createDocumentFragment();
  for (const card of items) {
    const id = Number(card.card_id);
    const row = node("article", "ydb-result");
    const info = node("div", "ydb-result-info");
    info.append(node("strong", "", card.name), node("small", "", card.card_type));
    const stats = card.attack == null && card.defense == null
      ? card.attribute || card.archetype || ""
      : "ATK " + (card.attack ?? "?") + " / DEF " + (card.defense ?? "?");
    info.append(node("small", "", stats));
    const actions = node("div", "ydb-result-actions");
    for (const zone of ZONES) {
      if (zone === "main" && mainOrExtra(card) === "extra") continue;
      if (zone === "extra" && mainOrExtra(card) !== "extra") continue;
      const btn = node("button", "", "+ " + zone[0].toUpperCase() + zone.slice(1));
      btn.type = "button";
      btn.disabled = !canPlace(card, zone);
      btn.title = "Add one copy to " + zone + " deck";
      btn.addEventListener("click", () => modifyCard(id, zone, 1));
      actions.append(btn);
    }
    row.append(picture(card), info, actions);
    frag.append(row);
  }
  root.append(frag);
}
function renderZone(zone) {
  const root = $("ydb-" + zone + "-list");
  root.replaceChildren();
  const counts = new Map();
  for (const id of state[zone]) counts.set(id, (counts.get(id) || 0) + 1);
  if (!counts.size) { root.append(node("p", "ydb-empty", "No cards in this deck yet.")); return; }
  const items = [...counts].sort((a,b) =>
    (cardsById.get(a[0])?.name || "").localeCompare(cardsById.get(b[0])?.name || ""));
  const frag = document.createDocumentFragment();
  for (const [id, qty] of items) {
    const card = cardsById.get(id);
    const row = node("div", "ydb-deck-card");
    row.append(picture(card));
    const label = node("span", "ydb-deck-card-name");
    label.append(node("strong", "", card?.name || "Unknown card #" + id));
    label.append(node("small", "", card?.card_type || "Missing from catalog"));
    row.append(label);
    row.append(node("span", "ydb-qty", "×" + qty));
    const actions = node("span", "ydb-deck-controls");
    const minus = node("button", "", "−"); minus.type = "button"; minus.title = "Remove one " + (card?.name || "card");
    minus.setAttribute("aria-label", minus.title);
    minus.addEventListener("click", () => modifyCard(id, zone, -1));
    actions.append(minus);
    const plus = node("button", "", "+"); plus.type = "button"; plus.title = "Add one " + (card?.name || "card");
    plus.setAttribute("aria-label", plus.title); plus.disabled = !canPlace(card, zone);
    plus.addEventListener("click", () => modifyCard(id, zone, 1));
    actions.append(plus);
    const to = zone === "side" ? mainOrExtra(card) : "side";
    if (canMove(id, zone, to)) {
      const move = node("button", "ydb-move", zone === "side" ? "→ " + to : "→ Side");
      move.type = "button"; move.title = "Move a copy to " + to;
      move.addEventListener("click", () => moveOne(id, zone, to));
      actions.append(move);
    }
    row.append(actions);
    frag.append(row);
  }
  root.append(frag);
}
function renderStatus() {
  $("ydb-main-count").textContent = state.main.length + " / 40–60";
  $("ydb-extra-count").textContent = state.extra.length + " / 15";
  $("ydb-side-count").textContent = state.side.length + " / 15";
  const hint = $("ydb-rules-status");
  const total = state.main.length;
  const issues = [];
  if (total < 40) issues.push("Main Deck needs " + (40 - total) + " more cards.");
  if (total > 60) issues.push("Main Deck has too many cards.");
  for (const id of uniqueIds()) {
    const card = cardsById.get(id);
    const limit = maxCopies(card);
    if (copyCount(id) > limit) {
      issues.push((card?.name || "Card #" + id) + " exceeds the imported TCG " +
        (limit === 0 ? "Forbidden" : limit + "-copy") + " limit.");
    }
  }
  hint.classList.toggle("ydb-ready", !issues.length);
  hint.textContent = issues.length ? issues.slice(0, 3).join(" ") +
    (issues.length > 3 ? " +" + (issues.length - 3) + " more warnings." : "")
    : "Deck size ready. Verify the current official TCG list before tournament play.";
}
function render() {
  $("ydb-name").value = state.name;
  $("ydb-save").disabled = !user || busy;
  $("ydb-delete").disabled = !user || !state.id || busy;
  $("ydb-decks").disabled = !user || busy;
  $("ydb-account-status").replaceChildren();
  if (user) {
    $("ydb-account-status").textContent = "Signed in · Save decks to your CTooniverse account" +
      (state.dirty ? " · Unsaved changes" : state.id ? " · Saved" : " · New draft");
  } else {
    $("ydb-account-status").append("Guest draft is kept on this device. ",
      Object.assign(document.createElement("a"), { href: "login.html", textContent: "Sign in to save online." }));
  }
  for (const zone of ZONES) renderZone(zone);
  renderStatus();
  // Reflect current copy counts in the available search results.
  renderSearchResults(lastResults);
}
function updateSavedSelect() {
  const select = $("ydb-decks");
  select.replaceChildren(new Option(user ? "Choose a saved deck…" : "Sign in to load saved decks", ""));
  for (const d of saved) {
    const option = new Option(d.deck_name, d.id);
    select.add(option);
  }
  select.value = state.id && saved.some(x => x.id === state.id) ? state.id : "";
}
async function fetchSaved() {
  if (!user) { saved = []; updateSavedSelect(); return; }
  const { data, error } = await db.from("yugioh_player_decks")
    .select("id,deck_name,main_cards,extra_cards,side_cards,updated_at")
    .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(200);
  if (error) throw error;
  saved = data || [];
  updateSavedSelect();
}
async function openSaved(id) {
  if (state.dirty && !confirm("Discard unsaved changes and load another deck?")) {
    updateSavedSelect();
    return;
  }
  const d = saved.find(x => x.id === id);
  if (!d) { updateSavedSelect(); return; }
  try {
    busy = true;
    const ids = [...(d.main_cards || []), ...(d.extra_cards || []), ...(d.side_cards || [])];
    await loadMetadata(ids);
    Object.assign(state, {
      id: d.id, name: d.deck_name,
      main: (d.main_cards || []).map(Number),
      extra: (d.extra_cards || []).map(Number),
      side: (d.side_cards || []).map(Number),
      dirty: false
    });
    tell("Loaded deck: " + state.name);
  } catch (_) {
    tell("Could not load card information for that deck.", true);
  } finally { busy = false; updateSavedSelect(); render(); }
}
async function saveDeck() {
  if (!user || busy) return;
  const name = state.name.trim().slice(0, 80);
  if (!name) { tell("Enter a deck name first.", true); $("ydb-name").focus(); return; }
  busy = true; render(); tell("Saving deck…");
  try {
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || auth?.user?.id !== user.id) throw new Error("Please sign in again.");
    const payload = {
      deck_name: name, main_cards: state.main, extra_cards: state.extra, side_cards: state.side
    };
    let response;
    if (state.id) {
      response = await db.from("yugioh_player_decks").update(payload)
        .eq("id", state.id).eq("user_id", user.id)
        .select("id,deck_name").single();
    } else {
      response = await db.from("yugioh_player_decks").insert({ ...payload, user_id: user.id })
        .select("id,deck_name").single();
    }
    if (response.error) throw response.error;
    state.id = response.data.id; state.name = name; state.dirty = false;
    await fetchSaved();
    tell("Saved '" + name + "' to your account.");
  } catch (e) {
    tell("Save failed: " + (e.message || "Please retry."), true);
  } finally { busy = false; render(); updateSavedSelect(); }
}
async function deleteDeck() {
  if (!user || !state.id || busy) return;
  if (!confirm("Permanently delete '" + state.name + "' from your account?")) return;
  busy = true; render();
  try {
    const { error } = await db.from("yugioh_player_decks").delete()
      .eq("id", state.id).eq("user_id", user.id);
    if (error) throw error;
    resetDeck();
    await fetchSaved();
    tell("Deck deleted.");
  } catch (e) {
    tell("Could not delete this deck: " + (e.message || "Try again."), true);
  } finally { busy = false; render(); }
}
function ydkText() {
  const lines = ["#created by CTooniverse", "#main"];
  for (const id of state.main) lines.push(String(id));
  lines.push("#extra");
  for (const id of state.extra) lines.push(String(id));
  lines.push("!side");
  for (const id of state.side) lines.push(String(id));
  return lines.join("\n") + "\n";
}
function exportYdk() {
  const url = URL.createObjectURL(new Blob([ydkText()], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = (state.name.replace(/[^a-z0-9 _-]/gi, "").trim() || "ctooniverse-deck").slice(0,60) + ".ydk";
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  tell("Deck exported as a .ydk file.");
}
async function importYdk(file) {
  if (!file) return;
  if (file.size > 30000) { tell("That .ydk file is too large.", true); return; }
  if (state.dirty && !confirm("Replace your current unsaved deck with the imported deck?")) return;
  try {
    const text = await file.text();
    const lists = { main: [], extra: [], side: [] };
    let zone = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line === "#main") { zone = "main"; continue; }
      if (line === "#extra") { zone = "extra"; continue; }
      if (line === "!side") { zone = "side"; continue; }
      if (!line || line.startsWith("#")) continue;
      if (!zone || !/^[0-9]{1,15}$/.test(line)) throw new Error("Invalid .ydk card entry.");
      const id = normalizeId(line);
      if (!id) throw new Error("Invalid card ID in imported deck.");
      lists[zone].push(id);
      if (lists[zone].length > LIMITS[zone]) throw new Error("Imported deck exceeds the " + zone + " deck size.");
    }
    if (!zone) throw new Error("Not a valid .ydk deck file.");
    const all = [...lists.main, ...lists.extra, ...lists.side];
    for (const id of new Set(all)) {
      if (all.filter(x => x === id).length > 3) throw new Error("More than three copies of card #" + id + ".");
    }
    await loadMetadata(all);
    for (const zone of ZONES) for (const id of lists[zone]) {
      const card = cardsById.get(id);
      if (!card) throw new Error("Card #" + id + " is not in the English CTooniverse catalog.");
      if (["Skill Card","Token"].includes(card.card_type)) throw new Error(card.name + " cannot be used in a regular deck.");
      if (zone !== "side" && zone !== mainOrExtra(card))
        throw new Error(card.name + " cannot be in the " + zone + " deck.");
    }
    const safeName = file.name.replace(/\.ydk$/i, "").slice(0,80).trim() || "Imported Deck";
    Object.assign(state, { id:null, name:safeName, ...lists, dirty:true });
    guestWrite();
    render(); updateSavedSelect();
    tell("Imported " + all.length + " cards. Use Save Deck to keep this deck in your account.");
  } catch (e) { tell("Import failed: " + (e.message || "Please verify the file."), true); }
}
async function searchCards() {
  const token = ++searchToken;
  const query = $("ydb-query").value.trim().replace(/[%_]/g, "").slice(0,80);
  const archetype = $("ydb-archetype").value.trim().replace(/[%_]/g,"").slice(0,60);
  const type = $("ydb-type").value;
  const status = $("ydb-results-status");
  status.textContent = "Searching cards…";
  try {
    let q = db.from("yugioh_cards")
      .select("card_id,name,card_type,art_image_id,attribute,attack,defense,archetype,card_data", { count: "exact" })
      .order("name", { ascending: true })
      .range(searchPage * PAGE_SIZE, (searchPage+1) * PAGE_SIZE-1);
    if (query) q = q.ilike("name", "%" + query + "%");
    if (archetype) q = q.ilike("archetype", "%" + archetype + "%");
    q = q.neq("card_type", "Skill Card").neq("card_type", "Token");
    if (type === "monster") q = q.ilike("card_type", "%Monster%");
    else if (type === "spell") q = q.eq("card_type", "Spell Card");
    else if (type === "trap") q = q.eq("card_type", "Trap Card");
    else if (type === "extra") q = q.or("card_type.ilike.%Fusion%,card_type.ilike.%Synchro%,card_type.ilike.%XYZ%,card_type.ilike.%Link%");
    const { data, count, error } = await q;
    if (token !== searchToken) return;
    if (error) throw error;
    lastResults = data || [];
    for (const c of lastResults) cardsById.set(Number(c.card_id), c);
    searchTotal = count || 0;
    renderSearchResults(lastResults);
    status.textContent = searchTotal.toLocaleString() + " matching cards";
    $("ydb-page").textContent = "Page " + (searchPage+1);
    $("ydb-prev").disabled = searchPage === 0;
    $("ydb-next").disabled = (searchPage+1) * PAGE_SIZE >= searchTotal;
  } catch (_) {
    if (token !== searchToken) return;
    lastResults = []; searchTotal = 0;
    $("ydb-search-results").replaceChildren(node("p","ydb-empty","Could not load the card catalog. Please retry."));
    status.textContent = "Card search unavailable";
    $("ydb-next").disabled = true;
  }
}
async function init() {
  try {
    const { data, error } = await db.auth.getUser();
    user = error ? null : data.user;
  } catch (_) { user = null; }
  if (!user && guestRead()) {
    try { await loadMetadata(uniqueIds()); } catch (_) {}
  }
  try { await fetchSaved(); }
  catch (_) { tell("Saved decks are temporarily unavailable. Try reloading.", true); }
  render();
  await searchCards();
}
db.auth.onAuthStateChange((event, session) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
  if (switchingAccount) return;
  switchingAccount = true;
  // Defer all database requests until the auth state callback has returned.
  setTimeout(async () => {
    try {
      const nextUser = session?.user || null;
      if (nextUser?.id === user?.id) return;
      if (!nextUser) {
        user = null; saved = []; resetDeck(); guestRead();
        try { await loadMetadata(uniqueIds()); } catch (_) {}
      } else {
        user = nextUser; saved = [];
        if (state.id) resetDeck();
      }
      await fetchSaved();
      render();
    } catch (_) { tell("Unable to refresh your saved decks.", true); }
    finally { switchingAccount = false; }
  }, 0);
});
$("ydb-search").addEventListener("submit", e => { e.preventDefault(); searchPage = 0; searchCards(); });
$("ydb-reset-search").addEventListener("click", () => {
  $("ydb-search").reset(); searchPage = 0; searchCards();
});
$("ydb-prev").addEventListener("click", () => { if (searchPage > 0) { searchPage--; searchCards(); } });
$("ydb-next").addEventListener("click", () => {
  if ((searchPage+1)*PAGE_SIZE < searchTotal) { searchPage++; searchCards(); }
});
$("ydb-name").addEventListener("input", e => {
  state.name = e.target.value.slice(0,80); state.dirty = true; guestWrite();
  const status = $("ydb-account-status");
  if (user) status.textContent = "Signed in · Unsaved changes";
});
$("ydb-new").addEventListener("click", () => {
  if (state.dirty && !confirm("Discard unsaved changes and start a new deck?")) return;
  resetDeck(); updateSavedSelect(); tell("New deck ready.");
});
$("ydb-save").addEventListener("click", saveDeck);
$("ydb-delete").addEventListener("click", deleteDeck);
$("ydb-export").addEventListener("click", exportYdk);
$("ydb-import").addEventListener("change", e => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) importYdk(file);
});
$("ydb-decks").addEventListener("change", e => {
  if (e.target.value) openSaved(e.target.value);
});
window.addEventListener("beforeunload", e => {
  if (user && state.dirty) { e.preventDefault(); e.returnValue = ""; }
});
init();
