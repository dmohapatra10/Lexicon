# Lexicon — Data Architecture

## Structure

```
data/
  categories.js        ← the 30 categories (single source of truth for category metadata)
  entries/
    science.js          ← entries for one category (currently 4, target 50 each)
    mythology.js
    art.js
    history.js           ← empty placeholder, ready for content
    ... (30 files total, one per category)
build-data.js           ← merges everything into data.bundle.js
validate-data.js        ← checks data integrity + reports progress
data.bundle.js          ← AUTO-GENERATED, what index.html actually loads
```

## Why split like this

At 30 categories × 50 entries (~1,500 entries total), one giant data file
becomes unsafe to edit — every change risks touching unrelated content,
and it's slow to scan. Splitting by category means:

- Adding entries to "Music" only ever touches `data/entries/music.js`
- Every file stays small and human-reviewable
- The app itself still loads one fast, cacheable bundle (good for a PWA)

## Workflow

**Adding entries to a category:**
1. Edit `data/entries/<category>.js`, adding objects to the `ENTRIES_<ID>` array.
2. Run `node build-data.js` to regenerate `data.bundle.js`.
3. Run `node validate-data.js` to check for duplicates, bad word counts, or broken category references.

**Adding a brand new category:**
1. Add an entry to `data/categories.js`.
2. Add `--acc-<id>` / `--acc-<id>-bg` CSS variables in `style.css` (see the "category accents" section).
3. Add the `.accent-<id> .category-icon` / `.category-count` rule pair in `style.css` (search `accent-science` for the pattern).
4. Create `data/entries/<id>.js` with an empty `ENTRIES_<ID> = []` array.
5. Add the file to the concat list at the bottom of `build-data.js` is NOT needed — it reads `categories.js` automatically and discovers files by id.
6. Run `node build-data.js` then `node validate-data.js`.

**`app.js` never needs to change** as content scales — it only ever sees
the final flat `CATEGORIES` and `ENTRIES` arrays from the bundle.

## Entry format

```js
{
  word: "Atom",
  category: "science",   // must match a categories.js id exactly
  description: "..."     // ~180-200 words, simple and readable
}
```

## Validation rules enforced

- Every category in `categories.js` has a matching `data/entries/<id>.js` file
- No entry references a category id that doesn't exist
- No duplicate headwords within a category
- Description word counts flagged if outside 120–260 words
