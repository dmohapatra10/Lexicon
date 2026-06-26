// ============================================
// LEXICON — Data Loader
// Merges all per-category entry files into the
// single ENTRIES array the app expects. This is
// the ONLY file that needs to know about every
// category file — app.js stays untouched as
// content scales.
//
// To add a new category's data file, add one line
// to the concat list at the bottom of this file.
// ============================================

const ENTRIES = [].concat(
  ENTRIES_SCIENCE,
  ENTRIES_MYTHOLOGY,
  ENTRIES_ART,
  ENTRIES_HISTORY,
  ENTRIES_GEOGRAPHY,
  ENTRIES_PHILOSOPHY,
  ENTRIES_LITERATURE,
  ENTRIES_MUSIC,
  ENTRIES_TECHNOLOGY,
  ENTRIES_PSYCHOLOGY,
  ENTRIES_BIOLOGY,
  ENTRIES_ASTRONOMY,
  ENTRIES_ECONOMICS,
  ENTRIES_POLITICS,
  ENTRIES_RELIGION,
  ENTRIES_ARCHITECTURE,
  ENTRIES_FILM,
  ENTRIES_SPORTS,
  ENTRIES_FOOD,
  ENTRIES_FASHION,
  ENTRIES_MEDICINE,
  ENTRIES_MATHEMATICS,
  ENTRIES_LAW,
  ENTRIES_LINGUISTICS,
  ENTRIES_NATURE,
  ENTRIES_WARFARE,
  ENTRIES_ANTHROPOLOGY,
  ENTRIES_CHEMISTRY,
  ENTRIES_EXPLORATION,
  ENTRIES_FOLKLORE
);
