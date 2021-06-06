import { promises as fs } from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import ScrapePaths from "./paths";
import ScrapeUtils from "./utils";
import {
  Ability,
  BasicMoveInfo,
  BasicPokemonInfo,
  LevelMove,
  MoveDescription,
  MoveInfo,
  Nature,
  PokemonInfo,
  TMMove,
  UnscrapedPokemonAndMoves,
} from "./types";

/**
 * Scrape the list of all Pokémon (only if needed, unless cache exists).
 * @returns Promise that resolves with a list of all Pokémon with basic info for each Pokémon.
 */
async function scrapePokemonIndexList(): Promise<BasicPokemonInfo[]> {
  interface GenerationTableRowObject {
    gen: string;
    row: HTMLTableRowElement;
  }
  interface GenerationTableObject {
    gen: string;
    rows: HTMLTableRowElement[];
  }

  const outCachePath = path.join(
    ScrapePaths.CACHEDIR_DATA,
    "pokemonIndexList.json"
  );

  try {
    return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
  } catch (error) {
    console.log("Scraping Pokémon index list...");

    const url = `${ScrapePaths.SCRAPING_BASE_URL}/wiki/List_of_Pok%C3%A9mon_by_National_Pok%C3%A9dex_number`;
    const cachePath = path.join(
      ScrapePaths.CACHEDIR_HTML,
      "pokemonIndexList.html"
    );
    const html = await ScrapeUtils.getPageHtml(url, cachePath);
    const dom = new JSDOM(html);

    let pokemon =
      /** Start from the header titles for each generation (e.g. Generation I, Generation II, etc.) */
      [
        ...dom.window.document.querySelectorAll(
          'span.mw-headline[id^="Generation"]'
        ),
      ]

        /** Map into objects with the roman generation numerals and all rows for that generation */
        .map(
          (headerElement) =>
            <GenerationTableObject>{
              gen: headerElement.textContent?.replace("Generation ", "") || "",
              rows: [
                /** Navigate into the table of Pokémon for the generation and grab all rows */
                ...(headerElement.parentElement?.nextElementSibling?.querySelectorAll(
                  "tr"
                ) || []),
              ]
                /** slice(1) to skip table header */
                .slice(1),
            }
        )

        /** Flatten all rows and merge in the generation value with each row */
        .reduce(
          (prev, genObj) => [
            ...prev,
            ...genObj.rows.map(
              (v) =>
                <GenerationTableRowObject>{
                  gen: genObj.gen,
                  row: v,
                }
            ),
          ],
          <GenerationTableRowObject[]>[]
        )

        /** Turn each row into a BasicPokemonInfo object */
        .map(
          (pokemonRow) =>
            <BasicPokemonInfo>{
              no: parseInt(
                pokemonRow.row.children[1].textContent?.replace("#", "") || "-1"
              ),
              name: pokemonRow.row.children[3].textContent?.trim(),
              gen: ScrapeUtils.romanNumeralToInt(pokemonRow.gen),
              scrapeUrl: `${ScrapePaths.SCRAPING_BASE_URL}/${
                pokemonRow.row.children[3].querySelector("a")?.href
              }`,
            }
        );

    /** Remove duplicates (alt forms - will process that in the deeper Pokémon scrape) */
    pokemon = pokemon.filter(
      (p) => pokemon.filter((o) => o.no === p.no)[0] === p
    );

    await fs.writeFile(outCachePath, JSON.stringify(pokemon, null, 2));

    console.log("Pokémon index list scraped");
    return pokemon;
  }
}

/**
 * Scrape the full info on a Pokémon (only if needed, unless cache exists).
 * @param pokemonInfo Basic info for the Pokémon to scrape.
 * @param returnData `true` to return the data if cache exists. `false` to only check if cache exists and skip reading it. Defaults to `false`.
 * @returns Promise that resolves to the full Pokémon info object, or nothing if cache hit occurred and `returnData` is `false`.
 */
