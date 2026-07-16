// ============================================
// LEXICON — App Logic
// ============================================

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const els = {
  views: document.querySelectorAll(".view"),
  entryList: document.getElementById("entry-list"),
  azRail: document.getElementById("az-rail"),
  azRailMagnifier: document.getElementById("az-rail-magnifier"),
  categoryGrid: document.getElementById("category-grid"),
  categoryDetailTitle: document.getElementById("category-detail-title"),
  categoryDetailDesc: document.getElementById("category-detail-desc"),
  categoryEntryList: document.getElementById("category-entry-list"),
  entryPageContent: document.getElementById("entry-page-content"),
  entryPageHeroImg: document.getElementById("entry-page-hero-img"),
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
  hamburgerBtn: document.getElementById("hamburger-btn"),
  navDrawer: document.getElementById("nav-drawer"),
  navDrawerBackdrop: document.getElementById("nav-drawer-backdrop"),
  navDrawerClose: document.getElementById("nav-drawer-close"),
  topbarSearchTrigger: document.getElementById("topbar-search-trigger"),
  homeCategoryGrid: document.getElementById("home-category-grid"),
};

let activeCategoryId = null;
let cameFromView = "view-home";
let cameFromScrollY = 0;
let categoryGridScrollY = 0;

// ---------- Helpers ----------
function categoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

function categoryImagePath(categoryId) {
  return `assets/categories/${categoryId}.jpg`;
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

// ---------- Bookmarks (persisted, decorative toggle on the Recently Viewed rows) ----------
const SAVED_KEY = "lexicon:savedWords";

function loadSavedWords() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function toggleSavedWord(word) {
  let words = loadSavedWords();
  if (words.includes(word)) {
    words = words.filter(w => w !== word);
  } else {
    words.unshift(word);
  }
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(words)); } catch (e) {}
  return words.includes(word);
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

  attachAZRailScanning();
}

function jumpToLetter(letter, smooth) {
  const target = document.getElementById(`letter-${letter}`);
  if (target) target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

// Supports both a simple tap on a letter and a press-and-drag "scan" gesture
// along the whole rail (like the iOS Contacts A-Z index), showing a large
// magnified bubble of the current letter beside the rail while dragging so
// the user's own finger doesn't block their view of it.
function attachAZRailScanning() {
  let isDragging = false;
  let lastLetter = null;

  function letterFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.classList && el.classList.contains("az-rail-letter") && el.classList.contains("has-entries")) {
      return el;
    }
    // Finger may drift slightly off individual letter elements while dragging;
    // fall back to the closest letter by vertical position within the rail.
    const letters = [...els.azRail.querySelectorAll(".az-rail-letter.has-entries")];
    let closest = null;
    let closestDist = Infinity;
    for (const l of letters) {
      const rect = l.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(midY - clientY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = l;
      }
    }
    return closest;
  }

  function showMagnifier(letterEl) {
    const rect = letterEl.getBoundingClientRect();
    els.azRailMagnifier.textContent = letterEl.dataset.letter;
    els.azRailMagnifier.style.top = `${rect.top + rect.height / 2}px`;
    els.azRailMagnifier.style.left = `${rect.left - 22}px`;
    els.azRailMagnifier.classList.add("visible");
  }

  function hideMagnifier() {
    els.azRailMagnifier.classList.remove("visible");
  }

  function handleMove(clientX, clientY, smooth) {
    const letterEl = letterFromPoint(clientX, clientY);
    if (!letterEl) return;
    const letter = letterEl.dataset.letter;
    showMagnifier(letterEl);
    if (letter !== lastLetter) {
      lastLetter = letter;
      jumpToLetter(letter, smooth);
    }
  }

  els.azRail.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isDragging = true;
    lastLetter = null;
    els.azRail.setPointerCapture(e.pointerId);
    handleMove(e.clientX, e.clientY, false);
    e.preventDefault();
  });

  els.azRail.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    handleMove(e.clientX, e.clientY, false);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    hideMagnifier();
    try { els.azRail.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  els.azRail.addEventListener("pointerup", endDrag);
  els.azRail.addEventListener("pointercancel", endDrag);
}

