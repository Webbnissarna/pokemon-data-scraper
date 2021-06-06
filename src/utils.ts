import { promises as fs } from "fs";
import axios from "axios";

export default {
  /**
   * Convert a roman numeral string (e.g. VIII) to its integer equivalent.
   * @param input roman numeral string
   * @returns integer value
   */
  romanNumeralToInt: function (input: string): number {
    const romanValues: Record<string, number> = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000,
    };
    const inputSymbols = input.toUpperCase().split("");

    let sum = 0;
    for (let i = 0; i < inputSymbols.length; i++) {
      const value = romanValues[inputSymbols[i]];

      if (i < inputSymbols.length - 1) {
        const nextValue = romanValues[inputSymbols[i + 1]];
        if (value >= nextValue) {
          sum += value;
        } else {
          sum -= value;
        }
      } else {
        sum += value;
      }
    }
    return sum;
  },

  /**
   * Convert language name to ISO 639-1 codes.
   * @param input language name
   * @returns ISO 639-1 language code string, or input if language code is not available
   */
  languageNameToCode: function (input: string): string {
    switch (input.toLowerCase()) {
      case "japanese":
        return "ja";
      case "french":
        return "fr";
      case "spanish":
        return "es";
      case "german":
        return "de";
      case "italian":
        return "it";
      case "korean":
        return "ko";
      case "thai":
        return "th";
      case "swedish":
        return "sv";
      case "arabic":
        return "ar";
      case "bulgarian":
        return "bg";
      case "hebrew":
        return "he";
      case "hindi":
        return "hi";
      case "lithuanian":
        return "li";
      case "brazilian portuguese":
      case "portuguese":
        return "pt";
      case "russian":
        return "ru";
      case "mandarin chinese":
      case "cantonese chinese":
        return "zh";
      case "albanian":
        return "sq";
      case "azerbaijani":
        return "az";
      case "greek":
        return "el";
      case "icelandic":
        return "is";
      case "indonesian":
        return "id";
      case "macedonian":
        return "mk";
      case "mongolian":
        return "mn";
      case "serbian":
        return "sr";
      case "turkish":
        return "tr";
      case "ukrainian":
        return "uk";
      default:
        return input;
    }
  },

  /** Attempts to extract the foreign name from Bulbapedias 'In other languages' title text (may not work perfectly) */
  findForeignName: function (input: string): string {
    const chars = input.split("");
    const foreignChars = [];
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] > "z") {
        foreignChars.push(chars[i]);
      } else if (foreignChars.length > 0) {
        return foreignChars.join("");
      } else if (i === 0) {
        return input;
      }
    }
    return input;
  },

  /**
   * Traverses the next siblings of a given dom element until it finds a sibling with the given tag name.
   * @param root element to start from
   * @param tag tag to look for
   * @param optionalClass if specified, target element must also have this class name
   * @returns sibling element matching the tag, or null if none is found
   */
  getNextSiblingOfTag: function (
    root: HTMLElement | null,
    tag: string,
    optionalClass?: string
  ): Element | null {
    if (root) {
      let el: Element = root;
      while (el.nextElementSibling !== null) {
        if (
          el.nextElementSibling.tagName.toLowerCase() === tag &&
          (!optionalClass ||
            [...el.nextElementSibling.classList].includes(optionalClass))
        ) {
          return el.nextElementSibling;
        } else {
          el = el.nextElementSibling;
        }
      }
    }
    return null;
  },

  /**
   * Returns the html of a given url. Uses cachePath if available, otherwise downloads and caches the data to cachePath.
   * @param url url to download
   * @param cachePath file path to cache for this url
   * @returns html string data of url
   */
  getPageHtml: async function (
    url: string,
    cachePath: string
  ): Promise<string> {
    let html;
    try {
      return await fs.readFile(cachePath, { encoding: "utf-8" });
    } catch (e) {
      html = await axios(url).then((res) => res.data);
      await fs.writeFile(cachePath, html);
      return html;
    }
  },

  /**
   * Downloads url as blob to cachePath if not already downloaded. Can be used to cache images etc.
   * @param url url to download
   * @param cachePath file path to cache for this blob
   */
  fetchBlob: async function (url: string, cachePath: string): Promise<void> {
    try {
      await fs.access(cachePath);
    } catch (e) {
      await axios({ url, method: "GET", responseType: "stream" }).then((res) =>
        fs.writeFile(cachePath, res.data)
      );
    }
  },
};
