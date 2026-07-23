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
  categoryDetailHeroImg: document.getElementById("category-detail-hero-img"),
  categoryDetailTag: document.getElementById("category-detail-tag"),
  categoryDetailCount: document.getElementById("category-detail-count"),
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
  bookmarksList: document.getElementById("bookmarks-list"),
  bookmarksEmptyState: document.getElementById("bookmarks-empty-state"),
  entryPageBookmarkBtn: document.getElementById("entry-page-bookmark-btn"),
  entryPageListenBtn: document.getElementById("entry-page-listen-btn"),
  hamburgerBtn: document.getElementById("hamburger-btn"),
  navDrawer: document.getElementById("nav-drawer"),
  navDrawerBackdrop: document.getElementById("nav-drawer-backdrop"),
  navDrawerClose: document.getElementById("nav-drawer-close"),
  homeCategoryGrid: document.getElementById("home-category-grid"),
};

let activeCategoryId = null;

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

// Small deterministic hash so the same entry always gets the same
// read-time estimate / badge on every render (no per-entry data for
// this yet, so we derive stable, plausible values from the word itself).
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function estimateReadMinutes(entry) {
  const words = entry.description.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function entryBadgeHTML(entry) {
  const bucket = hashString(entry.word) % 4;
  if (bucket === 0) {
    return `<span class="explore-card-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>Popular</span>`;
  }
  if (bucket === 1) {
    return `<span class="explore-card-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 11-14h-8z"/></svg>Trending</span>`;
  }
  return "";
}

// Card used on the Explore (A-Z) page: a richer preview with a linked
// category thumbnail (entries don't have their own images yet, so the
// entry's category image stands in) plus a read-time / badge meta row.
function entryCardHTML(entry) {
  const cat = categoryById(entry.category);
  const firstSentence = entry.description.split(". ")[0] + ".";
  const minutes = estimateReadMinutes(entry);
  return `
    <div class="entry-row explore-card" tabindex="0" data-word="${entry.word}" role="button" aria-label="Read more about ${entry.word}">
      <span class="entry-dot accent-dot-${cat.accent}"></span>
      <div class="explore-card-image">
        <img src="${categoryImagePath(cat.id)}" alt="${cat.name}" loading="lazy">
      </div>
      <div class="explore-card-body">
        <div class="explore-card-top">
          <span class="explore-card-headword">${entry.word}</span>
          <span class="explore-card-tag" style="background:var(--acc-${cat.accent}-bg); color:var(--acc-${cat.accent});">${cat.tag}</span>
        </div>
        <p class="explore-card-desc">${firstSentence}</p>
        <div class="explore-card-meta">
          <span class="explore-card-meta-item explore-card-meta-readmore">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5C6 4.5 9 4.5 12 6c3-1.5 6-1.5 8 -0.5v13c-2-1-5-1-8 0.5-3-1.5-6-1.5-8 -0.5z"/></svg>
            Read more
          </span>
          <span class="explore-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            ${minutes} min read
          </span>
          ${entryBadgeHTML(entry)}
        </div>
      </div>
      <button class="explore-card-chevron" tabindex="-1" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;
}

// ---------- Render: A-Z view (Explore) ----------
function renderAtoZ() {
  const groups = groupByLetter(ENTRIES);
  let html = "";
  ALPHABET.forEach(letter => {
    if (groups[letter]) {
      html += `<div class="letter-group-heading" id="letter-${letter}"><span class="letter-glyph">${letter}</span><span class="letter-rule"></span></div>`;
      groups[letter].forEach(entry => { html += entryCardHTML(entry); });
    }
  });
  els.entryList.innerHTML = html;
  attachEntryRowListeners(els.entryList);
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
//
// Performance note: this is rewritten to avoid layout-forcing calls
// (elementFromPoint, getBoundingClientRect) inside the pointermove hot path.
// Letter positions are measured once when the drag starts and then reused
// via simple arithmetic, with updates batched to one per animation frame,
// which is what keeps fast top-to-bottom swipes smooth.
let railIsDragging = false;

function attachAZRailScanning() {
  let isDragging = false;
  let lastLetter = null;
  let letterSlots = []; // [{ letter, el, centerY }], measured once per drag
  let pendingY = null;
  let rafScheduled = false;

  function measureSlots() {
    const railRect = els.azRail.getBoundingClientRect();
    letterSlots = [...els.azRail.querySelectorAll(".az-rail-letter.has-entries")].map(el => {
      const rect = el.getBoundingClientRect();
      return { letter: el.dataset.letter, el, centerY: rect.top + rect.height / 2 };
    });
    return railRect;
  }

  function closestSlotToY(y) {
    let closest = null;
    let closestDist = Infinity;
    for (const slot of letterSlots) {
      const dist = Math.abs(slot.centerY - y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = slot;
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

  function applyY(y) {
    if (!letterSlots.length) return;
    const slot = closestSlotToY(y);
    if (!slot) return;
    showMagnifier(slot.el);
    if (slot.letter !== lastLetter) {
      lastLetter = slot.letter;
      jumpToLetter(slot.letter, false);
    }
  }

  function flushPending() {
    rafScheduled = false;
    if (pendingY !== null) {
      applyY(pendingY);
      pendingY = null;
    }
  }

  function queueMove(y) {
    pendingY = y;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushPending);
    }
  }

  els.azRail.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isDragging = true;
    railIsDragging = true;
    lastLetter = null;
    measureSlots();
    els.azRail.setPointerCapture(e.pointerId);
    applyY(e.clientY);
    e.preventDefault();
  });

  els.azRail.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    queueMove(e.clientY);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    railIsDragging = false;
    pendingY = null;
    hideMagnifier();
    try { els.azRail.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  els.azRail.addEventListener("pointerup", endDrag);
  els.azRail.addEventListener("pointercancel", endDrag);
}

// Scroll-spy for the rail: highlight current letter
function setupScrollSpy() {
  const observer = new IntersectionObserver((entries) => {
    // The observed headings live inside views that start out hidden
    // (display:none) and use content-visibility:auto on their cards. The
    // very first time such a view becomes visible, the browser can report
    // a stale or glitched intersection for a heading nowhere near the
    // current scroll position. Rather than try to guess which reading is
    // trustworthy, we simply ignore all of them unless the heading's own
    // view is genuinely the one currently on screen.
    const visibleView = document.querySelector(".view.active");
    if (!visibleView || !(visibleView.id === "view-atoz" || visibleView.id === "view-category-detail")) return;

    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!visibleView.contains(entry.target)) return; // ignore headings in the other (inactive) A-Z list

      const letter = entry.target.id.replace("letter-", "");
      const currentEl = els.azRail.querySelector(`.az-rail-letter[data-letter="${letter}"]`);
      els.azRail.querySelectorAll(".az-rail-letter").forEach(el => {
        el.classList.toggle("current", el.dataset.letter === letter);
      });
      // Skip auto-scrolling the rail while the user is actively dragging on
      // it themselves — fighting their gesture with our own scroll is the
      // main cause of visible lag during a fast swipe.
      if (currentEl && !railIsDragging) {
        // Scroll only the rail's own internal scroll position directly,
        // rather than calling scrollIntoView() on the element. scrollIntoView
        // walks every scrollable ancestor to bring the target into view,
        // and even though the rail is a fixed, independently-scrollable
        // element, that walk could still end up nudging the main page's
        // own scroll position too. Setting scrollTop by hand touches only
        // the rail and nothing else.
        const railRect = els.azRail.getBoundingClientRect();
        const elRect = currentEl.getBoundingClientRect();
        if (elRect.top < railRect.top || elRect.bottom > railRect.bottom) {
          els.azRail.scrollTop += (elRect.top - railRect.top) - (railRect.height - elRect.height) / 2;
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
    return `
      <div class="category-card accent-${cat.accent}" tabindex="0" role="button" data-category="${cat.id}">
        <div class="category-card-left">
          <span class="category-icon"><img src="${categoryImagePath(cat.id)}" alt="" loading="lazy"></span>
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
function pickRandomCategories(count) {
  const shuffled = [...CATEGORIES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function renderHomeCategories() {
  if (!els.homeCategoryGrid) return;
  const cats = pickRandomCategories(6);

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

function renderCategoryDetail(catId) {
  activeCategoryId = catId;
  const cat = categoryById(catId);
  const entries = ENTRIES.filter(e => e.category === catId);

  els.categoryDetailHeroImg.src = categoryImagePath(cat.id);
  els.categoryDetailHeroImg.alt = cat.name;
  els.categoryDetailTag.textContent = cat.tag;
  els.categoryDetailTag.style.color = `var(--acc-${cat.accent})`;
  els.categoryDetailTitle.textContent = cat.name;
  els.categoryDetailDesc.textContent = cat.description;
  els.categoryDetailCount.textContent = entries.length;

  const groups = groupByLetter(entries);
  let html = "";
  ALPHABET.forEach(letter => {
    if (groups[letter]) {
      html += `<div class="letter-group-heading"><span class="letter-glyph">${letter}</span><span class="letter-rule"></span></div>`;
      groups[letter].forEach(entry => { html += entryCardHTML(entry); });
    }
  });
  els.categoryEntryList.innerHTML = html;
  attachEntryRowListeners(els.categoryEntryList);
}

function openCategory(catId) {
  navigate({ view: "categoryDetail", categoryId: catId });
}

// ---------- Render: Entry page ----------
function attachEntryRowListeners(container) {
  container.querySelectorAll(".entry-row").forEach(row => {
    const open = () => openEntry(row.dataset.word);
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => { if (e.key === "Enter") open(); });
  });
}

function renderEntryPage(word) {
  const entry = ENTRIES.find(e => e.word === word);
  if (!entry) return;
  const cat = categoryById(entry.category);

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
  els.entryPageContent.closest(".entry-page").scrollTop = 0;

  els.entryPageBookmarkBtn.dataset.word = entry.word;
  const saved = loadSavedWords().includes(entry.word);
  els.entryPageBookmarkBtn.classList.toggle("saved", saved);
  els.entryPageBookmarkBtn.setAttribute("aria-pressed", String(saved));

  if (els.entryPageListenBtn) {
    stopListening();
    els.entryPageListenBtn.dataset.word = entry.word;
  }

  recordRecentlyViewed(entry.word);
}

// ---------- Entry page: listen (text-to-speech) ----------
const speechSupported = "speechSynthesis" in window;
let currentUtterance = null;
let listenKeepAliveTimer = null;
let listenStallTimer = null;

// Chrome (desktop + Android) can report zero voices for a moment after
// page load, and speak() called before voices are ready sometimes does
// nothing at all — no sound, no error, no events. Touching getVoices()
// early and listening for voiceschanged nudges the engine to warm up
// before the person ever taps the button.
if (speechSupported) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
}

function clearListenTimers() {
  if (listenKeepAliveTimer) { clearInterval(listenKeepAliveTimer); listenKeepAliveTimer = null; }
  if (listenStallTimer) { clearTimeout(listenStallTimer); listenStallTimer = null; }
}

function stopListening() {
  clearListenTimers();
  if (speechSupported && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
  if (els.entryPageListenBtn) {
    els.entryPageListenBtn.classList.remove("speaking");
    els.entryPageListenBtn.setAttribute("aria-pressed", "false");
  }
}

function startListening(entry) {
  if (!speechSupported) return;
  window.speechSynthesis.cancel(); // clear any stale queue first
  const utterance = new SpeechSynthesisUtterance(`${entry.word}. ${entry.description}`);
  utterance.rate = 0.98;

  utterance.onstart = () => {
    // Confirmed the engine actually picked it up — no longer "stalled".
    if (listenStallTimer) { clearTimeout(listenStallTimer); listenStallTimer = null; }
    // Chrome has a long-standing bug where it silently stops speaking
    // after ~15s unless the queue is nudged with pause()/resume(). This
    // keeps long entries (many are 200+ words) playing to the end.
    listenKeepAliveTimer = setInterval(() => {
      if (!window.speechSynthesis.speaking) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  };
  utterance.onend = stopListening;
  utterance.onerror = stopListening;

  currentUtterance = utterance;
  els.entryPageListenBtn.classList.add("speaking");
  els.entryPageListenBtn.setAttribute("aria-pressed", "true");

  // Some browsers leave the synthesis queue paused after backgrounding
  // the tab; resume() is a harmless no-op otherwise.
  window.speechSynthesis.resume();
  window.speechSynthesis.speak(utterance);

  // Safety net: if neither onstart nor onerror fires within 1.2s (seen
  // on some Android WebViews when the first tap races voice loading),
  // don't leave the button stuck in a "speaking" state forever — retry
  // once, and if that also goes nowhere, reset so the person can try again.
  let retried = false;
  listenStallTimer = setTimeout(function checkStalled() {
    if (currentUtterance !== utterance) return; // superseded already
    if (!window.speechSynthesis.speaking && !retried) {
      retried = true;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      listenStallTimer = setTimeout(checkStalled, 1200);
    } else if (!window.speechSynthesis.speaking) {
      stopListening();
    }
  }, 1200);
}

function toggleListening() {
  if (!speechSupported) return;
  const word = els.entryPageListenBtn.dataset.word;
  const entry = ENTRIES.find(e => e.word === word);
  if (!entry) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    stopListening();
  } else {
    startListening(entry);
  }
}

if (els.entryPageListenBtn) {
  if (!speechSupported) {
    els.entryPageListenBtn.hidden = true;
  } else {
    els.entryPageListenBtn.addEventListener("click", toggleListening);
  }
}

els.entryPageBookmarkBtn.addEventListener("click", () => {
  const word = els.entryPageBookmarkBtn.dataset.word;
  if (!word) return;
  const nowSaved = toggleSavedWord(word);
  els.entryPageBookmarkBtn.classList.toggle("saved", nowSaved);
  els.entryPageBookmarkBtn.setAttribute("aria-pressed", String(nowSaved));
  // Recently Viewed and Bookmarks each render their own DOM independently,
  // so both need an explicit refresh to stay in sync with this toggle.
  renderRecent();
  renderBookmarks();
});

function openEntry(word) {
  navigate({ view: "entry", word });
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
    const open = () => openEntry(card.dataset.word);
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
      openEntry(row.dataset.word);
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
      // The Bookmarks page renders its own DOM independently, so it needs
      // an explicit refresh too or it'll show stale state next time it's
      // opened without a full page reload in between.
      renderBookmarks();
    });
  });
}

// ---------- Bookmarks page ----------
function renderBookmarks() {
  const words = loadSavedWords();

  if (!words.length) {
    els.bookmarksList.innerHTML = "";
    els.bookmarksEmptyState.classList.add("visible");
    return;
  }

  els.bookmarksEmptyState.classList.remove("visible");
  const entries = words
    .map(w => ENTRIES.find(e => e.word === w))
    .filter(Boolean);

  els.bookmarksList.innerHTML = entries.map(recentRowHTML).join("");

  els.bookmarksList.querySelectorAll(".recent-row").forEach(row => {
    const open = (e) => {
      if (e.target.closest(".recent-row-bookmark")) return;
      openEntry(row.dataset.word);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => { if (e.key === "Enter") open(e); });
  });

  els.bookmarksList.querySelectorAll(".recent-row-bookmark").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSavedWord(btn.dataset.word);
      // This list only ever shows currently-saved entries, so unsaving one
      // here should drop it from view immediately rather than just
      // toggling its icon.
      renderBookmarks();
      // The Recently Viewed section on Home renders its own DOM
      // independently, so its bookmark icon needs an explicit refresh too,
      // or it'll keep showing the entry as saved after this unbookmarks it.
      renderRecent();
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
  attachEntryRowListeners(els.searchResults);
}

function openSearch() {
  navigate({ view: "search" });
}

function closeSearch() {
  // Popping history is the single source of truth for "where do we land";
  // this keeps the in-app Cancel button, the Escape key, and the phone's
  // hardware back button all behave identically when search is open.
  history.back();
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
const BOTTOM_NAV_VIEW_MAP = {
  "view-home": "home",
  "view-atoz": "atoz",
  "view-category": "category",
  "view-category-detail": "category",
  "view-bookmarks": "bookmarks",
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
  if (viewId !== "view-entry") stopListening();
  els.views.forEach(v => v.classList.toggle("active", v.id === viewId));
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

// ============================================================
// History-backed navigation
//
// Every screen the person can land on (home, A-Z, categories,
// a specific category, an entry, search, about) is represented as a
// small state object and pushed onto the real browser/WebView history
// via history.pushState. That means the phone's hardware back button —
// and the browser's own back button — walks back through the app one
// screen at a time, all the way to Home, exactly like native app
// navigation, instead of leaving the page or doing nothing.
//
// `navigate(state)` is the one place that both renders a new screen and
// records it in history. `renderStateView(state)` only renders — it's
// reused by the popstate handler so going back doesn't push yet another
// entry on top of itself.
// ============================================================

function renderStateView(state, opts = {}) {
  const restoreY = opts.restoreY || 0;

  if (state.view !== "search") {
    document.querySelector(".topbar-backing").classList.remove("hidden-for-search");
  }

  switch (state.view) {
    case "home":
      switchView("view-home");
      startFeaturedRotation();
      restoreScroll(restoreY);
      break;
    case "atoz":
      stopFeaturedRotation();
      switchView("view-atoz");
      restoreScroll(restoreY);
      break;
    case "category":
      stopFeaturedRotation();
      switchView("view-category");
      restoreScroll(restoreY);
      break;
    case "categoryDetail":
      stopFeaturedRotation();
      renderCategoryDetail(state.categoryId);
      switchView("view-category-detail");
      restoreScroll(restoreY);
      break;
    case "entry":
      stopFeaturedRotation();
      renderEntryPage(state.word);
      switchView("view-entry");
      window.scrollTo(0, 0);
      break;
    case "search":
      stopFeaturedRotation();
      document.querySelector(".topbar-backing").classList.add("hidden-for-search");
      switchView("view-search");
      window.scrollTo(0, 0);
      renderSearchResults(els.searchInput.value);
      setTimeout(() => els.searchInput.focus(), 50);
      break;
    case "about":
      stopFeaturedRotation();
      switchView("view-about");
      window.scrollTo(0, 0);
      break;
    case "bookmarks":
      stopFeaturedRotation();
      renderBookmarks();
      switchView("view-bookmarks");
      window.scrollTo(0, 0);
      break;
    default:
      switchView("view-home");
      startFeaturedRotation();
  }
}

function navigate(state) {
  closeDrawer();
  // Snapshot the scroll position of the screen we're leaving into its own
  // history entry, so if the person comes back to it later via the back
  // button, we can restore roughly where they left off.
  const leaving = history.state || { view: "home" };
  history.replaceState({ ...leaving, scrollY: window.scrollY }, "");
  history.pushState(state, "");
  renderStateView(state, { restoreY: 0 });
}

window.addEventListener("popstate", (e) => {
  const state = e.state || { view: "home" };
  renderStateView(state, { restoreY: state.scrollY || 0 });
  if (state.view === "home") {
    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.toggle("active", b.dataset.nav === "home"));
  }
});

// The very first screen replaces (rather than adds to) the page's initial
// history entry, so pressing back while on Home leaves the app/page
// normally instead of getting stuck.
history.replaceState({ view: "home" }, "");

// ---------- Unified nav targets: drawer items, bottom nav, "View All" links ----------
function navigateTo(target) {
  closeDrawer();
  if (target === "home") { goHome(); return; }
  if (target === "atoz") { navigate({ view: "atoz" }); return; }
  if (target === "category") { navigate({ view: "category" }); return; }
  if (target === "about") { navigate({ view: "about" }); return; }
  if (target === "bookmarks") { navigate({ view: "bookmarks" }); return; }
}

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", () => navigateTo(el.dataset.nav));
});

els.backToCategories.addEventListener("click", () => history.back());
els.backFromEntry.addEventListener("click", () => history.back());

els.brandHomeBtn.addEventListener("click", goHome);
els.brandHomeBtn.addEventListener("keydown", e => { if (e.key === "Enter") goHome(); });

function goHome() {
  navigate({ view: "home" });
}

// ---------- Init ----------
renderAtoZ();
renderCategoryGrid();
renderHomeCategories();
setupScrollSpy();
renderFeatured(false);
renderRecent();
renderBookmarks();
startFeaturedRotation();
