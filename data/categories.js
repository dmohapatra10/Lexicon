// ============================================
// LEXICON — Category Registry
// Single source of truth for all categories.
// Each category needs a matching pair of CSS
// variables in style.css: --acc-<id> and
// --acc-<id>-bg (see the "CATEGORY ACCENTS"
// section near the top of style.css).
//
// Adding a new category:
//   1. Add an entry to CATEGORIES below.
//   2. Add --acc-<id> / --acc-<id>-bg to style.css.
//   3. Add the per-category accent-coding rule
//      block in style.css (search "accent-science"
//      for the pattern to copy).
//   4. Create data/entries/<id>.js with its ENTRIES.
//   5. Register the file in data/index.js.
// ============================================

const CATEGORIES = [
  {
    id: "science",
    name: "Science",
    tag: "SCI",
    accent: "science",
    description: "The forces, particles, and patterns that explain how the natural world works."
  },
  {
    id: "mythology",
    name: "Mythology",
    tag: "MYTH",
    accent: "mythology",
    description: "Gods, monsters, and legends passed down through ancient cultures."
  },
  {
    id: "art",
    name: "Art",
    tag: "ART",
    accent: "art",
    description: "Movements, techniques, and ideas that shaped how humans create and see."
  },
  {
    id: "history",
    name: "History",
    tag: "HIST",
    accent: "history",
    description: "Turning points, empires, and events that shaped the world we live in."
  },
  {
    id: "geography",
    name: "Geography",
    tag: "GEO",
    accent: "geography",
    description: "Places, landforms, and the physical features that shape life on Earth."
  },
  {
    id: "philosophy",
    name: "Philosophy",
    tag: "PHIL",
    accent: "philosophy",
    description: "Big questions about truth, ethics, and existence, and the thinkers behind them."
  },
  {
    id: "literature",
    name: "Literature",
    tag: "LIT",
    accent: "literature",
    description: "Writers, movements, and ideas that shaped the written word."
  },
  {
    id: "music",
    name: "Music",
    tag: "MUS",
    accent: "music",
    description: "Genres, instruments, and the people who shaped how the world listens."
  },
  {
    id: "technology",
    name: "Technology",
    tag: "TECH",
    accent: "technology",
    description: "Inventions and innovations that changed how humans build and connect."
  },
  {
    id: "psychology",
    name: "Psychology",
    tag: "PSYC",
    accent: "psychology",
    description: "How the mind works, from memory and emotion to behavior and bias."
  },
  {
    id: "biology",
    name: "Biology",
    tag: "BIO",
    accent: "biology",
    description: "Life itself: cells, organisms, evolution, and how living things work."
  },
  {
    id: "astronomy",
    name: "Astronomy",
    tag: "ASTRO",
    accent: "astronomy",
    description: "Stars, planets, and the vast scale of the universe beyond Earth."
  },
  {
    id: "economics",
    name: "Economics",
    tag: "ECON",
    accent: "economics",
    description: "How money, markets, and trade shape decisions and societies."
  },
  {
    id: "politics",
    name: "Politics",
    tag: "POL",
    accent: "politics",
    description: "Power, government, and the systems people use to organize societies."
  },
  {
    id: "religion",
    name: "Religion",
    tag: "REL",
    accent: "religion",
    description: "Beliefs, practices, and traditions that shape how people find meaning."
  },
  {
    id: "architecture",
    name: "Architecture",
    tag: "ARCH",
    accent: "architecture",
    description: "Styles, structures, and the ideas behind how humans design buildings."
  },
  {
    id: "film",
    name: "Film",
    tag: "FILM",
    accent: "film",
    description: "Movements, techniques, and figures that shaped cinema."
  },
  {
    id: "sports",
    name: "Sports",
    tag: "SPRT",
    accent: "sports",
    description: "Games, athletes, and the rules and records that define competition."
  },
  {
    id: "food",
    name: "Food & Cuisine",
    tag: "FOOD",
    accent: "food",
    description: "Dishes, ingredients, and culinary traditions from around the world."
  },
  {
    id: "fashion",
    name: "Fashion",
    tag: "FASH",
    accent: "fashion",
    description: "Styles, designers, and movements that shaped how people dress."
  },
  {
    id: "medicine",
    name: "Medicine",
    tag: "MED",
    accent: "medicine",
    description: "The science and history of healing, diagnosis, and the human body."
  },
  {
    id: "mathematics",
    name: "Mathematics",
    tag: "MATH",
    accent: "mathematics",
    description: "Numbers, patterns, and the logic underlying the world."
  },
  {
    id: "law",
    name: "Law",
    tag: "LAW",
    accent: "law",
    description: "Rules, rights, and the systems societies use to settle disputes."
  },
  {
    id: "linguistics",
    name: "Linguistics",
    tag: "LING",
    accent: "linguistics",
    description: "How language works: sounds, grammar, meaning, and change over time."
  },
  {
    id: "nature",
    name: "Nature & Ecology",
    tag: "ECO",
    accent: "nature",
    description: "Ecosystems, species, and the relationships that sustain the natural world."
  },
  {
    id: "warfare",
    name: "Warfare",
    tag: "MIL",
    accent: "warfare",
    description: "Battles, strategy, and the military history that shaped nations."
  },
  {
    id: "anthropology",
    name: "Anthropology",
    tag: "ANTH",
    accent: "anthropology",
    description: "Human cultures, societies, and customs across time and place."
  },
  {
    id: "chemistry",
    name: "Chemistry",
    tag: "CHEM",
    accent: "chemistry",
    description: "Elements, reactions, and the building blocks of matter."
  },
  {
    id: "exploration",
    name: "Exploration",
    tag: "EXPL",
    accent: "exploration",
    description: "Voyages, discoveries, and the people who mapped the unknown."
  },
  {
    id: "folklore",
    name: "Folklore",
    tag: "FOLK",
    accent: "folklore",
    description: "Traditional stories, customs, and beliefs passed down through generations."
  }
];