async function scrapePokemon(
  pokemonInfo: BasicPokemonInfo,
  returnData = false
): Promise<PokemonInfo | void> {
  const outCachePath = path.join(
    ScrapePaths.CACHEDIR_DATA_POKEMON,
    `${pokemonInfo.no}.json`
  );

  const imageCachePath = path.join(
    ScrapePaths.CACHEDIR_DATA_POKEMON,
    `${pokemonInfo.no}.png`
  );

  try {
    await fs.stat(imageCachePath);
    if (returnData) {
      return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
    } else {
      await fs.stat(outCachePath);
    }
  } catch (error) {
    console.log(`Scraping ${pokemonInfo.no} ${pokemonInfo.name}...`);
    const cachePath = path.join(
      ScrapePaths.CACHEDIR_HTML_POKEMON,
      `${pokemonInfo.no}.html`
    );
    const html = await ScrapeUtils.getPageHtml(
      pokemonInfo.scrapeUrl,
      cachePath
    );
    const dom = new JSDOM(html);

    const infoTableDom = [
      ...dom.window.document.querySelectorAll<HTMLElement>("table.roundy"),
    ].filter((t) => t.style.float === "right")[0];

    let learnsetTable = ScrapeUtils.getNextSiblingOfTag(
      dom.window.document.querySelector("#Learnset")?.parentElement || null,
      "table"
    )?.querySelector("table.sortable");

    const domTMSpan = dom.window.document.querySelector('span[id^="By_TM"]');

    let tmTable = domTMSpan
      ? ScrapeUtils.getNextSiblingOfTag(
          domTMSpan.parentElement || null,
          "table"
        )?.querySelector("table.sortable")
      : null;

    if (learnsetTable === null) {
      /** Table has no data, most likely because of no game data for VIII */
      /** Need to scrap from the latest learnset page */
      const domLatestGenLearnsetAnchor =
        dom.window.document.querySelector<HTMLAnchorElement>(
          'a[title$=" learnset"]:last-child'
        );

      const learnsetUrl = `${ScrapePaths.SCRAPING_BASE_URL}/${domLatestGenLearnsetAnchor?.href}`;

      const learnsetCachePath = path.join(
        ScrapePaths.CACHEDIR_HTML_POKEMON,
        `${pokemonInfo.no}_learnset.html`
      );

      const learnsetHtml = await ScrapeUtils.getPageHtml(
        learnsetUrl,
        learnsetCachePath
      );

      const learnsetDom = new JSDOM(learnsetHtml);

      learnsetTable = ScrapeUtils.getNextSiblingOfTag(
        learnsetDom.window.document.querySelector("#By_leveling_up")
          ?.parentElement || null,
        "table"
      )?.querySelector("table.sortable");

      tmTable = ScrapeUtils.getNextSiblingOfTag(
        learnsetDom.window.document.querySelector('span[id^="By_TM"]')
          ?.parentElement || null,
        "table"
      )?.querySelector("table.sortable");
    }

    const pokemon: PokemonInfo = {
      nationalDexNo: pokemonInfo.no,

      name: [
        {
          lang: "en",
          value: pokemonInfo.name,
        },
        ...[
          ...(ScrapeUtils.getNextSiblingOfTag(
            dom.window.document.querySelector("#In_other_languages")
              ?.parentElement || null,
            "table",
            "roundy"
          )?.querySelectorAll("table") || []),
        ]
          .map((tb) =>
            [...tb.querySelectorAll("tr")].filter(
              (tr) =>
                tr.querySelectorAll("th").length === 0 &&
                tr.children.length === 3
            )
          )
          .reduce((p, c) => [...p, ...c], [])
          .map((tr) => ({
            lang: ScrapeUtils.languageNameToCode(
              tr.children[0].textContent?.trim() || ""
            ),
            value: ScrapeUtils.findForeignName(
              tr.children[1].textContent?.trim() || ""
            ).replace("*", ""),
          })),
      ],

      category:
        infoTableDom.querySelector('a[title="Pokémon category"]')
          ?.firstElementChild?.textContent || "",

      types: [
        ...[...(<HTMLCollectionOf<HTMLElement>>infoTableDom
            ?.querySelector(
              'a[title="Type"]'
            ) /** Start from the Type header text */
            ?.parentElement /** surrounding b tag */
            ?.nextElementSibling /** table containing */
            ?.querySelector(
              "tr"
            ) /** first row */?.children || [])] /** td elements */
          .filter(
            (td) => td && td.style.display !== "none"
          )[0] /** only visible */
          .querySelectorAll("td"),
      ] /** inner table cells */
        .filter((td) => td && td.style.display !== "none") /** only visible */
        .map(
          (td) =>
            td.querySelector('a[title$=" (type)"] span')?.textContent || ""
        ) /** inner texts */,

      moves: {
        leveling: [...(learnsetTable?.querySelectorAll("tr") || [])]
          .map((tr) => [...tr.querySelectorAll("td")])
          .filter((c) => c.length > 0)
          .map((cells) => (cells.length > 7 ? cells.slice(1) : cells)) // Remove SM column for SM/USUM splitted tables
          .map(
            (cells) =>
              <LevelMove>{
                level: parseInt(
                  cells[0].querySelector("span")?.textContent?.trim() || ""
                ),
                move: cells[1].textContent?.trim(),
              }
          ),

        tm: [...(tmTable?.querySelectorAll("tr") || [])]
          .map((tr) => tr.querySelectorAll("td"))
          .filter((c) => c.length > 0)
          .map(
            (cells) =>
              <TMMove>{
                tm: parseInt(
                  cells[1]
                    .querySelector("span")
                    ?.textContent?.trim()
                    .slice(2) || ""
                ),
                move: cells[2].textContent?.trim(),
              }
          ),
      },
    };

    await fs.writeFile(outCachePath, JSON.stringify(pokemon, null, 2));

    /** Scrape image */
    const imageUrl = `https://bulbapedia.bulbagarden.net/${
      (<HTMLAnchorElement>(
        infoTableDom?.querySelector('td[colspan="4"] img')?.parentElement
      ))?.href
    }`;

    const imageHtmlCachePath = path.join(
      ScrapePaths.CACHEDIR_HTML_POKEMON,
      `${pokemonInfo.no}_img.html`
    );

    await scrapeImage(imageUrl, imageHtmlCachePath, imageCachePath);

    console.log(`${pokemonInfo.no} ${pokemonInfo.name} scraped`);
    return pokemon;
  }
}

