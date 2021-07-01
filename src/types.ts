/**
 * String representation of a Pokémon stat.
 */
export type Stat =
  | "Attack"
  | "Defense"
  | "Speed"
  | "Sp. Attack"
  | "Sp. Defense";

/**
 * Object with basic/incomplete Pokémon info.
 */
export interface BasicPokemonInfo {
  /**
   * National Dex number of this Pokémon.
   */
  no: number;

  /**
   * English name if this Pokémon.
   */
  name: string;

  /**
   * Generation where this Pokémon was first introduced.
   */
  gen: number;

  /**
   * URL where more detailed info for on Pokémon can be scraped from.
   */
  scrapeUrl: string;
}

/**
 * Wrapper for a localized string value.
 */
export interface LocalizedStringMap {
  [lang: string]: string;
}

/**
 * Info for a Move gained by leveling.
 */
export interface LevelMove {
  /**
   * Level at which the Move is gained.
   */
  level: number;

  /**
   * English name of the Move.
   */
  move: string;
}

/**
 * Info for a Move gained by TM.
 */
export interface TMMove {
  /**
   * TM number of this Move (in the latest gen).
   */
  tm: number;

  /**
   * English name of the Move.
   */
  move: string;
}

/**
 * Aggregated Moves info.
 */
export interface PokemonMoves {
  /**
   * List of Moves gained by leveling.
   */
  leveling: LevelMove[];

  /**
   * List of Moves learned by TM.
   */
  tm: TMMove[];
}

/**
 * Object with Pokémon info.
 */
export interface PokemonInfo {
  /**
   * National Dex No of this Pokémon.
   */
  nationalDexNo: number;

  /**
   * List of localized names for this Pokémon.
   */
  name: LocalizedStringMap;

  /**
   * Category (species) of this Pokémon.
   */
  category: string;

  /**
   * List of Types of this Pokémon.
   */
  types: string[];

  /**
   * List of Moves for this Pokémon.
   */
  moves: PokemonMoves;

  /**
   * Base64-encoded image of this Pokémon.
   */
  imageData: string;

  // not yet implemented
  //abilities?: null;
  //hiddenAbility?: null;
  //genderRatio?: null;
  //learnset?: null;
  //catchRate?: null;
  //eggGroup?: null;
  //hatchTime?: null;
  //height?: null;
  //weight?: null;
  //expYield?: null;
  //levelingRate?: null;
  //evYield?: null;
  //forms?: null;
}

/**
 * Object with basic/incomplete Move info.
 */
export interface BasicMoveInfo {
  /**
   * Index No (across all gens) of this Move.
   */
  indexNo: number;

  /**
   * List of localized names for this Move.
   */
  name: LocalizedStringMap;

  /**
   * Type of this Move.
   */
  type: string;

  /**
   * Category of this Move.
   */
  category: "Physical" | "Special" | "Status" | "???";

  /**
   * PP amount of this Move.
   */
  pp: number;

  /**
   * Power value of this Move, or -1 if no Power is applicable.
   */
  power: number;

  /**
   * Accuracy value (in percentage from 0-100) of this Move, or -1 if no Accuracy is applicable.
   */
  accuracy: number;

  /**
   * Gen No that first introduced this Move.
   */
  gen: number;

  /**
   * URL where more detailed info on this Move can be scraped from.
   */
  scrapeUrl: string;
}

/**
 * Object with flavor text description for a Move.
 */
export interface MoveDescription {
  /**
   * English flavor text.
   */
  desc: string;

  /**
   * List of Pokémon games (shortnames) that uses this description.
   */
  games: string[];
}

/**
 * Object with Move info.
 */
export interface MoveInfo extends BasicMoveInfo {
  /**
   * List of descriptions (flavor text) for this Move.
   */
  description: MoveDescription[];
}

/**
 * Object with Nature info.
 */
export interface Nature {
  /**
   * Index No (across all gens) of this Nature.
   */
  indexNo: number;

  /**
   * List of localized names for this Nature.
   */
  name: LocalizedStringMap;

  /**
   * Name of stat that this Nature increases, or null if not applicable.
   */
  increasedStat: Stat | null;

  /**
   * Name of stat that this Nature decreases, or null if not applicable.
   */
  decreasedStat: Stat | null;
}

/**
 * Object with Ability info.
 */
export interface Ability {
  /**
   * Index No (across all gens) of this Ability.
   */
  indexNo: number;

  /**
   * List of localized names for this Ability.
   */
  name: LocalizedStringMap;

  /**
   * English description of this Ability.
   */
  description: string;

  /**
   * Gen No that first introduced this Ability.
   */
  gen: number;
}

/**
 * Wrapper for unscrapped data.
 */
export interface UnscrapedPokemonAndMoves {
  /**
   * List of Pokémon that has not been scraped/cached.
   */
  pokemon: BasicPokemonInfo[];

  /**
   * List of Moves that has not been scraped/cached.
   */
  moves: BasicMoveInfo[];
}
