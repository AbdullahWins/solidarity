// Shared by the screenshot tools: builds the web export, serves it locally and
// seeds demo data so every screen renders without touching Firebase.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/** Builds the web export into dist/ (always with a clean cache). */
export function buildWeb() {
  console.log("Building web export…");
  const r = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist", "--clear"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CI: "1" },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Serves dist/ on a free local port; returns { base, close }. */
export async function serveDist() {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon" };
  function resolveFile(urlPath) {
    const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^([/\\])+/, "");
    const candidates = [clean, `${clean}.html`, join(clean, "index.html")];
    if (/^country[/\\]/.test(clean)) candidates.push(join("country", "[name].html"));
    candidates.push("+not-found.html");
    for (const c of candidates) {
      const p = join(dist, c);
      if (p.startsWith(dist) && existsSync(p) && statSync(p).isFile()) return p;
    }
    return null;
  }
  const server = createServer((req, res) => {
    const file = resolveFile(req.url === "/" ? "/index.html" : req.url);
    if (!file) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

const checkDigit = (body) => {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
};
export const ean = (prefix, rest) => `${prefix}${rest}${checkDigit(`${prefix}${rest}`)}`;

const SAMPLE = [
  ["560", "Portugal", true], ["400", "Germany", true], ["890", "India", true], ["729", "Israel", false],
  ["690", "China", false], ["800", "Italy", true], ["450", "Japan", true], ["869", "Turkey", true],
  ["500", "United Kingdom", true], ["300", "France", true], ["789", "Brazil", false], ["840", "Spain", true],
  ["880", "South Korea", true], ["870", "Netherlands", true], ["625", "Jordan", true], ["460", "Russia", false],
];
// A few scans carry product names, as they would with product names on.
const PRODUCTS = [
  { productName: "Sparkling mineral water 1 l", brand: "Demo Springs" },
  { productName: "Dark chocolate 70%", brand: "Highland Cacao", owner: "Highland Foods", categories: ["en:dark-chocolates"] },
  { productName: "Wholegrain crackers", brand: "Field & Oven" },
  { productName: "Green tea, 20 bags", brand: "Leaf Demo" },
];
const now = Date.now();
const DAY = 86400000;
const scans = [];
let n = 0;
for (let d = 0; d < 70; d++) {
  const perDay = d < 6 ? 2 + (d % 3) : d % 4 === 0 ? 0 : (d * 7) % 3;
  for (let k = 0; k < perDay; k++) {
    const [prefix, country, positive] = SAMPLE[(d * 3 + k * 5) % SAMPLE.length];
    const at = new Date(now - d * DAY - (k * 3 + 1) * 3600000 - 1800000);
    scans.push({
      id: `demo-${n++}`,
      code: ean(prefix, String(100000000 + ((d * 7919 + k * 104729) % 899999999)).slice(0, 9)),
      country,
      isPositive: positive,
      source: k % 3 === 0 ? "manual" : "camera",
      scannedAt: at.toISOString(),
      ...(PRODUCTS[n % 3 === 1 ? (n / 3) | 0 : -1] ?? {}),
    });
  }
}
const badges = ["first_scan", "scans_10", "scans_50", "streak_3", "positive_10", "level_5", "votes_10", "early_bird"];
const gamification = {
  xp: 2905,
  level: 7,
  currentStreak: 6,
  longestStreak: 12,
  lastScanLocalDate: new Date(now).toLocaleDateString("en-CA"),
  unlockedBadgeIds: badges,
  badgeUnlockedAt: Object.fromEntries(badges.map((b, i) => [b, new Date(now - i * 5 * DAY).toISOString()])),
  voteXp: 120,
  voteCount: 12,
};
const tally = (country, up, down) => [country.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), { country, upvotes: up, downvotes: down }];
const tallies = Object.fromEntries([
  tally("Portugal", 182, 21), tally("Germany", 240, 96), tally("India", 133, 40), tally("Israel", 41, 318),
  tally("China", 88, 142), tally("Italy", 156, 30), tally("Japan", 201, 44), tally("Turkey", 97, 61),
  tally("United Kingdom", 120, 80), tally("France", 140, 75), tally("Brazil", 60, 71), tally("Spain", 131, 22),
  tally("South Korea", 99, 18), tally("Netherlands", 87, 19), tally("Jordan", 64, 9), tally("Russia", 30, 210),
  tally("USA & Canada", 150, 190), tally("Ireland", 52, 4), tally("Malaysia", 44, 6), tally("Bangladesh", 77, 3),
]);
const myVotes = { portugal: "up", israel: "down", "south-korea": "up", japan: "up", russia: "down" };

export const seed = {
  "solidarity:demo": "1",
  "solidarity:v1:onboarded": "1",
  "solidarity:v1:scans": JSON.stringify(scans),
  "solidarity:v1:gamification": JSON.stringify(gamification),
  "solidarity:v1:countryTalliesCache": JSON.stringify({ tallies, fetchedAt: now }),
  "solidarity:v1:myVotes": JSON.stringify(myVotes),
  "solidarity:v1:preferences": JSON.stringify({ hapticsEnabled: true, streakReminderEnabled: true, productLookup: "on" }),
  "solidarity:v1:countryRules": JSON.stringify({ portugal: "support" }),
  "solidarity:v1:brandRules": JSON.stringify({ "schwan-stabilo-group": { rule: "support", label: "Schwan-Stabilo Group" } }),
  // A basket from earlier today (basket mode off, so the Scan screens stay normal).
  "solidarity:v1:basket": JSON.stringify({
    active: false,
    startedAt: now - 20 * 60000,
    lastAddedAt: now - 5 * 60000,
    items: [
      { scanId: "b1", code: ean("560", "123456789"), country: "Portugal", tone: "positive", productName: "Extra virgin olive oil 750 ml", addedAt: now - 20 * 60000 },
      { scanId: "b2", code: ean("400", "638133393"), country: "Germany", tone: "positive", productName: "Textmarker highlighter, yellow", addedAt: now - 15 * 60000 },
      { scanId: "b3", code: ean("460", "100200300"), country: "Russia", tone: "negative", addedAt: now - 10 * 60000 },
      { scanId: "b4", code: ean("977", "123456700"), country: "Serial publications (ISSN)", tone: "neutral", addedAt: now - 5 * 60000 },
    ],
  }),
};

export const chromePath =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!chromePath) throw new Error("Chrome not found. Set CHROME_PATH.");

/** A browser context with Firebase blocked and the demo data seeded. */
export async function demoContext(browser, options, data = seed) {
  const context = await browser.newContext({ colorScheme: "dark", reducedMotion: "no-preference", ...options });
  await context.route(/googleapis\.com|firebaseio\.com|firebaseapp\.com|gstatic\.com/, (r) => r.abort());
  await context.addInitScript((data) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, data);
  return context;
}
