// ============================================
// LEXICON — App Logic
// ============================================

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const els = {
  views: document.querySelectorAll(".view"),
  toggleBtns: document.querySelectorAll(".toggle-btn"),
  entryList: document.getElementById("entry-list"),
  azRail: document.getElementById("az-rail"),
  categoryGrid: document.getElementById("category-grid"),
  categoryDetailTitle: document.getElementById("category-detail-title"),
  categoryDetailDesc: document.getElementById("category-detail-desc"),
  categoryEntryList: document.getElementById("category-entry-list"),
  entryPageContent: document.getElementById("entry-page-content"),
  backToCategories: document.getElementById("back-to-categories"),
  backFromEntry: document.getElementById("back-from-entry"),
  searchBtn: document.getElementById("search-btn"),
  searchInput: document.getElementById("search-input"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  searchCancelBtn: document.getElementById("search-cancel-btn"),
  searchResults: document.getElementById("search-results"),
  searchEmptyState: document.getElementById("search-empty-state"),
  brandHomeBtn: document.getElementById("brand-home-btn"),
  featuredCardStage: document.getElementById("featured-card-stage"),
  recentList: document.getElementById("recent-list"),
  recentEmptyState: document.getElementById("recent-empty-state"),
};

let activeCategoryId = null;
let cameFromView = "view-home";

// ---------- Helpers ----------
function categoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

// ---------- Recently learned (persisted) ----------
const RECENT_KEY = "lexicon:recentlyViewed";
const RECENT_MAX = 5;

function loadRecentWords() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRecentWords(words) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(words));
  } catch (e) {
    // storage unavailable (e.g. private browsing) — fail silently, recent list just won't persist
  }
}

function recordRecentlyViewed(word) {
  let words = loadRecentWords();
  words = words.filter(w => w !== word); // dedupe, move to front if already present
  words.unshift(word);
  words = words.slice(0, RECENT_MAX);
  saveRecentWords(words);
  renderRecent();
}

