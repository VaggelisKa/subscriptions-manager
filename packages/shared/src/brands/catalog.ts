/** A well-known subscription's logo tile, minus the glyph. */
export type Brand = {
  /** Names the glyph; each app maps it to its own asset in `icons.ts`. */
  slug: BrandSlug;
  /** Tile background; the glyph is white. */
  color: string;
};

type BrandEntry = {
  slug: string;
  color: string;
  aliases: readonly string[];
};

/**
 * Logos for common subscriptions, looked up by `findBrand`. Aliases are
 * lowercase names the subscription usually starts with; the matcher handles
 * spacing, "+" and small typos itself. The glyphs stay in each app
 * (`apps/web/src/lib/icons.ts`, `apps/native/src/lib/icons.ts`), keyed by slug.
 */
export const BRANDS = [
  {
    slug: "chatgpt",
    color: "#000000",
    aliases: ["chatgpt", "openai"],
  },
  {
    slug: "claude",
    color: "#D97757",
    aliases: ["claude", "anthropic"],
  },
  {
    slug: "perplexity",
    color: "#1FB8CD",
    aliases: ["perplexity"],
  },
  {
    slug: "gemini",
    color: "#1A73E8",
    aliases: ["gemini", "google gemini", "google ai"],
  },
  {
    slug: "githubcopilot",
    color: "#000000",
    aliases: ["github copilot", "copilot"],
  },
  {
    slug: "github",
    color: "#181717",
    aliases: ["github"],
  },
  {
    slug: "cursor",
    color: "#000000",
    aliases: ["cursor"],
  },
  {
    slug: "netflix",
    color: "#E50914",
    aliases: ["netflix"],
  },
  {
    slug: "primevideo",
    color: "#1F2E3E",
    aliases: ["prime video", "amazon prime video"],
  },
  {
    slug: "amazonprime",
    color: "#00A8E1",
    aliases: ["amazon prime", "prime", "amazon"],
  },
  {
    slug: "disneyplus",
    color: "#0E3D8A",
    aliases: ["disney plus", "disney"],
  },
  {
    slug: "hbomax",
    color: "#002BE7",
    aliases: ["hbo max", "hbo", "max"],
  },
  {
    slug: "viaplay",
    color: "#FE365F",
    aliases: ["viaplay"],
  },
  {
    slug: "appletv",
    color: "#000000",
    aliases: ["apple tv"],
  },
  {
    slug: "applemusic",
    color: "#FA243C",
    aliases: ["apple music"],
  },
  {
    slug: "applearcade",
    color: "#000000",
    aliases: ["apple arcade"],
  },
  {
    slug: "icloud",
    color: "#3693F3",
    aliases: ["icloud", "apple one", "apple"],
  },
  {
    slug: "paramountplus",
    color: "#0064FF",
    aliases: ["paramount plus", "paramount"],
  },
  {
    slug: "crunchyroll",
    color: "#FF5E00",
    aliases: ["crunchyroll"],
  },
  {
    slug: "dazn",
    color: "#000000",
    aliases: ["dazn"],
  },
  {
    slug: "mubi",
    color: "#000000",
    aliases: ["mubi"],
  },
  {
    slug: "youtubemusic",
    color: "#FF0000",
    aliases: ["youtube music", "yt music"],
  },
  {
    slug: "youtube",
    color: "#FF0000",
    aliases: ["youtube", "yt premium"],
  },
  {
    slug: "twitch",
    color: "#9146FF",
    aliases: ["twitch"],
  },
  {
    slug: "spotify",
    color: "#1ED760",
    aliases: ["spotify"],
  },
  {
    slug: "tidal",
    color: "#000000",
    aliases: ["tidal"],
  },
  {
    slug: "deezer",
    color: "#A238FF",
    aliases: ["deezer"],
  },
  {
    slug: "soundcloud",
    color: "#FF5500",
    aliases: ["soundcloud"],
  },
  {
    slug: "audible",
    color: "#F8991C",
    aliases: ["audible"],
  },
  {
    slug: "playstation",
    color: "#0070D1",
    aliases: ["playstation", "ps plus", "psn"],
  },
  {
    slug: "xbox",
    color: "#107C10",
    aliases: ["xbox", "game pass"],
  },
  {
    slug: "microsoft",
    color: "#0078D4",
    aliases: ["microsoft", "office 365", "office", "m365"],
  },
  {
    slug: "adobe",
    color: "#FF0000",
    aliases: ["adobe", "photoshop", "lightroom", "creative cloud"],
  },
  {
    slug: "figma",
    color: "#F24E1E",
    aliases: ["figma"],
  },
  {
    slug: "notion",
    color: "#000000",
    aliases: ["notion"],
  },
  {
    slug: "linear",
    color: "#5E6AD2",
    aliases: ["linear"],
  },
  {
    slug: "slack",
    color: "#4A154B",
    aliases: ["slack"],
  },
  {
    slug: "zoom",
    color: "#0B5CFF",
    aliases: ["zoom"],
  },
  {
    slug: "dropbox",
    color: "#0061FF",
    aliases: ["dropbox"],
  },
  {
    slug: "googledrive",
    color: "#1A73E8",
    aliases: ["google one", "google drive", "google storage"],
  },
  {
    slug: "onepassword",
    color: "#145FE4",
    aliases: ["1password"],
  },
  {
    slug: "bitwarden",
    color: "#175DDC",
    aliases: ["bitwarden"],
  },
  {
    slug: "nordvpn",
    color: "#4687FF",
    aliases: ["nordvpn", "nord vpn"],
  },
  {
    slug: "expressvpn",
    color: "#DA3940",
    aliases: ["expressvpn", "express vpn"],
  },
  {
    slug: "proton",
    color: "#6D4AFF",
    aliases: ["proton"],
  },
  {
    slug: "duolingo",
    color: "#58CC02",
    aliases: ["duolingo"],
  },
  {
    slug: "headspace",
    color: "#F47D31",
    aliases: ["headspace"],
  },
  {
    slug: "strava",
    color: "#FC4C02",
    aliases: ["strava"],
  },
  {
    slug: "patreon",
    color: "#000000",
    aliases: ["patreon"],
  },
  {
    slug: "discord",
    color: "#5865F2",
    aliases: ["discord"],
  },
  {
    slug: "linkedin",
    color: "#0A66C2",
    aliases: ["linkedin"],
  },
  {
    slug: "x",
    color: "#000000",
    aliases: ["x premium", "twitter", "x"],
  },
  {
    slug: "telegram",
    color: "#26A5E4",
    aliases: ["telegram"],
  },
  {
    slug: "medium",
    color: "#000000",
    aliases: ["medium"],
  },
  {
    slug: "substack",
    color: "#FF6719",
    aliases: ["substack"],
  },
  {
    slug: "uber",
    color: "#000000",
    aliases: ["uber"],
  },
] as const satisfies readonly BrandEntry[];

