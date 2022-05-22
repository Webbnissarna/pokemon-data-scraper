# Pokémon Data Scraper

**TODO: Rewrite to use Bulbapedia API**

Scrapes Bulbapedia for Pokémon data (Pokémons, Moves, Abilities etc.) into JSON files.

## Usage

1. Run `yarn install` to install all dependencies.
2. Run `yarn start` to scrape all Pokémon, Moves, Abilities, and Natures. This process can take a while (>10 minutes).

## Settings

Some settings can be changed by environment variables:

| Name                | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| `BASE_CACHE_DIR`    | Base dir to store cache and output in. Defaults to `./_pokecache`. |
| `SCRAPING_BASE_URL` | Base url to scrape from. Defaults to Bulbapedia.                   |
