"use strict";

const STORAGE_KEY = "wheredidiputit.items.v1";
const LANG_KEY = "wheredidiputit.lang";
const VIEW_KEY = "wheredidiputit.view";

const I18N = {
  nb: {
    add: "Legg til", search: "Søk etter navn, sted, spill …", allTypes: "Alle typer",
    allCats: "Alle kategorier", physical: "Fysisk", game: "Spill", cards: "Kort", list: "Liste",
    empty: "Ingen ting funnet.", name: "Navn", type: "Type", category: "Kategori",
    description: "Beskrivelse (valgfri)", location: "Plassering", room: "Rom", furniture: "Møbel",
    spot: "Detaljert sted", gameName: "Spill", account: "Kontonavn / kallenavn", character: "Karakter",
    container: "Inventory / stash / stash-tab", cancel: "Avbryt", save: "Lagre", edit: "Rediger",
    del: "Slett", addTitle: "Ny ting", editTitle: "Rediger ting", confirmDel: "Slette «{n}»?",
    photo: "Bilde (valgfritt) – eller lim inn med Ctrl+V", removePhoto: "Fjern bilde", badImage: "Kunne ikke lese bildet.",
    storageFull: "Kunne ikke lagre. Nettleserlagringen er full – bruk serveren (start.bat) eller færre bilder.",
    quantity: "Mengde", savedFile: "lagret i data.json", savedBrowser: "lagret i nettleseren",
    saveFailed: "Kunne ikke lagre til data.json. Kjører serveren?",
    allGames: "Alle spill", allRooms: "Alle rom", sortName: "Sorter: navn", sortPlace: "Sorter: spill / rom",
    sortCat: "Sorter: kategori", sortNew: "Sorter: nyeste",
    count: "{n} av {t} ting", noLocation: "Ingen plassering registrert", account_: "Konto", char_: "Karakter",
  },
  en: {
    add: "Add", search: "Search name, place, game …", allTypes: "All types",
    allCats: "All categories", physical: "Physical", game: "Game", cards: "Cards", list: "List",
    empty: "No items found.", name: "Name", type: "Type", category: "Category",
    description: "Description (optional)", location: "Location", room: "Room", furniture: "Furniture",
    spot: "Specific spot", gameName: "Game", account: "Account / nickname", character: "Character",
    container: "Inventory / stash / stash tab", cancel: "Cancel", save: "Save", edit: "Edit",
    del: "Delete", addTitle: "New item", editTitle: "Edit item", confirmDel: "Delete \"{n}\"?",
    photo: "Photo (optional) – or paste with Ctrl+V", removePhoto: "Remove photo", badImage: "Could not read the image.",
    storageFull: "Could not save. Browser storage is full – use the server (start.bat) or fewer photos.",
    quantity: "Quantity", savedFile: "saved in data.json", savedBrowser: "saved in the browser",
    saveFailed: "Could not save to data.json. Is the server running?",
    allGames: "All games", allRooms: "All rooms", sortName: "Sort: name", sortPlace: "Sort: game / room",
    sortCat: "Sort: category", sortNew: "Sort: newest",
    count: "{n} of {t} items", noLocation: "No location recorded", account_: "Account", char_: "Character",
  },
};

const SAMPLE_ITEMS = [
  { name: "Pass", type: "physical", category: "Dokumenter", description: "Gyldig til 2031",
    room: "Soverom", furniture: "Kommode", spot: "Øverste skuff" },
  { name: "Skrutrekkersett", type: "physical", category: "Verktøy", description: "",
    room: "Gang", furniture: "Hylle", spot: "Nederste brett" },
  { name: "Ekstra HDMI-kabel", type: "physical", category: "Elektronikk", description: "2 meter",
    room: "Stue", furniture: "TV-benk", spot: "Skuff til høyre" },
  { name: "Headhunter-belte", type: "game", category: "Utstyr", description: "Bra til bossing",
    game: "Path of Exile", account: "PlayerOne", character: "Ranger_01", container: "Stash-tab 3 (Gear)" },
  { name: "Divine Orb", quantity: 12, type: "game", category: "Valuta", description: "",
    game: "Path of Exile", account: "PlayerOne", character: "", container: "Currency stash" },
  { name: "Ekstra healing potions", type: "game", category: "Forbruksvarer", description: "",
    game: "Skyrim", account: "Dovahkiin", character: "Lydia-save", container: "Inventory" },
];