/**
 * Scrape an image (only if needed, unless cache exists).
 * @param url Image URL to scrape.
 * @param htmlCachePath Path to Image URL HTML cache file.
 * @param imageCachePath Path to Image cache file.
 */
async function scrapeImage(
  url: string,
  htmlCachePath: string,
  imageCachePath: string
): Promise<void> {
  const html = await ScrapeUtils.getPageHtml(url, htmlCachePath);
  const dom = new JSDOM(html);
  const fullUrl = `https://${dom.window.document
    .querySelector<HTMLAnchorElement>("div.fullImageLink a")
    ?.href.slice(2)}`;

  await ScrapeUtils.fetchBlob(fullUrl, imageCachePath);
}

/**
 * Scrape the list of all Moves (only if needed, unless cache exists).
 * @returns Promise that resolves with a list of all Moves with basic info for each Move.
 */
async function scrapeMovesList(): Promise<BasicMoveInfo[]> {
  const outCachePath = path.join(ScrapePaths.CACHEDIR_DATA, "movesList.json");

  try {
    return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
  } catch (error) {
    console.log("Scraping Move list...");
    const url = `${ScrapePaths.SCRAPING_BASE_URL}/wiki/List_of_moves`;
    const cachePath = path.join(ScrapePaths.CACHEDIR_HTML, "movesList.html");
    const html = await ScrapeUtils.getPageHtml(url, cachePath);
    const dom = new JSDOM(html);

    const movesCells = [
      ...(dom.window.document
        .querySelector("table table tbody")
        ?.querySelectorAll("tr") || []),
    ]
      .map((tr) => [...tr.querySelectorAll("td")])
      .filter((rows) => rows.length > 0)
      .map((rowCells) => [
        ...rowCells.map((rc) => rc.textContent?.trim()),
        rowCells[1].querySelector("a")?.href,
      ]); /** Append name link for more scraping */

    const movesList = movesCells.map(
      (rowCells) =>
        <BasicMoveInfo>{
          indexNo: parseInt(rowCells[0] || ""),
          name: [{ lang: "en", value: rowCells[1]?.replace("*", "") }],
          type: rowCells[2],
          category: rowCells[3],
          pp: parseInt(rowCells[5]?.replace("*", "") || ""),
          power:
            rowCells[6] === "—"
              ? -1
              : parseInt(rowCells[6]?.replace("*", "") || ""),
          accuracy:
            rowCells[7] === "—"
              ? -1
              : parseInt(rowCells[7]?.replace("*", "").replace("%", "") || ""),
          gen: ScrapeUtils.romanNumeralToInt(
            rowCells[8]?.replace("*", "") || ""
          ),
          scrapeUrl: `${ScrapePaths.SCRAPING_BASE_URL}/${rowCells[9]}`,
        }
    );

    await fs.writeFile(outCachePath, JSON.stringify(movesList, null, 2));

    console.log("Move list scraped");
    return movesList;
  }
}

