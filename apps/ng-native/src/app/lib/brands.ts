export type Brand = {
  /** Tile background; the bundled glyph is white. */
  color: string;
  /** Bundled asset (`require` of an SVG). */
  icon: number;
};

type BrandEntry = Brand & { aliases: string[] };

/**
 * Logos for common subscriptions, looked up by `findBrand`. Aliases are
 * lowercase names the subscription usually starts with; the matcher handles
 * spacing, "+" and small typos itself. Glyphs live in `apps/native/assets/brands`, shared with the React app.
 */
const BRANDS: BrandEntry[] = [
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/chatgpt.svg"),
    aliases: ["chatgpt", "openai"],
  },
  {
    color: "#D97757",
    icon: require("../../../../native/assets/brands/claude.svg"),
    aliases: ["claude", "anthropic"],
  },
  {
    color: "#1FB8CD",
    icon: require("../../../../native/assets/brands/perplexity.svg"),
    aliases: ["perplexity"],
  },
  {
    color: "#1A73E8",
    icon: require("../../../../native/assets/brands/gemini.svg"),
    aliases: ["gemini", "google gemini", "google ai"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/githubcopilot.svg"),
    aliases: ["github copilot", "copilot"],
  },
  {
    color: "#181717",
    icon: require("../../../../native/assets/brands/github.svg"),
    aliases: ["github"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/cursor.svg"),
    aliases: ["cursor"],
  },
  {
    color: "#E50914",
    icon: require("../../../../native/assets/brands/netflix.svg"),
    aliases: ["netflix"],
  },
  {
    color: "#1F2E3E",
    icon: require("../../../../native/assets/brands/primevideo.svg"),
    aliases: ["prime video", "amazon prime video"],
  },
  {
    color: "#00A8E1",
    icon: require("../../../../native/assets/brands/amazonprime.svg"),
    aliases: ["amazon prime", "prime", "amazon"],
  },
  {
    color: "#0E3D8A",
    icon: require("../../../../native/assets/brands/disneyplus.svg"),
    aliases: ["disney plus", "disney"],
  },
  {
    color: "#002BE7",
    icon: require("../../../../native/assets/brands/hbomax.svg"),
    aliases: ["hbo max", "hbo", "max"],
  },
  {
    color: "#FE365F",
    icon: require("../../../../native/assets/brands/viaplay.svg"),
    aliases: ["viaplay"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/appletv.svg"),
    aliases: ["apple tv"],
  },
  {
    color: "#FA243C",
    icon: require("../../../../native/assets/brands/applemusic.svg"),
    aliases: ["apple music"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/applearcade.svg"),
    aliases: ["apple arcade"],
  },
  {
    color: "#3693F3",
    icon: require("../../../../native/assets/brands/icloud.svg"),
    aliases: ["icloud", "apple one", "apple"],
  },
  {
    color: "#0064FF",
    icon: require("../../../../native/assets/brands/paramountplus.svg"),
    aliases: ["paramount plus", "paramount"],
  },
  {
    color: "#FF5E00",
    icon: require("../../../../native/assets/brands/crunchyroll.svg"),
    aliases: ["crunchyroll"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/dazn.svg"),
    aliases: ["dazn"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/mubi.svg"),
    aliases: ["mubi"],
  },
  {
    color: "#FF0000",
    icon: require("../../../../native/assets/brands/youtubemusic.svg"),
    aliases: ["youtube music", "yt music"],
  },
  {
    color: "#FF0000",
    icon: require("../../../../native/assets/brands/youtube.svg"),
    aliases: ["youtube", "yt premium"],
  },
  {
    color: "#9146FF",
    icon: require("../../../../native/assets/brands/twitch.svg"),
    aliases: ["twitch"],
  },
  {
    color: "#1ED760",
    icon: require("../../../../native/assets/brands/spotify.svg"),
    aliases: ["spotify"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/tidal.svg"),
    aliases: ["tidal"],
  },
  {
    color: "#A238FF",
    icon: require("../../../../native/assets/brands/deezer.svg"),
    aliases: ["deezer"],
  },
  {
    color: "#FF5500",
    icon: require("../../../../native/assets/brands/soundcloud.svg"),
    aliases: ["soundcloud"],
  },
  {
    color: "#F8991C",
    icon: require("../../../../native/assets/brands/audible.svg"),
    aliases: ["audible"],
  },
  {
    color: "#0070D1",
    icon: require("../../../../native/assets/brands/playstation.svg"),
    aliases: ["playstation", "ps plus", "psn"],
  },
  {
    color: "#107C10",
    icon: require("../../../../native/assets/brands/xbox.svg"),
    aliases: ["xbox", "game pass"],
  },
  {
    color: "#0078D4",
    icon: require("../../../../native/assets/brands/microsoft.svg"),
    aliases: ["microsoft", "office 365", "office", "m365"],
  },
  {
    color: "#FF0000",
    icon: require("../../../../native/assets/brands/adobe.svg"),
    aliases: ["adobe", "photoshop", "lightroom", "creative cloud"],
  },
  {
    color: "#F24E1E",
    icon: require("../../../../native/assets/brands/figma.svg"),
    aliases: ["figma"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/notion.svg"),
    aliases: ["notion"],
  },
  {
    color: "#5E6AD2",
    icon: require("../../../../native/assets/brands/linear.svg"),
    aliases: ["linear"],
  },
  {
    color: "#4A154B",
    icon: require("../../../../native/assets/brands/slack.svg"),
    aliases: ["slack"],
  },
  {
    color: "#0B5CFF",
    icon: require("../../../../native/assets/brands/zoom.svg"),
    aliases: ["zoom"],
  },
  {
    color: "#0061FF",
    icon: require("../../../../native/assets/brands/dropbox.svg"),
    aliases: ["dropbox"],
  },
  {
    color: "#1A73E8",
    icon: require("../../../../native/assets/brands/googledrive.svg"),
    aliases: ["google one", "google drive", "google storage"],
  },
  {
    color: "#145FE4",
    icon: require("../../../../native/assets/brands/onepassword.svg"),
    aliases: ["1password"],
  },
  {
    color: "#175DDC",
    icon: require("../../../../native/assets/brands/bitwarden.svg"),
    aliases: ["bitwarden"],
  },
  {
    color: "#4687FF",
    icon: require("../../../../native/assets/brands/nordvpn.svg"),
    aliases: ["nordvpn", "nord vpn"],
  },
  {
    color: "#DA3940",
    icon: require("../../../../native/assets/brands/expressvpn.svg"),
    aliases: ["expressvpn", "express vpn"],
  },
  {
    color: "#6D4AFF",
    icon: require("../../../../native/assets/brands/proton.svg"),
    aliases: ["proton"],
  },
  {
    color: "#58CC02",
    icon: require("../../../../native/assets/brands/duolingo.svg"),
    aliases: ["duolingo"],
  },
  {
    color: "#F47D31",
    icon: require("../../../../native/assets/brands/headspace.svg"),
    aliases: ["headspace"],
  },
  {
    color: "#FC4C02",
    icon: require("../../../../native/assets/brands/strava.svg"),
    aliases: ["strava"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/patreon.svg"),
    aliases: ["patreon"],
  },
  {
    color: "#5865F2",
    icon: require("../../../../native/assets/brands/discord.svg"),
    aliases: ["discord"],
  },
  {
    color: "#0A66C2",
    icon: require("../../../../native/assets/brands/linkedin.svg"),
    aliases: ["linkedin"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/x.svg"),
    aliases: ["x premium", "twitter", "x"],
  },
  {
    color: "#26A5E4",
    icon: require("../../../../native/assets/brands/telegram.svg"),
    aliases: ["telegram"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/medium.svg"),
    aliases: ["medium"],
  },
  {
    color: "#FF6719",
    icon: require("../../../../native/assets/brands/substack.svg"),
    aliases: ["substack"],
  },
  {
    color: "#000000",
    icon: require("../../../../native/assets/brands/uber.svg"),
    aliases: ["uber"],
  },
];

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