let state = { items: [], lang: "nb", view: "cards", editingId: null };
const $ = (id) => document.getElementById(id);

const t = (key, vars = {}) =>
  (I18N[state.lang][key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k]);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- storage ---------- */
// With server.js running, items live in data.json; otherwise they fall back to browser storage.
let fileMode = false;

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) { /* none stored */ }
  return null;
}

async function load() {
  try {
    const res = await fetch("api/items", { cache: "no-store" });
    if (res.ok || res.status === 404) {
      fileMode = true;
      if (res.ok) return await res.json();
      // First run with the server: carry over browser data if any, else start with samples.
      const items = loadLocal() || SAMPLE_ITEMS.map((s) => ({ id: newId(), ...s }));
      save(items);
      return items;
    }
  } catch (e) { /* no server (e.g. opened from file://) */ }
  const items = loadLocal() || SAMPLE_ITEMS.map((s) => ({ id: newId(), ...s }));
  save(items);
  return items;
}

function save(items = state.items) {
  const json = JSON.stringify(items, null, 2);
  if (fileMode) {
    fetch("api/items", { method: "PUT", headers: { "Content-Type": "application/json" }, body: json })
      .then((res) => { if (!res.ok) throw new Error(res.status); })
      .catch(() => alert(t("saveFailed")));
    return;
  }
  try { localStorage.setItem(STORAGE_KEY, json); } catch (e) { alert(t("storageFull")); }
}

