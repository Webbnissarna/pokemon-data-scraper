import dotenv from "dotenv";
dotenv.config();

import Scrape from "./src/scrape";
import ScrapePaths from "./src/paths";
import { exit } from "process";

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

    await Scrape.slowScrapeAllPokemon(unscraped.pokemon);
    await Scrape.slowScrapeAllMoves(unscraped.moves);
    await Scrape.scrapeNaturesList();
    await Scrape.scrapeAbilitiesList();
    await Scrape.scrapeZMovesList();

    console.log("done!");
  } catch (error) {
    console.error("Error during scrape", error);
    exit(-1);
  }
})();