// Scroll-spy for the rail: highlight current letter
function setupScrollSpy() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const letter = entry.target.id.replace("letter-", "");
        const currentEl = els.azRail.querySelector(`.az-rail-letter[data-letter="${letter}"]`);
        els.azRail.querySelectorAll(".az-rail-letter").forEach(el => {
          el.classList.toggle("current", el.dataset.letter === letter);
        });
        if (currentEl) {
          currentEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
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

// ---------- Render: Home category tiles (curated subset, links to full grid) ----------
const HOME_CATEGORY_IDS = ["science", "history", "mythology", "geography", "art", "literature", "philosophy", "food"];

function renderHomeCategories() {
  if (!els.homeCategoryGrid) return;
  const ids = HOME_CATEGORY_IDS.filter(id => categoryById(id));
  const cats = ids.length ? ids.map(categoryById) : CATEGORIES.slice(0, 8);

  els.homeCategoryGrid.innerHTML = cats.map(cat => {
    const count = ENTRIES.filter(e => e.category === cat.id).length;
    return `
      <div class="home-category-card" tabindex="0" role="button" data-category="${cat.id}" aria-label="${cat.name}">
        <img src="${categoryImagePath(cat.id)}" alt="" loading="lazy">
        <div class="home-category-card-label">
          <span class="home-category-card-name">${cat.name}</span>
          <span class="home-category-card-count">${count} Article${count === 1 ? "" : "s"}</span>
        </div>
      </div>
    `;
  }).join("");

  els.homeCategoryGrid.querySelectorAll(".home-category-card").forEach(card => {
    card.addEventListener("click", () => openCategory(card.dataset.category));
    card.addEventListener("keydown", e => { if (e.key === "Enter") openCategory(card.dataset.category); });
  });
}

function openCategory(catId) {
  stopFeaturedRotation();
  categoryGridScrollY = window.scrollY;
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
  cameFromScrollY = window.scrollY;
  const entry = list.find(e => e.word === word) || ENTRIES.find(e => e.word === word);
  const cat = categoryById(entry.category);
  cameFromView = originView;

  els.entryPageHeroImg.src = categoryImagePath(cat.id);
  els.entryPageContent.innerHTML = `
    <div class="entry-page-tag-row">
      <span class="entry-page-tag">${cat.name}</span>
    </div>
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

// ---------- Home: Featured card carousel ----------
const FEATURED_ROTATE_MS = 5000;
const FEATURED_POOL_SIZE = 5;
let featuredPool = [];
let featuredIndex = 0;
let featuredTimer = null;
let featuredResumeTimer = null;
let featuredIsInteracting = false;

function buildFeaturedPool() {
  featuredPool = getRandomEntries(FEATURED_POOL_SIZE);
  featuredIndex = 0;
}

function featuredCardHTML(entry, i) {
  const cat = categoryById(entry.category);
  return `
    <div class="featured-card" tabindex="0" role="button" data-word="${entry.word}" data-index="${i}">
      <div class="featured-card-image">
        <img src="${categoryImagePath(cat.id)}" alt="" loading="lazy">
      </div>
      <div class="featured-card-body">
      <div class="featured-card-top">
        <span class="featured-card-tag" style="background:var(--acc-${cat.accent}-bg); color:var(--acc-${cat.accent});">${cat.tag}</span>
        <span class="featured-card-random-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5M21 3l-9 9M21 16v5h-5M3 8V3h5M3 16v5h5M8 21l9-9"/></svg>
          Random pick
        </span>
      </div>
      <h2 class="featured-card-headword">${entry.word}</h2>
      <p class="featured-card-desc">${entry.description}</p>
      <span class="featured-card-cta">
        Read the full entry
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
      </span>
      </div>
    </div>
  `;
}

function featuredStageHTML() {
  const cards = featuredPool.map((entry, i) => featuredCardHTML(entry, i)).join("");
  const dots = featuredPool.map((_, i) => `<span class="featured-progress-dot ${i === featuredIndex ? "current" : ""}"></span>`).join("");
  return `
    <button class="featured-nav-btn featured-nav-prev" aria-label="Previous">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <div class="featured-card-track" id="featured-card-track">${cards}</div>
    <button class="featured-nav-btn featured-nav-next" aria-label="Next">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 18l6-6-6-6"/></svg>
    </button>
    <div class="featured-progress">${dots}</div>
  `;
}

function renderFeatured() {
  if (!featuredPool.length) buildFeaturedPool();
  els.featuredCardStage.innerHTML = featuredStageHTML();
  attachFeaturedCardListeners();
  scrollFeaturedTo(featuredIndex, false);
}

function scrollFeaturedTo(index, smooth) {
  const track = document.getElementById("featured-card-track");
  if (!track) return;
  const card = track.children[index];
  if (!card) return;
  track.scrollTo({ left: card.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  updateFeaturedDots(index);
}

function updateFeaturedDots(index) {
  featuredIndex = index;
  const dots = els.featuredCardStage.querySelectorAll(".featured-progress-dot");
  dots.forEach((dot, i) => dot.classList.toggle("current", i === index));
}

function attachFeaturedCardListeners() {
  const track = document.getElementById("featured-card-track");
  if (!track) return;

  track.querySelectorAll(".featured-card").forEach(card => {
    const open = () => openEntry(card.dataset.word, ENTRIES, "view-home");
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
  });

  const prevBtn = els.featuredCardStage.querySelector(".featured-nav-prev");
  const nextBtn = els.featuredCardStage.querySelector(".featured-nav-next");
  prevBtn.addEventListener("click", () => { pauseThenResumeFeatured(); goFeatured(-1); });
  nextBtn.addEventListener("click", () => { pauseThenResumeFeatured(); goFeatured(1); });

  // Detect manual swipe/scroll and keep the dots + index in sync,
  // and briefly pause auto-rotation so it doesn't fight the user's swipe.
  let scrollDebounce = null;
  let featuredEndTimer = null;
  track.addEventListener("scroll", () => {
    featuredIsInteracting = true;
    stopFeaturedRotation();
    clearTimeout(scrollDebounce);
    clearTimeout(featuredEndTimer);
    scrollDebounce = setTimeout(() => {
      const cardWidth = track.children[0] ? track.children[0].offsetWidth + 14 : track.clientWidth;
      const idx = Math.round(track.scrollLeft / cardWidth);
      const clamped = Math.max(0, Math.min(idx, featuredPool.length - 1));
      updateFeaturedDots(clamped);
      featuredIsInteracting = false;

      if (clamped === featuredPool.length - 1) {
        // User has swiped all the way to the last card — after a brief
        // pause, loop around to a fresh set rather than leaving them stuck.
        featuredEndTimer = setTimeout(() => {
          const lastWord = featuredPool[clamped] ? featuredPool[clamped].word : null;
          featuredPool = getRandomEntries(FEATURED_POOL_SIZE, lastWord ? [lastWord] : []);
          featuredIndex = 0;
          renderFeatured();
          startFeaturedRotation();
        }, 900);
      } else {
        pauseThenResumeFeatured();
      }
    }, 120);
  }, { passive: true });
}

function goFeatured(direction) {
  const track = document.getElementById("featured-card-track");
  if (!track) return;
  const next = featuredIndex + direction;

  if (next >= featuredPool.length) {
    // Reached the end going forward — start a new set from the beginning.
    const lastWord = featuredPool[featuredIndex] ? featuredPool[featuredIndex].word : null;
    featuredPool = getRandomEntries(FEATURED_POOL_SIZE, lastWord ? [lastWord] : []);
    featuredIndex = 0;
    renderFeatured();
    return;
  }

  const wrapped = next < 0 ? featuredPool.length - 1 : next;
  scrollFeaturedTo(wrapped, true);
}

function pauseThenResumeFeatured() {
  stopFeaturedRotation();
  clearTimeout(featuredResumeTimer);
  featuredResumeTimer = setTimeout(() => {
    if (document.getElementById("view-home").classList.contains("active")) {
      startFeaturedRotation();
    }
  }, FEATURED_ROTATE_MS);
}

function advanceFeatured() {
  if (featuredIsInteracting) return;
  const lastWord = featuredPool[featuredIndex] ? featuredPool[featuredIndex].word : null;
  const nextIndex = featuredIndex + 1;
  if (nextIndex >= featuredPool.length) {
    featuredPool = getRandomEntries(FEATURED_POOL_SIZE, lastWord ? [lastWord] : []);
    featuredIndex = 0;
    renderFeatured();
  } else {
    scrollFeaturedTo(nextIndex, true);
  }
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

// ---------- Home: Recently viewed ----------
function recentRowHTML(entry) {
  const cat = categoryById(entry.category);
  const saved = loadSavedWords().includes(entry.word);
  return `
    <div class="recent-row" tabindex="0" data-word="${entry.word}" role="button">
      <div class="recent-row-thumb"><img src="${categoryImagePath(cat.id)}" alt="" loading="lazy"></div>
      <div class="recent-row-main">
        <span class="recent-row-title">${entry.word}</span>
        <span class="recent-row-tag accent-text-${cat.accent}">${cat.name}</span>
      </div>
      <button class="recent-row-bookmark ${saved ? "saved" : ""}" data-word="${entry.word}" aria-label="Bookmark ${entry.word}" aria-pressed="${saved}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4h12v17l-6-4-6 4V4z"/></svg>
      </button>
    </div>
  `;
}

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

  els.recentList.innerHTML = entries.map(recentRowHTML).join("");

  els.recentList.querySelectorAll(".recent-row").forEach(row => {
    const open = (e) => {
      if (e.target.closest(".recent-row-bookmark")) return;
      openEntry(row.dataset.word, entries, "view-home");
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => { if (e.key === "Enter") open(e); });
  });

  els.recentList.querySelectorAll(".recent-row-bookmark").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const nowSaved = toggleSavedWord(btn.dataset.word);
      btn.classList.toggle("saved", nowSaved);
      btn.setAttribute("aria-pressed", String(nowSaved));
    });
  });
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

let preSearchView = "view-home";

function openSearch() {
  stopFeaturedRotation();
  const current = document.querySelector(".view.active");
  preSearchView = current ? current.id : "view-home";
  document.querySelector(".topbar-backing").classList.add("hidden-for-search");
  switchView("view-search");
  renderSearchResults(els.searchInput.value);
  // focus after the view becomes visible so mobile keyboards open reliably
  setTimeout(() => els.searchInput.focus(), 50);
}

function closeSearch() {
  document.querySelector(".topbar-backing").classList.remove("hidden-for-search");
  switchView(preSearchView);
  if (preSearchView === "view-home") startFeaturedRotation();
}

els.searchBtn.addEventListener("click", openSearch);
els.topbarSearchTrigger.addEventListener("click", openSearch);
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
const BOTTOM_NAV_VIEW_MAP = {
  "view-home": "home",
  "view-atoz": "atoz",
  "view-category": "category",
  "view-category-detail": "category",
  "view-about": "about",
};

function updateBottomNavForView(viewId) {
  const key = BOTTOM_NAV_VIEW_MAP[viewId];
  if (!key) return; // entry page / search overlay: leave the nav's last state alone
  document.querySelectorAll(".bottom-nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === key);
  });
}

function switchView(viewId) {
  els.views.forEach(v => v.classList.toggle("active", v.id === viewId));
  window.scrollTo(0, 0);
  updateBottomNavForView(viewId);
}

function restoreScroll(y) {
  // Defer past the current paint cycle so the newly-shown view has fully
  // finished layout (correct scrollHeight) before we try to scroll to y,
  // then re-assert once more shortly after in case anything (e.g. an
  // image finishing its layout) nudges the page height afterward.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: "auto" });
      setTimeout(() => window.scrollTo({ top: y, left: 0, behavior: "auto" }), 60);
    });
  });
}

// ---------- Nav drawer ----------
function openDrawer() {
  els.navDrawer.classList.add("open");
  els.navDrawerBackdrop.classList.add("visible");
}
function closeDrawer() {
  els.navDrawer.classList.remove("open");
  els.navDrawerBackdrop.classList.remove("visible");
}
els.hamburgerBtn.addEventListener("click", openDrawer);
els.navDrawerClose.addEventListener("click", closeDrawer);
els.navDrawerBackdrop.addEventListener("click", closeDrawer);

// ---------- Unified nav targets: drawer items, bottom nav, "View All" links ----------
function navigateTo(target) {
  closeDrawer();
  if (target === "home") { goHome(); return; }
  if (target === "atoz") { stopFeaturedRotation(); switchView("view-atoz"); return; }
  if (target === "category") { stopFeaturedRotation(); switchView("view-category"); return; }
  if (target === "about") { stopFeaturedRotation(); switchView("view-about"); return; }
  if (target === "bookmarks") {
    stopFeaturedRotation();
    switchView("view-home");
    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.toggle("active", b.dataset.nav === "bookmarks"));
    requestAnimationFrame(() => {
      const frame = document.querySelector(".recent-list-frame");
      if (frame) frame.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    startFeaturedRotation();
    return;
  }
}

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", () => navigateTo(el.dataset.nav));
});

els.backToCategories.addEventListener("click", () => {
  switchView("view-category");
  restoreScroll(categoryGridScrollY);
});

els.backFromEntry.addEventListener("click", () => {
  switchView(cameFromView);
  restoreScroll(cameFromScrollY);
  if (cameFromView === "view-home") {
    startFeaturedRotation();
  }
});

els.brandHomeBtn.addEventListener("click", goHome);
els.brandHomeBtn.addEventListener("keydown", e => { if (e.key === "Enter") goHome(); });

function goHome() {
  stopFeaturedRotation();
  switchView("view-home");
  startFeaturedRotation();
}

// ---------- Init ----------
renderAtoZ();
renderCategoryGrid();
renderHomeCategories();
setupScrollSpy();
renderFeatured(false);
renderRecent();
startFeaturedRotation();