/* ---------- photos ---------- */
// Photos are shrunk to a small JPEG and stored inside the item as a data URL.
function shrinkImage(file, maxSize = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

function showPhoto() {
  $("photo-preview").hidden = !state.photo;
  $("photo-remove").hidden = !state.photo;
  if (state.photo) $("photo-preview").src = state.photo;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- rendering ---------- */
function applyI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  $("lang-btn").textContent = state.lang === "nb" ? "EN" : "NO";
}

function categories() {
  return [...new Set(state.items.map((i) => i.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, state.lang));
}

function uniqueValues(field) {
  return [...new Set(state.items.map((i) => i[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, state.lang));
}

function fillSelect(selectId, allLabel, options) {
  const select = $(selectId);
  const current = select.value || "all";
  select.innerHTML = `<option value="all">${esc(allLabel)}</option>` +
    options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
  select.value = options.some((o) => o.value === current) ? current : "all";
}

function fillList(listId, labels) {
  $(listId).innerHTML = [...new Set(labels)].map((v) => `<option value="${esc(v)}">`).join("");
}

function renderCategoryOptions() {
  const plain = (field) => uniqueValues(field).map((v) => ({ value: v, label: v }));
  fillSelect("filter-cat", t("allCats"), plain("category"));
  fillList("cat-list", uniqueValues("category"));
  fillSelect("filter-game", t("allGames"), plain("game"));
  fillSelect("filter-room", t("allRooms"), plain("room"));
  fillList("game-list", uniqueValues("game"));
  fillList("room-list", uniqueValues("room"));
  const type = $("filter-type").value;
  $("filter-game").hidden = type === "physical";
  $("filter-room").hidden = type === "game";
}

function locationParts(item) {
  return item.type === "physical"
    ? [item.room, item.furniture, item.spot].filter(Boolean)
    : [item.game, item.container].filter(Boolean);
}

function locationHtml(item) {
  const parts = locationParts(item);
  let html = parts.length
    ? parts.map(esc).join('<span class="sep">→</span>')
    : `<span class="sep">${esc(t("noLocation"))}</span>`;
  if (item.type === "game") {
    const extra = [];
    if (item.account) extra.push(`${t("account_")}: ${item.account}`);
    if (item.character) extra.push(`${t("char_")}: ${item.character}`);
    if (extra.length) html += `<small>${esc(extra.join(" · "))}</small>`;
  }
  return html;
}

function searchText(item) {
  return [item.name, item.category, item.description, item.room, item.furniture, item.spot,
    item.game, item.account, item.character, item.container].join(" ").toLowerCase();
}

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const type = $("filter-type").value;
  const cat = $("filter-cat").value;
  const game = $("filter-game").value;
  const room = $("filter-room").value;
  const sort = $("sort").value;
  const cmp = (a, b) => a.localeCompare(b, state.lang);
  const place = (i) => (i.type === "game" ? i.game : i.room) || "";
  const order = new Map(state.items.map((i, idx) => [i.id, idx]));
  return state.items
    .filter((i) => (type === "all" || i.type === type) && (cat === "all" || i.category === cat))
    .filter((i) => (game === "all" || i.game === game) && (room === "all" || i.room === room))
    .filter((i) => !q || searchText(i).includes(q))
    .sort((a, b) => {
      if (sort === "newest") return order.get(b.id) - order.get(a.id);
      if (sort === "category") return cmp(a.category, b.category) || cmp(a.name, b.name);
      if (sort === "place") return cmp(place(a), place(b)) || cmp(a.name, b.name);
      return cmp(a.name, b.name);
    });
}

function render() {
  renderCategoryOptions();
  const items = filtered();
  const box = $("results");
  box.className = "results " + state.view;
  $("view-cards").classList.toggle("active", state.view === "cards");
  $("view-list").classList.toggle("active", state.view === "list");
  $("count").textContent = t("count", { n: items.length, t: state.items.length }) +
    " · " + t(fileMode ? "savedFile" : "savedBrowser");
  $("empty").hidden = items.length > 0;
  box.innerHTML = items.map((i) => `
    <article class="item ${i.type}" data-id="${esc(i.id)}">
      ${i.image ? `<img class="thumb" src="${esc(i.image)}" alt="${esc(i.name)}">` : ""}
      <div class="main">
        <h3>${esc(i.name)}${(i.quantity || 1) > 1 ? ` <span class="qty">×${esc(i.quantity)}</span>` : ""}</h3>
        <div class="badges">
          <span class="badge ${i.type}">${esc(t(i.type))}</span>
          <span class="badge">${esc(i.category)}</span>
        </div>
        ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ""}
      </div>
      <div class="location">${locationHtml(i)}</div>
      <div class="actions">
        <button class="btn small" data-act="edit" type="button">${esc(t("edit"))}</button>
        <button class="btn small danger" data-act="delete" type="button">${esc(t("del"))}</button>
      </div>
    </article>`).join("");
}

/* ---------- dialog ---------- */
function toggleTypeFields() {
  const game = $("f-type").value === "game";
  $("fs-physical").hidden = game;
  $("fs-game").hidden = !game;
}

function openDialog(item) {
  state.editingId = item ? item.id : null;
  $("dialog-title").textContent = t(item ? "editTitle" : "addTitle");
  const v = item || { type: "physical" };
  $("f-name").value = v.name || "";
  $("f-qty").value = v.quantity || 1;
  state.photo = v.image || null;
  $("f-photo").value = "";
  showPhoto();
  $("f-type").value = v.type;
  $("f-cat").value = v.category || "";
  $("f-desc").value = v.description || "";
  $("f-room").value = v.room || "";
  $("f-furniture").value = v.furniture || "";
  $("f-spot").value = v.spot || "";
  $("f-game").value = v.game || "";
  $("f-account").value = v.account || "";
  $("f-character").value = v.character || "";
  $("f-container").value = v.container || "";
  toggleTypeFields();
  $("dialog").showModal();
  $("f-name").focus();
}

function readForm() {
  const val = (id) => $(id).value.trim();
  const item = { name: val("f-name"), type: $("f-type").value, category: val("f-cat"), description: val("f-desc"),
    quantity: Math.max(1, Math.floor(Number($("f-qty").value)) || 1) };
  if (state.photo) item.image = state.photo;
  if (item.type === "physical") {
    Object.assign(item, { room: val("f-room"), furniture: val("f-furniture"), spot: val("f-spot") });
  } else {
    Object.assign(item, { game: val("f-game"), account: val("f-account"),
      character: val("f-character"), container: val("f-container") });
  }
  return item;
}

function onSubmit(e) {
  e.preventDefault();
  const data = readForm();
  if (!data.name || !data.category) return;
  if (state.editingId) {
    state.items = state.items.map((i) => (i.id === state.editingId ? { id: i.id, ...data } : i));
  } else {
    state.items.push({ id: newId(), ...data });
  }
  save();
  $("dialog").close();
  render();
}

/* ---------- setup ---------- */
async function init() {
  try {
    state.lang = (navigator.language || "nb").startsWith("en") ? "en" : "nb";
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang) state.lang = savedLang;
    state.view = localStorage.getItem(VIEW_KEY) || "cards";
  } catch (e) { /* defaults */ }
  state.items = await load();

  applyI18n();
  render();

  $("add-btn").addEventListener("click", () => openDialog(null));
  $("cancel-btn").addEventListener("click", () => $("dialog").close());
  // Shortcut: Ctrl+S or Ctrl+Enter saves the open form
  window.addEventListener("keydown", (e) => {
    if (!$("dialog").open || !(e.ctrlKey || e.metaKey)) return;
    if (e.code === "KeyS" || e.key.toLowerCase() === "s" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      $("form").requestSubmit();
    }
  }, true);
  // Shortcut: press N (when not typing in a field or with a dialog open) to add a new item
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (document.querySelector("dialog[open]") || e.target.closest("input, textarea, select")) return;
    e.preventDefault();
    openDialog(null);
  });
  $("form").addEventListener("submit", onSubmit);
  $("f-type").addEventListener("change", toggleTypeFields);
  const setPhoto = async (file) => {
    try {
      state.photo = await shrinkImage(file);
      showPhoto();
    } catch (err) {
      alert(t("badImage"));
    }
  };
  $("f-photo").addEventListener("change", (e) => { if (e.target.files[0]) setPhoto(e.target.files[0]); });
  // Ctrl+V with an image on the clipboard, while the form is open
  document.addEventListener("paste", (e) => {
    if (!$("dialog").open) return;
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    setPhoto(file);
  });
  $("photo-remove").addEventListener("click", () => {
    state.photo = null;
    $("f-photo").value = "";
    showPhoto();
  });
  ["search", "filter-type", "filter-cat", "filter-game", "filter-room", "sort"].forEach((id) => $(id).addEventListener("input", render));

  $("lang-btn").addEventListener("click", () => {
    state.lang = state.lang === "nb" ? "en" : "nb";
    try { localStorage.setItem(LANG_KEY, state.lang); } catch (e) { /* ignore */ }
    applyI18n();
    render();
  });

  [["view-cards", "cards"], ["view-list", "list"]].forEach(([id, view]) =>
    $(id).addEventListener("click", () => {
      state.view = view;
      try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* ignore */ }
      render();
    }));

  $("lightbox").addEventListener("click", () => $("lightbox").close());
  $("results").addEventListener("click", (e) => {
    if (e.target.classList.contains("thumb")) {
      $("lightbox-img").src = e.target.src;
      $("lightbox").showModal();
      return;
    }
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.closest(".item").dataset.id;
    const item = state.items.find((i) => i.id === id);
    if (btn.dataset.act === "edit") openDialog(item);
    else if (confirm(t("confirmDel", { n: item.name }))) {
      state.items = state.items.filter((i) => i.id !== id);
      save();
      render();
    }
  });
}

init();