/**
 * Scrape the list of all Z-Moves (only if needed, unless cache exists).
 * @returns Promise that resolves with a list of all Z-Move names.
 */
async function scrapeZMovesList(): Promise<string[]> {
  const outCachePath = path.join(ScrapePaths.CACHEDIR_DATA, "zMovesList.json");

  try {
    return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
  } catch (error) {
    console.log("Scraping Z-Move list...");
    const url = `${ScrapePaths.SCRAPING_BASE_URL}/wiki/Z-Move`;
    const cachePath = path.join(ScrapePaths.CACHEDIR_HTML, "zMovesList.html");
    const html = await ScrapeUtils.getPageHtml(url, cachePath);
    const dom = new JSDOM(html);

    const typedMoves = [
      ...(ScrapeUtils.getNextSiblingOfTag(
        dom.window.document.querySelector("#List_of_Z-Moves")?.parentElement ||
          null,
        "table"
      )
        ?.querySelector("table")
        ?.querySelectorAll("tr") || []),
    ]
      .map((tr) => tr.querySelector("td"))
      .filter((t) => t)
      .map((t) => t?.querySelector("a")?.textContent?.trim() || "");

    const specificMoves = [
      ...(ScrapeUtils.getNextSiblingOfTag(
        dom.window.document.querySelector('[id^="For_specific_Pok"')
          ?.parentElement || null,
        "table"
      )
        ?.querySelector("table")
        ?.querySelectorAll("tbody tr") || []),
    ]
      .map((tr) => tr.querySelectorAll("td"))
      .filter((t) => t.length > 1)
      .map((tds) => tds[1]?.querySelector("a")?.textContent?.trim() || "");

    const allZMoves = [...typedMoves, ...specificMoves];
    await fs.writeFile(outCachePath, JSON.stringify(allZMoves, null, 2));

    console.log("Z-Move list scraped");
    return allZMoves;
  }
}

/** Scrape deeper data on a given move */

