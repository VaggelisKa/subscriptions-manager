import { describe, expect, test } from "vitest";
import { BRANDS, findBrand } from "./catalog";

const slugs = BRANDS.map((b) => b.slug);

describe("findBrand", () => {
  test.each([
    ["Netflix", "netflix"],
    ["netflix premium", "netflix"],
    ["Netflx", "netflix"],
    ["Chatgtp", "chatgpt"],
    ["OpenAI", "chatgpt"],
    ["You Tube", "youtube"],
    ["YouTube Music", "youtubemusic"],
    ["YouTube Premium", "youtube"],
    ["Disney+", "disneyplus"],
    ["Disney Plus", "disneyplus"],
    ["Spotify Family", "spotify"],
    ["Spotifyfamily", "spotify"],
    ["Amazon Prime Video", "primevideo"],
    ["Amazon Prime", "amazonprime"],
    ["GitHub Copilot", "githubcopilot"],
    ["GitHub", "github"],
    ["HBO Max", "hbomax"],
    ["Max", "hbomax"],
    ["1Password", "onepassword"],
    ["X", "x"],
    ["Crème Brûlée Club", null],
    ["Motion", null],
    ["Maximum", null],
    ["Gym", null],
    ["", null],
    [null, null],
    [undefined, null],
  ])("%j → %s", (name, slug) => {
    expect(findBrand(name)?.slug ?? null).toBe(slug);
  });

  test("returns the tile colour with the slug", () => {
    expect(findBrand("Netflix")).toEqual({ slug: "netflix", color: "#E50914" });
  });

  test("the same name gives the same answer twice (cached)", () => {
    expect(findBrand("Netflx")).toBe(findBrand("Netflx"));
  });
});

describe("catalog", () => {
  test("slugs are unique, lowercase and file-safe", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+$/);
  });

  test("every alias is lowercase and names its own brand", () => {
    for (const brand of BRANDS) {
      for (const alias of brand.aliases) {
        expect(alias).toBe(alias.toLowerCase());
        expect(findBrand(alias)?.slug, alias).toBe(brand.slug);
      }
    }
  });
});

