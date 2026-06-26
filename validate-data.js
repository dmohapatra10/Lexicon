#!/usr/bin/env node
// ============================================
// LEXICON — Data Validator
// Run after adding/editing entries to catch
// problems before they ship:
//   node validate-data.js
//
// Checks:
//   - every category in categories.js has a
//     matching, loadable entries file
//   - every entry's `category` field matches a
//     real category id (no orphans/typos)
//   - no duplicate headwords within a category
//   - description word counts are in a sane
//     reading range (120-260 words)
//   - reports entry counts per category vs the
//     50-entry target
// ============================================

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ENTRIES_DIR = path.join(DATA_DIR, "entries");

const MIN_WORDS = 120;
const MAX_WORDS = 260;
const TARGET_PER_CATEGORY = 50;

function loadCategories() {
  const content = fs.readFileSync(path.join(DATA_DIR, "categories.js"), "utf8");
  const ids = [...content.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
  const names = [...content.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
  return ids.map((id, i) => ({ id, name: names[i] }));
}

function loadEntriesForCategory(id) {
  const file = path.join(ENTRIES_DIR, `${id}.js`);
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, "utf8");
  const varName = `ENTRIES_${id.toUpperCase()}`;
  const wrapped = src + `\nmodule.exports = typeof ${varName} !== "undefined" ? ${varName} : [];`;
  const tmpFile = path.join("/tmp", `validate_${id}.js`);
  fs.writeFileSync(tmpFile, wrapped);
  delete require.cache[require.resolve(tmpFile)];
  return require(tmpFile);
}

function wordCount(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function main() {
  const categories = loadCategories();
  const categoryIds = new Set(categories.map(c => c.id));

  let errors = [];
  let warnings = [];
  let totalEntries = 0;
  const report = [];

  for (const cat of categories) {
    const entries = loadEntriesForCategory(cat.id);

    if (entries === null) {
      errors.push(`Missing file: data/entries/${cat.id}.js`);
      continue;
    }

    totalEntries += entries.length;

    const seenWords = new Map();
    let wcIssues = 0;

    for (const entry of entries) {
      if (!entry.word || !entry.description || !entry.category) {
        errors.push(`[${cat.id}] entry missing required field: ${JSON.stringify(entry).slice(0, 80)}`);
        continue;
      }
      if (entry.category !== cat.id) {
        errors.push(`[${cat.id}] entry "${entry.word}" has mismatched category "${entry.category}" (file is for "${cat.id}")`);
      }
      if (!categoryIds.has(entry.category)) {
        errors.push(`[${cat.id}] entry "${entry.word}" references unknown category "${entry.category}"`);
      }

      const key = entry.word.trim().toLowerCase();
      if (seenWords.has(key)) {
        errors.push(`[${cat.id}] duplicate headword: "${entry.word}"`);
      }
      seenWords.set(key, true);

      const wc = wordCount(entry.description);
      if (wc < MIN_WORDS || wc > MAX_WORDS) {
        wcIssues++;
        warnings.push(`[${cat.id}] "${entry.word}" description is ${wc} words (expected ${MIN_WORDS}-${MAX_WORDS})`);
      }
    }

    const pct = Math.round((entries.length / TARGET_PER_CATEGORY) * 100);
    report.push({ id: cat.id, name: cat.name, count: entries.length, pct, wcIssues });
  }

  console.log("=".repeat(60));
  console.log("LEXICON DATA REPORT");
  console.log("=".repeat(60));
  console.log(`Categories: ${categories.length}`);
  console.log(`Total entries: ${totalEntries}`);
  console.log(`Target total: ${categories.length * TARGET_PER_CATEGORY}\n`);

  console.log("Per-category progress:");
  for (const r of report) {
    const bar = "#".repeat(Math.min(20, Math.round(r.pct / 5))).padEnd(20, "-");
    console.log(`  ${r.id.padEnd(14)} [${bar}] ${String(r.count).padStart(3)}/${TARGET_PER_CATEGORY}  ${r.wcIssues ? `(${r.wcIssues} word-count warnings)` : ""}`);
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} WARNING(S):`);
    warnings.slice(0, 30).forEach(w => console.log("  ! " + w));
    if (warnings.length > 30) console.log(`  ... and ${warnings.length - 30} more`);
  }

  if (errors.length) {
    console.log(`\n${errors.length} ERROR(S):`);
    errors.forEach(e => console.log("  X " + e));
    console.log("\nValidation FAILED.");
    process.exit(1);
  }

  console.log("\nValidation passed — no errors.");
}

main();