/**
 * Scrape the full info on a Move (only if needed, unless cache exists).
 * @param moveInfo Basic info for the Move to scrape.
 * @param returnData `true` to return the data if cache exists. `false` to only check if cache exists and skip reading it. Defaults to `false`.
 * @returns Promise that resolves to the full Move info object, or nothing if cache hit occurred and `returnData` is `false`.
 */
async function scrapeMove(
  moveInfo: BasicMoveInfo,
  returnData = false
): Promise<MoveInfo | void> {
  const jsonCachePath = path.join(
    ScrapePaths.CACHEDIR_DATA_MOVES,
    `${moveInfo.indexNo}.json`
  );

  try {
    if (returnData) {
      return JSON.parse(await fs.readFile(jsonCachePath, "utf-8"));
    } else {
      fs.stat(jsonCachePath);
    }
  } catch (error) {
    console.log(
      `Scraping (Move) ${moveInfo.indexNo} ${moveInfo.name[0].value}...`
    );
    const htmlCachePath = path.join(
      ScrapePaths.CACHEDIR_HTML_MOVES,
      `${moveInfo.indexNo}.html`
    );
    const html = await ScrapeUtils.getPageHtml(
      moveInfo.scrapeUrl,
      htmlCachePath
    );
    const dom = new JSDOM(html);

    const moveData: MoveInfo = {
      ...moveInfo,
      description: [
        ...(dom.window.document
          .querySelector("#Description")
          ?.parentElement?.nextElementSibling?.querySelector("table")
          ?.querySelectorAll("tr") || []),
      ]
        .map((tr) => tr.querySelectorAll("td"))
        .filter((c) => c.length > 0)
        .map(
          (cells) =>
            <MoveDescription>{
              desc: cells[1].textContent?.trim(),
              games: [
                ...cells[0].querySelectorAll<HTMLAnchorElement>("a[title]"),
              ].map((a) => a.title),
            }
        ),
    };
    await fs.writeFile(jsonCachePath, JSON.stringify(moveData, null, 2));

    console.log(`(Move) ${moveInfo.name[0].value} scraped`);
    return moveData;
  }
}

/**
 * Scrape the list of all Natures (only if needed, unless cache exists).
 * @returns Promise that resolves with a list of all Natures.
 */
async function scrapeNaturesList(): Promise<Nature[]> {
  const outCachePath = path.join(ScrapePaths.CACHEDIR_DATA, "naturesList.json");

  try {
    return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
  } catch (error) {
    console.log("Scraping Nature list...");
    const url = `${ScrapePaths.SCRAPING_BASE_URL}/wiki/Nature`;
    const cachePath = path.join(ScrapePaths.CACHEDIR_HTML, "naturesList.html");
    const html = await ScrapeUtils.getPageHtml(url, cachePath);
    const dom = new JSDOM(html);

    const naturesList: Nature[] = [
      ...(dom.window.document
        .querySelector("table.sortable tbody")
        ?.querySelectorAll("tr") || []),
    ]
      .map((tr) =>
        [...tr.querySelectorAll("td, th")].map((td) => td.textContent?.trim())
      )
      .filter((rows) => (rows[0]?.length || 0) > 0)
      .map(
        (rowCells) =>
          <Nature>{
            indexNo: parseInt(rowCells[0] || ""),
            name: [
              {
                lang: "en",
                value: rowCells[1],
              },
              { lang: "ja", value: rowCells[2] },
            ],
            increasedStat: rowCells[3] === "—" ? null : rowCells[3],
            decreasedStat: rowCells[4] === "—" ? null : rowCells[4],
          }
      );

    await fs.writeFile(outCachePath, JSON.stringify(naturesList, null, 2));

    console.log("Nature list scraped");
    return naturesList;
  }
}

/**
 * Scrape the list of all Abilities (only if needed, unless cache exists).
 * @returns Promise that resolves with a list of all Abilities.
 */
