// Renders every screen of the web build with demo data and writes PNGs plus an
// HTML gallery to Screenshots/ so the design can be reviewed without a device.
//
//   npm run screenshots              build the web export, then capture
//   npm run screenshots -- --skip-build   reuse the existing dist/
//
// Uses playwright-core with the locally installed Chrome (set CHROME_PATH to
// override). Demo mode is web-only (lib/demo.ts); all Firebase traffic is
// blocked so nothing reaches the backend.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const out = join(root, "Screenshots");
const skipBuild = process.argv.includes("--skip-build");

// ---------------------------------------------------------------- build
if (!skipBuild) {
  console.log("Building web export…");
  const r = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, CI: "1" },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ---------------------------------------------------------------- static server
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
const base = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- demo data
const checkDigit = (body) => {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
};
const ean = (prefix, rest) => `${prefix}${rest}${checkDigit(`${prefix}${rest}`)}`;

const SAMPLE = [
  ["560", "Portugal", true], ["400", "Germany", true], ["890", "India", true], ["729", "Israel", false],
  ["690", "China", false], ["800", "Italy", true], ["450", "Japan", true], ["869", "Turkey", true],
  ["500", "United Kingdom", true], ["300", "France", true], ["789", "Brazil", false], ["840", "Spain", true],
  ["880", "South Korea", true], ["870", "Netherlands", true], ["625", "Jordan", true], ["460", "Russia", false],
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

const seed = {
  "solidarity:demo": "1",
  "solidarity:v1:onboarded": "1",
  "solidarity:v1:scans": JSON.stringify(scans),
  "solidarity:v1:gamification": JSON.stringify(gamification),
  "solidarity:v1:countryTalliesCache": JSON.stringify({ tallies, fetchedAt: now }),
  "solidarity:v1:myVotes": JSON.stringify(myVotes),
  "solidarity:v1:preferences": JSON.stringify({ hapticsEnabled: true, streakReminderEnabled: true }),
  "solidarity:v1:countryRules": JSON.stringify({ portugal: "support" }),
};

// ---------------------------------------------------------------- capture plan
const DEVICES = [
  { id: "phone-portrait", label: "Phone · portrait", width: 390, height: 844, scale: 2, mobile: true, full: true },
  { id: "phone-landscape", label: "Phone · landscape", width: 844, height: 390, scale: 2, mobile: true },
  { id: "tablet-portrait", label: "Tablet · portrait", width: 820, height: 1180, scale: 1, mobile: true, full: true },
  { id: "tablet-landscape", label: "Tablet · landscape", width: 1180, height: 820, scale: 1, mobile: true },
];

const SCREENS = [
  { id: "01-onboarding", label: "Onboarding", path: "/onboarding" },
  { id: "02-scan", label: "Scan", path: "/" },
  {
    id: "03-scan-result",
    label: "Scan result",
    path: "/",
    act: async (page) => {
      await page.getByText("Type a code instead", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("560", "123456789"));
      await page.getByText("Look up", { exact: true }).click();
    },
  },
  {
    id: "04-scan-details",
    label: "Scan result details",
    path: "/",
    act: async (page) => {
      await page.getByText("Type a code instead", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("400", "638133393"));
      await page.getByText("Look up", { exact: true }).click();
      await page.waitForTimeout(800);
      await page.getByText("Details & vote", { exact: true }).click();
    },
  },
  { id: "05-history", label: "History", path: "/history" },
  { id: "06-community", label: "Community", path: "/community" },
  {
    id: "06b-leaderboard",
    label: "Leaderboard",
    path: "/community",
    act: async (page) => page.getByText("Leaderboard", { exact: true }).click(),
  },
  { id: "07-country", label: "Country details", path: "/country/Portugal" },
  { id: "08-profile", label: "Profile", path: "/profile" },
  { id: "09-settings", label: "Settings", path: "/settings" },
  { id: "09b-rules", label: "My country rules", path: "/rules" },
  { id: "10-sign-in", label: "Sign in", path: "/auth" },
  {
    id: "11-create-account",
    label: "Create account",
    path: "/auth",
    act: async (page) => page.getByText("Create account", { exact: true }).first().click(),
  },
];

const chromePath =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
if (!chromePath) throw new Error("Chrome not found. Set CHROME_PATH.");

rmSync(out, { recursive: true, force: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const shots = [];

for (const device of DEVICES) {
  mkdirSync(join(out, device.id), { recursive: true });
  if (device.full) mkdirSync(join(out, `${device.id}-full`), { recursive: true });
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    isMobile: device.mobile,
    hasTouch: device.mobile,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  await context.route(/googleapis\.com|firebaseio\.com|firebaseapp\.com|gstatic\.com/, (r) => r.abort());
  await context.addInitScript((data) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, seed);

  for (const screen of SCREENS) {
    const page = await context.newPage();
    await page.goto(base + screen.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (screen.act) {
      await screen.act(page);
      await page.waitForTimeout(1400);
    }
    const file = join(device.id, `${screen.id}.png`);
    await page.screenshot({ path: join(out, file) });
    const entry = { device: device.id, screen: screen.id, label: screen.label, file };

    if (device.full) {
      // Grow the viewport to the tallest scroll area so the whole screen is visible.
      const contentHeight = await page.evaluate(() =>
        Math.max(...[...document.querySelectorAll("div")].map((el) => (el.scrollHeight > el.clientHeight + 4 ? el.scrollHeight : 0)), 0)
      );
      if (contentHeight > device.height) {
        await page.setViewportSize({ width: device.width, height: Math.min(contentHeight + 40, 5000) });
        await page.waitForTimeout(700);
        const fullFile = join(`${device.id}-full`, `${screen.id}.png`);
        await page.screenshot({ path: join(out, fullFile) });
        entry.full = fullFile;
      }
    }
    shots.push(entry);
    await page.close();
    process.stdout.write(".");
  }
  await context.close();
}
await browser.close();
server.close();

// ---------------------------------------------------------------- gallery
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const url = (p) => p.split(/[\\/]/).map(encodeURIComponent).join("/");
const sections = DEVICES.map((d) => {
  const cards = shots
    .filter((s) => s.device === d.id)
    .map(
      (s) => `      <figure>
        <a href="${url(s.full ?? s.file)}" target="_blank"><img src="${url(s.file)}" alt="${esc(s.label)} on ${esc(d.label)}" loading="lazy"></a>
        <figcaption><b>${esc(s.screen.slice(0, 2))}</b> ${esc(s.label)}${s.full ? ` · <a href="${url(s.full)}" target="_blank">full height</a>` : ""}</figcaption>
      </figure>`
    )
    .join("\n");
  return `  <section id="${d.id}" class="${d.width > d.height ? "landscape" : "portrait"}">
    <h2>${esc(d.label)} <small>${d.width}×${d.height}</small></h2>
    <div class="grid">
${cards}
    </div>
  </section>`;
}).join("\n");

writeFileSync(
  join(out, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solidarity screenshots</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #07080b; color: #f5f7fa; font: 15px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { position: sticky; top: 0; z-index: 2; background: rgba(7,8,11,.92); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,.08); padding: 14px 20px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  header h1 { font-size: 18px; margin: 0 12px 0 0; }
  header a { color: #a3aab8; text-decoration: none; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.05); }
  header a:hover { color: #fff; }
  header p { margin: 0; color: #6b7280; font-size: 13px; flex-basis: 100%; }
  section { padding: 24px 20px 8px; }
  h2 { font-size: 20px; margin: 0 0 16px; }
  h2 small { color: #6b7280; font-weight: 500; font-size: 14px; }
  .grid { display: grid; gap: 22px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .landscape .grid { grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
  figure { margin: 0; }
  img { width: 100%; display: block; border-radius: 16px; border: 1px solid rgba(255,255,255,.1); background: #111; }
  figcaption { margin-top: 8px; color: #a3aab8; font-size: 13px; }
  figcaption b { color: #f0643c; margin-right: 4px; }
  figcaption a { color: #8ea6ff; }
</style>
</head>
<body>
<header>
  <h1>Solidarity · screenshots</h1>
${DEVICES.map((d) => `  <a href="#${d.id}">${esc(d.label)}</a>`).join("\n")}
  <p>Rendered from the web build with demo data on ${new Date().toLocaleString("en-GB")}. Click an image to open it at full size. Regenerate with <code>npm run screenshots</code>.</p>
</header>
${sections}
</body>
</html>
`
);
console.log(`\nWrote ${shots.length} screenshots to Screenshots/ (open Screenshots/index.html)`);
