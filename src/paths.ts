import path from "path";
import mkdirp from "mkdirp";

const BASE_CACHE_DIR = process.env.BASE_CACHE_DIR || "./_pokecache";
const SCRAPING_BASE_URL =
  process.env.SCRAPING_BASE_URL || "https://bulbapedia.bulbagarden.net";

const CACHEDIR_HTML = path.join(BASE_CACHE_DIR, "html");
const CACHEDIR_HTML_POKEMON = path.join(CACHEDIR_HTML, "pokemon");
const CACHEDIR_HTML_MOVES = path.join(CACHEDIR_HTML, "moves");
const CACHEDIR_DATA = path.join("_pokecache", "data");
const CACHEDIR_DATA_POKEMON = path.join(CACHEDIR_DATA, "pokemon");
const CACHEDIR_DATA_MOVES = path.join(CACHEDIR_DATA, "moves");

export default {
  /**
   * Root dir for all caching. Defaults to `./_pokecache`.
   */
  BASE_CACHE_DIR,

  /**
   * Root dir for caching HTML files.
   */
  CACHEDIR_HTML,

  /**
   * Dir for caching Pokémon HTML files.
   */
  CACHEDIR_HTML_POKEMON,

  /**
   * Dir for caching Move HTML files.
   */
  CACHEDIR_HTML_MOVES,

  /**
   * Root dir for caching/storing output JSON data.
   */
  CACHEDIR_DATA,

  /**
   * Dir for caching/storing Pokémon JSON data.
   */
  CACHEDIR_DATA_POKEMON,

  /**
   * Dir for caching/storing Move JSON data.
   */
  CACHEDIR_DATA_MOVES,

  /**
   * Base URL for all scraping URLs. Defaults to `https://bulbapedia.bulbagarden.net`.
   */
  SCRAPING_BASE_URL,

  /**
   * Checks that all CACHEDIR_* paths exists, or creates them if needed.
   * @returns Promise that resolves when all dirs have been verified/created.
   */
  ensurePaths: async (): Promise<void> =>
    await Promise.all([
      mkdirp(CACHEDIR_HTML),
      mkdirp(CACHEDIR_HTML_POKEMON),
      mkdirp(CACHEDIR_HTML_MOVES),
      mkdirp(CACHEDIR_DATA),
      mkdirp(CACHEDIR_DATA_POKEMON),
      mkdirp(CACHEDIR_DATA_MOVES),
    ]).then(),
};
