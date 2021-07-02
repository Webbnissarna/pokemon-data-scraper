import dotenv from "dotenv";
dotenv.config();

import Scrape from "./src/scrape";
import ScrapePaths from "./src/paths";
import { exit } from "process";
import { promises as fsp } from "fs";
import path from "path/posix";
import { PokemonInfo } from "./src/types";

(async () => {
  try {
    console.log("Running full Pokémon data scrape...");

    await ScrapePaths.ensurePaths();

    const basicPokemonList = await Scrape.scrapePokemonIndexList();
    const basicMovesList = await Scrape.scrapeMovesList();

    const unscraped = await Scrape.getUnscraped(
      basicPokemonList,
      basicMovesList
    );
    console.log(
      `Unscraped Pokémon=${unscraped.pokemon.length} Moves=${unscraped.moves.length}`
    );

    await Promise.all([
      Scrape.slowScrapeAllPokemon(unscraped.pokemon),
      Scrape.slowScrapeAllMoves(unscraped.moves),
      Scrape.scrapeNaturesList(),
      Scrape.scrapeAbilitiesList(),
      Scrape.scrapeZMovesList(),
    ]);

    console.log("analyzing metadata...");

    const pokemonJsonsList = (
      await fsp.readdir(ScrapePaths.CACHEDIR_DATA_POKEMON)
    ).filter((f) => f.endsWith(".json"));

    const metadata = await pokemonJsonsList.reduce(
      async (outDataPromise, filePath) => {
        const outData = await outDataPromise;

        const rawData = await fsp.readFile(
          path.join(ScrapePaths.CACHEDIR_DATA_POKEMON, filePath),
          "utf-8"
        );
        const pokemon = JSON.parse(rawData) as PokemonInfo;

        return {
          ...outData,

          /** map of all languages for pokemon names, with counts per language */
          languages: (() => {
            const previousLanguages = <{ [key: string]: number }>(
              (outData.languages ?? {})
            );
            const pokemonLanguages = <{ [key: string]: number }>Object.keys(
              pokemon.name
            ).reduce(
              (obj, key) => ({
                ...obj,
                [key]: 1,
              }),
              {}
            );
            const allKeys = [
              ...new Set([
                ...Object.keys(previousLanguages),
                ...Object.keys(pokemonLanguages),
              ]),
            ];
            const merged = allKeys.reduce(
              (obj, key) => ({
                ...obj,
                [key]:
                  (previousLanguages[key] ?? 0) + (pokemonLanguages[key] ?? 0),
              }),
              {}
            );

            return merged;
          })(),
        };
      },
      Promise.resolve<{ [key: string]: unknown }>({
        lastRun: Date.now(),
        pokemonCount: pokemonJsonsList.length,
      })
    );

    console.log("metadata results", metadata);

    await fsp.writeFile(
      path.join(ScrapePaths.CACHEDIR_DATA, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    console.log("done!");
  } catch (error) {
    console.error("Error during scrape", error);
    exit(-1);
  }
})();
