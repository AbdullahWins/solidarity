// Renders every screen of the web build with demo data and writes PNGs plus an
// HTML gallery to Screenshots/ so the design can be reviewed without a device.
//
//   npm run screenshots              build the web export, then capture
//   npm run screenshots -- --skip-build   reuse the existing dist/
//
// Uses playwright-core with the locally installed Chrome (set CHROME_PATH to
// override). Demo mode is web-only (lib/demo.ts); all Firebase traffic is
// blocked so nothing reaches the backend.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

import { buildWeb, chromePath, demoContext, ean, root, serveDist } from "./demo-web.mjs";

const out = join(root, "Screenshots");
const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) buildWeb();
const { base, close } = await serveDist();

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
      await page.getByText("Type code", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("560", "123456789"));
      await page.getByText("Look up", { exact: true }).click();
    },
  },
  {
    id: "04-scan-details",
    label: "Scan result details",
    path: "/",
    act: async (page) => {
      await page.getByText("Type code", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("400", "638133393"));
      await page.getByText("Look up", { exact: true }).click();
      await page.waitForTimeout(800);
      await page.getByText("Details & vote", { exact: true }).click();
    },
  },
  {
    id: "04c-basket-mode",
    label: "Basket mode",
    path: "/",
    act: async (page) => {
      await page.getByLabel("Basket mode").click();
      await page.getByText("Type code", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("800", "100104729"));
      await page.getByText("Look up", { exact: true }).click();
    },
  },
  { id: "04d-basket-summary", label: "Basket summary", path: "/basket" },
  {
    id: "04e-barcode-info",
    label: "What this barcode tells you",
    path: "/",
    act: async (page) => {
      await page.getByText("Type code", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill(ean("560", "123456789"));
      await page.getByText("Look up", { exact: true }).click();
      await page.waitForTimeout(800);
      await page.getByLabel("What this barcode tells you").click();
    },
  },
  {
    id: "04f-alternatives",
    label: "Avoid result with alternatives",
    path: "/",
    act: async (page) => {
      await page.getByText("Type code", { exact: true }).click();
      await page.getByPlaceholder("e.g. 4006381333931").fill("6901234567892");
      await page.getByText("Look up", { exact: true }).click();
    },
  },
  { id: "05-history", label: "History", path: "/history" },
  {
    id: "05b-history-filtered",
    label: "History, filtered",
    path: "/history",
    act: async (page) => {
      await page.getByPlaceholder("Search country, product or barcode").fill("portugal");
      await page.getByText("30 days", { exact: true }).click();
    },
  },
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

rmSync(out, { recursive: true, force: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const shots = [];

for (const device of DEVICES) {
  mkdirSync(join(out, device.id), { recursive: true });
  if (device.full) mkdirSync(join(out, `${device.id}-full`), { recursive: true });
  const context = await demoContext(browser, {
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    isMobile: device.mobile,
    hasTouch: device.mobile,
  });

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
close();

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