export type BrandSlug = (typeof BRANDS)[number]["slug"];

function words(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, " plus ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Edit distance counting a swap of neighbouring letters as one edit. */
function editDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Short aliases ("max", "zoom") must be exact or they'd match anything. */
function allowedTypos(alias: string) {
  return alias.length < 5 ? 0 : alias.length < 9 ? 1 : 2;
}

const ALIASES = BRANDS.flatMap(({ aliases, ...brand }) =>
  aliases.map((alias) => ({ key: words(alias).join(""), brand })),
);

/**
 * How well `alias` matches the start of the name, or `null`. Lower is better.
 * The alias is compared without spaces against the first one, two, ... words
 * of the name, so "You Tube", "Disney+" and "Netflx Premium" all line up.
 */
function aliasDistance(alias: string, nameWords: string[]) {
  let best: number | null = null;
  let prefix = "";
  for (const word of nameWords) {
    prefix += word;
    if (prefix.length > alias.length + 2) break;
    const distance = editDistance(prefix, alias);
    // Typos only count when the first letter is right ("Photon" ≠ Proton).
    const ok =
      distance === 0 ||
      (distance <= allowedTypos(alias) && prefix[0] === alias[0]);
    if (ok && (best === null || distance < best)) best = distance;
  }
  // Run together with the plan, as in "Spotifyfamily". Long aliases only,
  // so "Maximum" doesn't become Max.
  if (best === null && alias.length >= 6 && nameWords[0]?.startsWith(alias)) {
    best = 0;
  }
  return best;
}

const cache = new Map<string, Brand | null>();

/**
 * The brand a subscription name refers to, forgiving typos ("Netflx",
 * "Chatgtp"), spacing ("You Tube") and plan suffixes ("Spotify Family").
 * The most specific alias wins, so "YouTube Music" beats "YouTube".
 */
export function findBrand(name: string | null | undefined): Brand | null {
  if (!name) return null;
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const nameWords = words(name);
  let match: { brand: Brand; length: number; distance: number } | null = null;
  for (const { key, brand } of ALIASES) {
    const distance = aliasDistance(key, nameWords);
    if (distance === null) continue;
    if (
      !match ||
      key.length > match.length ||
      (key.length === match.length && distance < match.distance)
    ) {
      match = { brand, length: key.length, distance };
    }
  }

  const brand = match?.brand ?? null;
  cache.set(name, brand);
  return brand;
}