function getRandomEntries(n, excludeWords = []) {
  const pool = ENTRIES.filter(e => !excludeWords.includes(e.word));
  const source = pool.length >= n ? pool : ENTRIES;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function sortedEntries(list) {
  return [...list].sort((a, b) => a.word.localeCompare(b.word));
}

function groupByLetter(list) {
  const groups = {};
  sortedEntries(list).forEach(entry => {
    const letter = entry.word[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(entry);
  });
  return groups;
}

function entryRowHTML(entry) {
  const cat = categoryById(entry.category);
  return `
    <div class="entry-row" tabindex="0" data-word="${entry.word}" role="button">
      <span class="entry-dot accent-dot-${cat.accent}"></span>
      <div class="entry-row-main">
        <span class="entry-headword">${entry.word}<span class="entry-tag accent-text-${cat.accent}">${cat.tag}</span></span>
        <span class="entry-preview">${entry.description.split(". ")[0]}.</span>
      </div>
      <svg class="entry-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </div>
  `;
}

// ---------- Render: A-Z view ----------
function renderAtoZ() {
  const groups = groupByLetter(ENTRIES);
  let html = "";
  ALPHABET.forEach(letter => {
    if (groups[letter]) {
      html += `<div class="letter-group-heading" id="letter-${letter}"><span class="letter-glyph">${letter}</span><span class="letter-rule"></span></div>`;
      groups[letter].forEach(entry => { html += entryRowHTML(entry); });
    }
  });
  els.entryList.innerHTML = html;
  attachEntryRowListeners(els.entryList, ENTRIES, "view-atoz");
  renderAZRail(groups);
}

function renderAZRail(groups) {
  els.azRail.innerHTML = ALPHABET.map(letter => {
    const has = !!groups[letter];
    return `<div class="az-rail-letter ${has ? "has-entries" : ""}" data-letter="${letter}">${letter}</div>`;
  }).join("");

  els.azRail.querySelectorAll(".az-rail-letter.has-entries").forEach(el => {
    el.addEventListener("click", () => {
      const target = document.getElementById(`letter-${el.dataset.letter}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// Scroll-spy for the rail: highlight current letter
function setupScrollSpy() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const letter = entry.target.id.replace("letter-", "");
        els.azRail.querySelectorAll(".az-rail-letter").forEach(el => {
          el.classList.toggle("current", el.dataset.letter === letter);
        });
      }
    });
  }, { rootMargin: "-10% 0px -70% 0px" });

  document.querySelectorAll(".letter-group-heading").forEach(h => observer.observe(h));
}

// ---------- Render: Category grid ----------
function renderCategoryGrid() {
  els.categoryGrid.innerHTML = CATEGORIES.map((cat) => {
    const count = ENTRIES.filter(e => e.category === cat.id).length;
    const initial = cat.name[0];
    return `
      <div class="category-card accent-${cat.accent}" tabindex="0" role="button" data-category="${cat.id}">
        <div class="category-card-left">
          <span class="category-icon">${initial}</span>
          <div class="category-info">
            <span class="category-name">${cat.name}</span>
            <span class="category-meta">${cat.description}</span>
          </div>
        </div>
        <span class="category-count">${count}</span>
      </div>
    `;
  }).join("");

  els.categoryGrid.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => openCategory(card.dataset.category));
    card.addEventListener("keydown", e => { if (e.key === "Enter") openCategory(card.dataset.category); });
  });
}

function openCategory(catId) {
  stopFeaturedRotation();
  activeCategoryId = catId;
  const cat = categoryById(catId);
  const entries = ENTRIES.filter(e => e.category === catId);

  els.categoryDetailTitle.textContent = cat.name;
  els.categoryDetailDesc.textContent = cat.description;

  const groups = groupByLetter(entries);
  let html = "";
  ALPHABET.forEach(letter => {
    if (groups[letter]) {
      html += `<div class="letter-group-heading"><span class="letter-glyph">${letter}</span><span class="letter-rule"></span></div>`;
      groups[letter].forEach(entry => { html += entryRowHTML(entry); });
    }
  });
  els.categoryEntryList.innerHTML = html;
  attachEntryRowListeners(els.categoryEntryList, entries, "view-category-detail");

  switchView("view-category-detail");
}

// ---------- Render: Entry page ----------
function attachEntryRowListeners(container, list, originView) {
  container.querySelectorAll(".entry-row").forEach(row => {
    const open = () => openEntry(row.dataset.word, list, originView);
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
  });
}

function openEntry(word, list, originView) {
  stopFeaturedRotation();
  const entry = list.find(e => e.word === word) || ENTRIES.find(e => e.word === word);
  const cat = categoryById(entry.category);
  cameFromView = originView;

  els.entryPageContent.innerHTML = `
    <span class="entry-page-tag">${cat.name}</span>
    <h1 class="entry-page-headword">${entry.word}</h1>
    <div class="entry-page-letter-rule">
      <span class="rule-letter">${entry.word[0].toUpperCase()}</span>
      <span class="rule-line"></span>
    </div>
    <p class="entry-page-body">${entry.description}</p>
  `;
  switchView("view-entry");
  els.entryPageContent.closest(".entry-page").scrollTop = 0;
  window.scrollTo(0, 0);
  recordRecentlyViewed(entry.word);
}

// ---------- Home: Featured card rotation ----------
const FEATURED_ROTATE_MS = 5000;
const FEATURED_POOL_SIZE = 5;
let featuredPool = [];
let featuredIndex = 0;
let featuredTimer = null;

function buildFeaturedPool() {
  featuredPool = getRandomEntries(FEATURED_POOL_SIZE);
  featuredIndex = 0;
}

function featuredCardHTML(entry) {
  const cat = categoryById(entry.category);
  return `
    <div class="featured-card" tabindex="0" role="button" data-word="${entry.word}">
      <div class="featured-card-top">
        <span class="featured-card-tag" style="background:var(--acc-${cat.accent}-bg); color:var(--acc-${cat.accent});">${cat.tag}</span>
        <span class="featured-card-random-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5M21 3l-9 9M21 16v5h-5M3 8V3h5M3 16v5h5M8 21l9-9"/></svg>
          Discover
        </span>
      </div>
      <h2 class="featured-card-headword">${entry.word}</h2>
      <p class="featured-card-desc">${entry.description}</p>
      <span class="featured-card-cta">
        Read the full entry
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
      </span>
      <div class="featured-progress">
        ${featuredPool.map((_, i) => `<span class="featured-progress-dot ${i === featuredIndex ? "current" : ""}"></span>`).join("")}
      </div>
    </div>
  `;
}

function renderFeatured(animate) {
  if (!featuredPool.length) buildFeaturedPool();
  const entry = featuredPool[featuredIndex];

  if (!animate) {
    els.featuredCardStage.innerHTML = featuredCardHTML(entry);
    attachFeaturedCardListener();
    return;
  }

  const existing = els.featuredCardStage.querySelector(".featured-card");
  if (existing) {
    existing.classList.add("fade-out");
    setTimeout(() => {
      els.featuredCardStage.innerHTML = featuredCardHTML(entry);
      attachFeaturedCardListener();
    }, 320);
  } else {
    els.featuredCardStage.innerHTML = featuredCardHTML(entry);
    attachFeaturedCardListener();
  }
}

function attachFeaturedCardListener() {
  const card = els.featuredCardStage.querySelector(".featured-card");
  if (!card) return;
  const open = () => openEntry(card.dataset.word, ENTRIES, "view-home");
  card.addEventListener("click", open);
  card.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
}

function advanceFeatured() {
  const lastWord = featuredPool[featuredIndex] ? featuredPool[featuredIndex].word : null;
  featuredIndex++;
  if (featuredIndex >= featuredPool.length) {
    featuredPool = getRandomEntries(FEATURED_POOL_SIZE, lastWord ? [lastWord] : []);
    featuredIndex = 0;
  }
  renderFeatured(true);
}

function startFeaturedRotation() {
  stopFeaturedRotation();
  featuredTimer = setInterval(advanceFeatured, FEATURED_ROTATE_MS);
}

function stopFeaturedRotation() {
  if (featuredTimer) clearInterval(featuredTimer);
  featuredTimer = null;
}

// Pause rotation when the tab isn't visible, resume on return, so timing doesn't
// silently drift or dump several rotations at once when the user comes back.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopFeaturedRotation();
  } else if (document.getElementById("view-home").classList.contains("active")) {
    startFeaturedRotation();
  }
});

// ---------- Home: Recently learned ----------
function renderRecent() {
  const words = loadRecentWords();

  if (!words.length) {
    els.recentList.innerHTML = "";
    els.recentEmptyState.classList.add("visible");
    return;
  }

  els.recentEmptyState.classList.remove("visible");
  const entries = words
    .map(w => ENTRIES.find(e => e.word === w))
    .filter(Boolean);

  els.recentList.innerHTML = entries.map(entryRowHTML).join("");
  attachEntryRowListeners(els.recentList, entries, "view-home");
}

// ---------- Search ----------
function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<mark class="search-highlight">${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length)
  );
}

function searchEntries(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const wordMatches = [];
  const descMatches = [];

  for (const entry of ENTRIES) {
    const wordLower = entry.word.toLowerCase();
    if (wordLower.includes(q)) {
      wordMatches.push(entry);
    } else if (entry.description.toLowerCase().includes(q)) {
      descMatches.push(entry);
    }
  }

  // headword matches first (sorted alphabetically), then description matches
  wordMatches.sort((a, b) => a.word.localeCompare(b.word));
  descMatches.sort((a, b) => a.word.localeCompare(b.word));
  return [...wordMatches, ...descMatches];
}

function renderSearchResults(query) {
  const q = query.trim();

  if (!q) {
    els.searchResults.innerHTML = "";
    els.searchEmptyState.classList.add("visible");
    els.searchClearBtn.hidden = true;
    return;
  }

  els.searchEmptyState.classList.remove("visible");
  els.searchClearBtn.hidden = false;

  const results = searchEntries(q).slice(0, 60); // cap for performance at scale

  if (results.length === 0) {
    els.searchResults.innerHTML = `
      <div class="search-no-results">
        No entries found for <strong>"${q}"</strong>
      </div>
    `;
    return;
  }

  let html = `<div class="search-result-count">${results.length} result${results.length === 1 ? "" : "s"}</div>`;
  results.forEach(entry => {
    const cat = categoryById(entry.category);
    html += `
      <div class="entry-row" tabindex="0" data-word="${entry.word}" role="button">
        <span class="entry-dot accent-dot-${cat.accent}"></span>
        <div class="entry-row-main">
          <span class="entry-headword">${highlightMatch(entry.word, q)}<span class="entry-tag accent-text-${cat.accent}">${cat.tag}</span></span>
          <span class="entry-preview">${entry.description.split(". ")[0]}.</span>
        </div>
        <svg class="entry-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    `;
  });

  els.searchResults.innerHTML = html;
  attachEntryRowListeners(els.searchResults, results, "view-search");
}

function openSearch() {
  stopFeaturedRotation();
  switchView("view-search");
  renderSearchResults(els.searchInput.value);
  // focus after the view becomes visible so mobile keyboards open reliably
  setTimeout(() => els.searchInput.focus(), 50);
}

function closeSearch() {
  switchView("view-atoz");
  els.toggleBtns.forEach(b => {
    const isAtoZ = b.dataset.view === "atoz";
    b.classList.toggle("active", isAtoZ);
    b.setAttribute("aria-selected", String(isAtoZ));
  });
  document.querySelector(".view-toggle").dataset.active = "atoz";
}

els.searchBtn.addEventListener("click", openSearch);
els.searchCancelBtn.addEventListener("click", closeSearch);

els.searchInput.addEventListener("input", () => {
  renderSearchResults(els.searchInput.value);
});

els.searchClearBtn.addEventListener("click", () => {
  els.searchInput.value = "";
  renderSearchResults("");
  els.searchInput.focus();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && document.getElementById("view-search").classList.contains("active")) {
    closeSearch();
  }
});

// ---------- View switching ----------
function switchView(viewId) {
  els.views.forEach(v => v.classList.toggle("active", v.id === viewId));
  window.scrollTo(0, 0);
}

els.toggleBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    stopFeaturedRotation();
    els.toggleBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.querySelector(".view-toggle").dataset.active = btn.dataset.view;
    switchView(btn.dataset.view === "atoz" ? "view-atoz" : "view-category");
  });
});

els.backToCategories.addEventListener("click", () => {
  switchView("view-category");
});

els.backFromEntry.addEventListener("click", () => {
  switchView(cameFromView);
  if (cameFromView === "view-home") {
    startFeaturedRotation();
  }
});

els.brandHomeBtn.addEventListener("click", goHome);
els.brandHomeBtn.addEventListener("keydown", e => { if (e.key === "Enter") goHome(); });

function goHome() {
  stopFeaturedRotation();
  els.toggleBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
  switchView("view-home");
  startFeaturedRotation();
}

// ---------- Init ----------
renderAtoZ();
renderCategoryGrid();
setupScrollSpy();
renderFeatured(false);
renderRecent();
startFeaturedRotation();