async function scrapeAbilitiesList(): Promise<Ability[]> {
  const outCachePath = path.join(
    ScrapePaths.CACHEDIR_DATA,
    "abilitiesList.json"
  );
  try {
    return JSON.parse(await fs.readFile(outCachePath, "utf-8"));
  } catch (error) {
    console.log("Scraping Ability list...");
    const url = `${ScrapePaths.SCRAPING_BASE_URL}/wiki/Ability`;
    const cachePath = path.join(
      ScrapePaths.CACHEDIR_HTML,
      "abilitiesList.html"
    );
    const html = await ScrapeUtils.getPageHtml(url, cachePath);
    const dom = new JSDOM(html);

    const abilitiesList: Ability[] = [
      ...(dom.window.document
        .querySelector("#List_of_Abilities")
        ?.parentElement?.nextElementSibling?.querySelector("table tbody")
        ?.querySelectorAll("tr") || []),
    ]
      .map((tr) =>
        [...tr.querySelectorAll("td, th")].map(
          (td) => td.textContent?.trim() || ""
        )
      )
      .filter((rows, i) => i > 0 && rows.length > 0 && rows[0].length > 0)
      .map(
        (rowCells) =>
          <Ability>{
            indexNo: parseInt(rowCells[0]) || -1,
            name: [{ lang: "en", value: rowCells[1] }],
            description: rowCells[2],
            gen: ScrapeUtils.romanNumeralToInt(rowCells[3]),
          }
      )
      .filter((a) => a.gen);
    abilitiesList.sort((a, b) => a.indexNo - b.indexNo);

    await fs.writeFile(outCachePath, JSON.stringify(abilitiesList, null, 2));

    console.log("Ability list scraped");
    return abilitiesList;
  }
}

/**
 * Check which Pokémon and Moves are not scraped from the lists given.
 * @param pokemonList List of Pokémon to check.
 * @param movesList List of Moves to check.
 * @returns Object with lists of unscraped Pokémon and Moves.
 */
async function getUnscraped(
  pokemonList: BasicPokemonInfo[],
  movesList: BasicMoveInfo[]
): Promise<UnscrapedPokemonAndMoves> {
  const allScrapedPokemon = (
    await fs.readdir(ScrapePaths.CACHEDIR_DATA_POKEMON)
  )
    .filter((f) => f.endsWith(".json"))
    .map((f) => parseInt(f.slice(0, f.indexOf("."))))
    .sort((a, b) => a - b);

  const unscrapedPokemon = pokemonList.filter(
    (p) => allScrapedPokemon.indexOf(p.no) === -1
  );

  const allScrapedMoves = (await fs.readdir(ScrapePaths.CACHEDIR_DATA_MOVES))
    .map((f) => parseInt(f.slice(0, f.indexOf("."))))
    .sort((a, b) => a - b);

  const unscrapedMoves = movesList.filter(
    (p) => allScrapedMoves.indexOf(p.indexNo) === -1
  );

  return {
    pokemon: unscrapedPokemon,
    moves: unscrapedMoves,
  };
}

/**
 * Scrape all Pokémon given, with a delay in-between to avoid rate-limiting.
 * @param pokemonList List of Pokémon to scrape.
 */
async function slowScrapeAllPokemon(
  pokemonList: BasicPokemonInfo[]
): Promise<void> {
  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    await scrapePokemon(pokemon);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Scrape all Moves given, with a delay in-between to avoid rate-limiting.
 * @param movesList List of Moves to scrape.
 */
async function slowScrapeAllMoves(movesList: BasicMoveInfo[]): Promise<void> {
  for (let i = 0; i < movesList.length; i++) {
    const move = movesList[i];
    await scrapeMove(move);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export default {
  scrapePokemonIndexList,
  scrapePokemon,
  scrapeImage,
  scrapeMovesList,
  scrapeZMovesList,
  scrapeMove,
  scrapeNaturesList,
  scrapeAbilitiesList,
  getUnscraped,
  slowScrapeAllPokemon,
  slowScrapeAllMoves,
};
