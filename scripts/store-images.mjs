// Generates the store listing images into files/android and files/ios: five
// billboard screenshots per store, the store icon and (Android) the feature
// graphic. App screens are captured live from the web build with demo data at
// 3x; each slide then gets its own colour, layout and zoomed-in UI cards cut
// from those captures, rendered at each store's exact pixel size.
//
//   npm run store-images                  build the web export, then render
//   npm run store-images -- --skip-build  reuse the existing dist/
//
// Output folders are emptied first, so they only ever hold the latest set.
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

import { buildWeb, chromePath, demoContext, ean, root, seed, serveDist } from "./demo-web.mjs";

const OUT = join(root, "files");
const SCREEN = { width: 390, height: 800, scale: 3 }; // + a 44pt status bar drawn in the frame = 390×844
const TARGETS = [
  { dir: "android", width: 1080, height: 1920, frame: "android" }, // Play: 9:16, ≥1080px for promotion
  { dir: "ios", width: 1290, height: 2796, frame: "ios" }, // App Store 6.9" iPhone
];

// ---------------------------------------------------------------- demo data for the store
// Store-policy safe: no country is ever shown as "avoid" and no sensitive
// countries appear. The avoid example comes from the user's own rule on a
// fictional brand; every brand and company name is made up.
const now = Date.now();
const tallies = JSON.parse(seed["solidarity:v1:countryTalliesCache"]);
for (const key of ["israel", "russia"]) delete tallies.tallies[key];
tallies.tallies.bangladesh = { country: "Bangladesh", upvotes: 192, downvotes: 11 };
for (const t of Object.values(tallies.tallies)) {
  if (t.downvotes > t.upvotes) [t.upvotes, t.downvotes] = [t.downvotes, t.upvotes];
}
const scans = JSON.parse(seed["solidarity:v1:scans"]).filter((s) => !s.categories?.includes("en:dark-chocolates"));
scans.unshift({
  id: "store-alt",
  code: "5609876543212",
  country: "Portugal",
  isPositive: true,
  source: "camera",
  scannedAt: new Date(now - 26 * 3600000).toISOString(),
  productName: "Dark chocolate 70%",
  brand: "Cacaova",
  categories: ["en:dark-chocolates"],
});
const storeSeed = {
  ...seed,
  "solidarity:v1:scans": JSON.stringify(scans),
  "solidarity:v1:countryTalliesCache": JSON.stringify(tallies),
  "solidarity:v1:myVotes": JSON.stringify({ bangladesh: "up", portugal: "up", japan: "up", "south-korea": "up" }),
  "solidarity:v1:countryRules": JSON.stringify({ bangladesh: "support", portugal: "support" }),
  "solidarity:v1:brandRules": JSON.stringify({
    nocturo: { rule: "avoid", label: "Nocturo" },
    "aokawa-foods-group": { rule: "support", label: "Aokawa Foods Group" },
  }),
  "solidarity:v1:basket": JSON.stringify({
    active: false,
    startedAt: now - 20 * 60000,
    lastAddedAt: now - 5 * 60000,
    items: [
      { scanId: "b1", code: "8941234567896", country: "Bangladesh", tone: "positive", productName: "Premium black tea 400 g", addedAt: now - 20 * 60000 },
      { scanId: "b2", code: ean("560", "123456789"), country: "Portugal", tone: "positive", productName: "Extra virgin olive oil 750 ml", addedAt: now - 15 * 60000 },
      { scanId: "b3", code: "4501234567896", country: "Japan", tone: "positive", productName: "Matcha green tea 100 g", addedAt: now - 10 * 60000 },
      { scanId: "b4", code: ean("977", "123456700"), country: "Serial publications (ISSN)", tone: "neutral", addedAt: now - 5 * 60000 },
    ],
  }),
};

// ---------------------------------------------------------------- captures
const typeCode = (code) => async (page) => {
  await page.getByText("Type code", { exact: true }).click();
  await page.getByPlaceholder("e.g. 4006381333931").fill(code);
  await page.getByText("Look up", { exact: true }).click();
};

// crops: zoomed-in cards cut from the capture. Vertical bounds come from text
// anchors (from/to), horizontal bounds from x/w in screen points.
const CARD = { x: 16, w: 358 };
const CAPTURES = {
  hero: {
    path: "/", act: typeCode("8941234567896"), scroll: 300,
    crops: { verdict: { ...CARD, from: ["Bangladesh", 16, true], to: ["Community:", 16] } },
  },
  avoid: {
    path: "/", act: typeCode("4001234567891"), scroll: 440,
    crops: {
      verdict: { ...CARD, from: ["Germany", 16, true], to: ["Community:", 12] },
      alt: { x: 33, w: 324, from: ["Instead, you've found these fine", 16], to: ["From your own scans", 14] },
    },
  },
  owner: {
    path: "/", scroll: 440,
    act: async (page) => {
      await typeCode("4501234567896")(page);
      await page.waitForTimeout(800);
      await page.getByText("Details & vote", { exact: true }).click();
    },
    crops: {
      owner: { ...CARD, from: ["Japan", 16, true], to: ["Owned by", 6] },
      rule: { x: 30, w: 330, from: ["Your rule for the company", 10], height: 92 },
    },
  },
  basket: { path: "/basket", scroll: 0 },
  basketScan: {
    path: "/", scroll: 0,
    act: async (page) => {
      await page.getByLabel("Basket mode").click();
      await typeCode("8941234567896")(page);
    },
  },
  country: { path: "/country/Portugal", scroll: 0, crops: { verdict: { ...CARD, from: ["Community verdict", 8, true], to: ["Your vote.", -10, false, "top"] } } },
};

if (!process.argv.includes("--skip-build")) buildWeb();
const { base, close } = await serveDist();
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const context = await demoContext(
  browser,
  { viewport: { width: SCREEN.width, height: SCREEN.height }, deviceScaleFactor: SCREEN.scale, isMobile: true, hasTouch: true },
  storeSeed
);

const shots = {}; // id -> base64 png
const boxes = {}; // id.crop -> { x, y, w, h } in screen points
async function captureAll(ctx, caps) {
for (const [id, cap] of Object.entries(caps)) {
  const page = await ctx.newPage();
  await page.goto(base + cap.path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  if (cap.act) await cap.act(page);
  await page.waitForTimeout(3800); // let the XP toast run its 3.2 s course
  await page.evaluate((scroll) => {
    // The web build shows a web-only hint in the viewfinder; use the app's real text.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue === "Camera scanning works in the app") walker.currentNode.nodeValue = "Point at a barcode";
    }
    const scrollers = [...document.querySelectorAll("div")].filter((el) => el.scrollHeight > el.clientHeight + 4);
    scrollers.sort((a, b) => b.clientHeight - a.clientHeight);
    if (scrollers[0]) scrollers[0].scrollTop = scroll;
  }, cap.scroll);
  await page.waitForTimeout(600);
  for (const [name, c] of Object.entries(cap.crops ?? {})) {
    const find = async ([text, , exact]) => {
      const box = await page.getByText(text, { exact: !!exact }).first().boundingBox();
      if (!box) throw new Error(`Anchor "${text}" not found on ${id}`);
      return box;
    };
    const a = await find(c.from);
    const y = a.y - c.from[1];
    let bottom = y + c.height;
    if (c.to) {
      const t = await find(c.to);
      bottom = c.to[3] === "top" ? t.y + c.to[1] : t.y + t.height + c.to[1];
    }
    boxes[`${id}.${name}`] = { x: c.x, y, w: c.w, h: bottom - y };
  }
  shots[id] = (await page.screenshot()).toString("base64");
  await page.close();
  process.stdout.write(".");
}
}
await captureAll(context, CAPTURES);
await context.close();

// Foldables: the unfolded inner screen (wide layout with the side rail).
const FOLD = { width: 960, height: 800, scale: 2 };
const foldContext = await demoContext(
  browser,
  { viewport: { width: FOLD.width, height: FOLD.height }, deviceScaleFactor: FOLD.scale, isMobile: true, hasTouch: true },
  storeSeed
);
await captureAll(foldContext, {
  foldHero: { path: "/", act: typeCode("8941234567896"), scroll: 0 },
  foldCommunity: { path: "/community", scroll: 0 },
});
await foldContext.close();
close();

// ---------------------------------------------------------------- building blocks
const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  swap: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  camera: '<rect x="3" y="6.5" width="18" height="13.5" rx="3"/><circle cx="12" cy="13.2" r="3.6"/><path d="M8.5 6.5L10 4h4l1.5 2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M7 12h10"/>',
  building: '<path d="M4 21V5.5L12 3v18M12 9h8v12M3 21h18M7.5 8h1.5M7.5 12h1.5M7.5 16h1.5M15.5 13h1.5M15.5 17h1.5"/>',
};
const svg = (name) =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@500;600;700;800&display=block" rel="stylesheet">`;
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;
const iconB64 = readFileSync(join(root, "assets/images/icon.png")).toString("base64");
const fistB64 = readFileSync(join(root, "assets/images/adaptive-icon.png")).toString("base64");

const statusBar = (frame) =>
  frame === "ios"
    ? `<div class="sb"><span>9:41</span><i class="island"></i><span class="sbi">
        <svg viewBox="0 0 18 12" height="0.95em"><g fill="#fff"><rect x="0" y="8" width="3" height="4" rx=".8"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/><rect x="15" y="0" width="3" height="12" rx=".8"/></g></svg>
        <svg viewBox="0 0 16 12" height="0.95em"><path fill="#fff" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.2 7.2 0 0 0 8 4c-1.8 0-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zM8 9.4c.5 0 1 .2 1.3.5L8 11.3 6.7 9.9c.3-.3.8-.5 1.3-.5z"/></svg>
        <svg viewBox="0 0 27 12" height="0.95em"><rect x=".5" y=".5" width="23" height="11" rx="3.2" fill="none" stroke="#fff" stroke-opacity=".45"/><rect x="2.2" y="2.2" width="18" height="7.6" rx="1.8" fill="#fff"/><path d="M25 4v4c.8-.3 1.4-1.1 1.4-2S25.8 4.3 25 4z" fill="#fff" fill-opacity=".45"/></svg>
      </span></div>`
    : `<div class="sb android"><span>12:30</span><i class="hole"></i><span class="sbi">
        <svg viewBox="0 0 16 12" height="0.9em"><path fill="#fff" d="M8 12 0 3.3A11.6 11.6 0 0 1 8 0c3 0 5.8 1.2 8 3.3z"/></svg>
        <svg viewBox="0 0 12 12" height="0.9em"><path fill="#fff" d="M12 0v12H0z"/></svg>
        <svg viewBox="0 0 8 14" height="0.95em"><rect x="0" y="1.5" width="8" height="12.5" rx="1.4" fill="#fff"/><rect x="2.5" y="0" width="3" height="2" rx=".5" fill="#fff"/></svg>
      </span></div>`;

/** A phone showing capture `id`. P = phone width in px. */
const phone = (id, frame, { P, x, y, rot = 0, z = 1 }) => `<div class="ph" style="--P:${P}px;left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${z}">
  <div class="phone ${frame}"><div class="screen">${statusBar(frame)}<div class="shot s-${id}"></div></div>
  ${frame === "ios" ? '<i class="btn b1"></i><i class="btn b2"></i><i class="btn b3"></i>' : '<i class="btn a1"></i><i class="btn a2"></i>'}</div></div>`;

/** A zoomed card cut from capture `key` ("id.crop"), `w` px wide. */
function crop(key, { w, x, y, rot = 0, z = 3 }) {
  const b = boxes[key];
  const k = w / b.w;
  const id = key.split(".")[0];
  return `<div class="crop s-${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${b.h * k}px;background-size:${SCREEN.width * k}px auto;background-position:${-b.x * k}px ${-b.y * k}px;border-radius:${15 * k}px;transform:rotate(${rot}deg);z-index:${z}"></div>`;
}
const cropH = (key, w) => boxes[key].h * (w / boxes[key].w);

const chip = (icon, text, color, { x, y, rot = 0 }) =>
  `<div class="chip" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg);--c:${color}"><b>${svg(icon)}</b><span>${text}</span></div>`;

const css = (W, H) => `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;font-family:Inter,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
${Object.entries(shots).map(([id, b]) => `.s-${id}{background-image:url("data:image/png;base64,${b}")}`).join("\n")}
.grain{position:absolute;inset:0;background:${GRAIN};mix-blend-mode:overlay;pointer-events:none;z-index:20}
.ph{position:absolute;width:var(--P);aspect-ratio:390/844;transform-origin:50% 40%}
.phone{position:absolute;inset:0;border-radius:calc(var(--P)*.15);padding:calc(var(--P)*.026);
  background:linear-gradient(145deg,#4a4f5a 0%,#1c1f26 18%,#0d0f13 50%,#22262e 82%,#555b66 100%);
  box-shadow:0 0 0 calc(var(--P)*.004) rgba(255,255,255,.18) inset,0 calc(var(--P)*.08) calc(var(--P)*.2) rgba(0,0,0,.45)}
.phone.android{border-radius:calc(var(--P)*.11)}
.screen{position:relative;width:100%;height:100%;border-radius:calc(var(--P)*.125);overflow:hidden;background:#07080B}
.phone.android .screen{border-radius:calc(var(--P)*.085)}
.shot{position:absolute;left:0;right:0;bottom:0;height:calc(100% * 800 / 844);background-size:100% auto;background-repeat:no-repeat}
.sb{position:absolute;inset:0 0 auto 0;height:calc(100% * 44 / 844);display:flex;align-items:center;justify-content:space-between;
  padding:0 calc(var(--P)*.085);font:600 calc(var(--P)*.042)/1 Inter,system-ui,sans-serif;color:#fff;z-index:2;background:#07080B}
.sb.android{padding:0 calc(var(--P)*.06);font-weight:500;font-size:calc(var(--P)*.038)}
.sbi{display:flex;gap:calc(var(--P)*.014);align-items:center}
.island{position:absolute;left:50%;top:22%;transform:translateX(-50%);width:31%;height:60%;border-radius:999px;background:#000}
.hole{position:absolute;left:50%;top:24%;transform:translateX(-50%);width:calc(var(--P)*.05);aspect-ratio:1;border-radius:50%;background:#000}
.btn{position:absolute;width:calc(var(--P)*.012);border-radius:3px;background:linear-gradient(90deg,#2b2f37,#5a606b)}
.b1{left:calc(var(--P)*-.008);top:17%;height:5%}.b2{left:calc(var(--P)*-.008);top:25%;height:9%}.b3{left:calc(var(--P)*-.008);top:36%;height:9%}
.a1{right:calc(var(--P)*-.008);top:20%;height:11%}.a2{right:calc(var(--P)*-.008);top:35%;height:6%}
.fd{position:absolute;width:var(--D);aspect-ratio:960/830;border-radius:calc(var(--D)*.036);padding:calc(var(--D)*.013);
  background:linear-gradient(145deg,#4a4f5a 0%,#1c1f26 18%,#0d0f13 50%,#22262e 82%,#555b66 100%);
  box-shadow:0 0 0 calc(var(--D)*.002) rgba(255,255,255,.2) inset,0 calc(var(--D)*.05) calc(var(--D)*.12) rgba(0,0,0,.45)}
.fscreen{position:relative;width:100%;height:100%;border-radius:calc(var(--D)*.024);overflow:hidden;background:#07080B}
.fscreen .shot{height:calc(100% * 800 / 830)}
.fscreen::after{content:"";position:absolute;top:0;bottom:0;left:50%;width:calc(var(--D)*.016);transform:translateX(-50%);z-index:3;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.05) 30%,rgba(0,0,0,.28) 50%,rgba(255,255,255,.05) 70%,transparent)}
.fsb{position:absolute;inset:0 0 auto 0;height:calc(100% * 30 / 830);display:flex;align-items:center;justify-content:space-between;
  padding:0 calc(var(--D)*.03);font:500 calc(var(--D)*.016)/1 Inter,system-ui,sans-serif;color:#fff;background:#07080B;z-index:2}
.fsb .hole{left:75%;width:calc(var(--D)*.018)}
.crop{position:absolute;background-repeat:no-repeat;background-color:#07080B;
  box-shadow:0 0 0 ${W * 0.003}px rgba(255,255,255,.22),0 ${W * 0.03}px ${W * 0.08}px rgba(0,0,0,.5),0 ${W * 0.008}px ${W * 0.02}px rgba(0,0,0,.35)}
.chip{position:absolute;z-index:6;display:flex;align-items:center;gap:.5em;white-space:nowrap;padding:.55em 1em .55em .55em;border-radius:999px;
  font:800 ${W * 0.036}px/1 Inter,system-ui,sans-serif;letter-spacing:-.01em;color:#101217;background:#fff;
  box-shadow:0 .5em 1.4em rgba(0,0,0,.28)}
.chip b{display:grid;place-items:center;width:1.85em;height:1.85em;border-radius:50%;color:#fff;background:var(--c)}
h1{position:absolute;font:800 ${W * 0.125}px/.93 "Bricolage Grotesque",Inter,sans-serif;letter-spacing:-.04em;z-index:5}
.sub{position:absolute;font:600 ${W * 0.041}px/1.32 Inter,sans-serif;z-index:5}
.rings{position:absolute;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 ${W * 0.07}px,rgba(255,255,255,.07) ${W * 0.07}px ${W * 0.07 + 2}px);
  mask:radial-gradient(circle,#000 25%,transparent 68%)}
.fist{position:absolute;background:url("data:image/png;base64,${fistB64}") center/contain no-repeat}
`;

const page = (W, H, body) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${css(W, H)}</style></head><body>${body}<div class="grain"></div></body></html>`;

// ---------------------------------------------------------------- slides (each its own look)
const SLIDES = [
  {
    id: "01-know-what-you-buy",
    render: ({ width: W, height: H, frame }) => {
      const P = Math.min(W * 0.66, H * 0.64 * (390 / 844));
      const py = H * 0.355;
      const cw = W * 0.74;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 90% 45% at 85% 0%,rgba(255,220,180,.6),transparent 60%),linear-gradient(165deg,#FF9160 0%,#F0643C 40%,#C93F2E 100%)"></div>
        <div class="fist" style="left:${W * 0.42}px;top:${H * 0.5}px;width:${W * 0.9}px;height:${W * 0.9}px;opacity:.12;transform:rotate(-12deg)"></div>
        <div class="rings" style="left:${-W * 0.4}px;top:${H * 0.32}px;width:${W * 1.8}px;height:${W * 1.8}px"></div>
        <h1 style="left:${W * 0.07}px;top:${H * 0.06}px;color:#fff">Know what<br>you <span style="color:#2A0B03">buy.</span></h1>
        <p class="sub" style="left:${W * 0.07}px;right:${W * 0.1}px;top:${H * 0.06 + W * 0.255}px;color:rgba(255,255,255,.92)">Scan any barcode. See the country behind it in a second.</p>
        ${phone("hero", frame, { P, x: W * 0.5 - P * 0.78, y: py, rot: -7 })}
        ${crop("hero.verdict", { w: cw, x: W - cw - W * 0.04, y: py + P * (844 / 390) * 0.43, rot: 3.5 })}
        ${chip("scan", "Scan · Photo · Type", "#F0643C", { x: W * 0.5, y: py + P * 0.18, rot: 4 })}`);
    },
  },
  {
    id: "02-skip-it-swap-it",
    render: ({ width: W, height: H }) => {
      const v = "avoid.verdict", a = "avoid.alt";
      const vy = H * 0.2;
      const gap = W * 0.2;
      const below = H * 0.035; // alt card → "Swap it."
      const block = W * 0.15 * 0.95 + W * 0.04 + W * 0.041 * 1.32 * 2; // title + gap + up to 2 sub lines
      const margin = H * 0.045;
      // Shrink both cards if the stack wouldn't fit with a clean bottom margin.
      const room = H - margin - block - below - gap - vy;
      const cw = Math.min(W * 0.86, room / ((cropH(v, W) + cropH(a, W)) / W));
      const cx = (W - cw) / 2;
      const mid = vy + cropH(v, cw) + gap / 2;
      const ay = mid + gap / 2;
      const swapTop = ay + cropH(a, cw) + below;
      const tilt = W * 0.1;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:linear-gradient(160deg,#22C57A,#0A7C47)"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(160deg,#FF6B6B,#D7263D);clip-path:polygon(0 0,100% 0,100% ${mid - tilt}px,0 ${mid + tilt}px)"></div>
        <div class="rings" style="left:${-W * 0.5}px;top:${-W * 0.6}px;width:${W * 1.6}px;height:${W * 1.6}px"></div>
        <h1 style="left:${W * 0.07}px;top:${H * 0.055}px;color:#fff;font-size:${W * 0.15}px">Skip it.</h1>
        <p class="sub" style="left:${W * 0.07}px;right:${W * 0.07}px;top:${H * 0.055 + W * 0.165}px;color:rgba(255,255,255,.92)">Your own Avoid rules, on every barcode.</p>
        ${crop(v, { w: cw, x: cx, y: vy, rot: -3 })}
        <div style="position:absolute;z-index:7;left:${W * 0.5 - W * 0.09}px;top:${mid - W * 0.09}px;width:${W * 0.18}px;height:${W * 0.18}px;border-radius:50%;background:#fff;color:#0A7C47;display:grid;place-items:center;font-size:${W * 0.1}px;box-shadow:0 ${W * 0.02}px ${W * 0.05}px rgba(0,0,0,.3)">${svg("swap")}</div>
        ${crop(a, { w: cw, x: cx, y: ay, rot: 2.5 })}
        <h1 style="right:${W * 0.07}px;top:${swapTop}px;text-align:right;color:#fff;font-size:${W * 0.15}px">Swap it.</h1>
        <p class="sub" style="left:${W * 0.07}px;right:${W * 0.07}px;top:${swapTop + W * 0.15 * 0.95 + W * 0.04}px;text-align:right;color:rgba(255,255,255,.92)">Plus products you've already found fine.</p>`);
    },
  },
  {
    id: "03-who-owns-it",
    render: ({ width: W, height: H, frame }) => {
      const P = Math.min(W * 0.7, H * 0.66 * (390 / 844));
      const py = H * 0.33;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 100% 55%,rgba(240,100,60,.28),transparent 70%),radial-gradient(ellipse 60% 40% at 0% 100%,rgba(240,100,60,.14),transparent 70%),#FFF3E8"></div>
        <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(20,22,28,.09) ${W * 0.002}px,transparent ${W * 0.0025}px);background-size:${W * 0.04}px ${W * 0.04}px"></div>
        <h1 style="left:${W * 0.07}px;top:${H * 0.06}px;color:#15171C">See who's<br><span style="color:#E8553A">really</span> behind it.</h1>
        <p class="sub" style="left:${W * 0.07}px;right:${W * 0.08}px;top:${H * 0.06 + W * 0.255}px;color:#555B66">Brand owners, plus Avoid or Support rules for brands, companies and countries.</p>
        ${phone("owner", frame, { P, x: W - P * 0.86, y: py, rot: 6 })}
        ${crop("owner.owner", { w: W * 0.8, x: W * 0.05, y: py + P * 0.42, rot: -3 })}
        ${crop("owner.rule", { w: W * 0.74, x: W * 0.07, y: py + P * 1.18, rot: 2 })}
        ${chip("building", "Who owns the brand", "#E8553A", { x: W * 0.07, y: py + P * 0.24, rot: -4 })}`);
    },
  },
  {
    id: "04-check-the-whole-cart",
    render: ({ width: W, height: H, frame }) => {
      const P = Math.min(W * 0.6, H * 0.62 * (390 / 844));
      const py = H * 0.345;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 45% at 15% 0%,rgba(160,190,255,.55),transparent 60%),linear-gradient(170deg,#4B4DF2 0%,#3530C9 55%,#221D8F 100%)"></div>
        <div class="rings" style="left:${-W * 0.3}px;top:${H * 0.38}px;width:${W * 1.6}px;height:${W * 1.6}px"></div>
        <h1 style="left:0;right:0;top:${H * 0.06}px;text-align:center;color:#fff">Check the<br>whole <span style="color:#FFD84D">cart.</span></h1>
        <p class="sub" style="left:${W * 0.1}px;right:${W * 0.1}px;top:${H * 0.06 + W * 0.255}px;text-align:center;color:rgba(255,255,255,.9)">Scan as you shop or use a photo. Your basket sorts itself.</p>
        ${phone("basketScan", frame, { P: P * 0.92, x: W * 0.02, y: py + P * 0.16, rot: -9, z: 1 })}
        ${phone("basket", frame, { P, x: W * 0.98 - P, y: py, rot: 6, z: 2 })}
        ${chip("camera", "Works from photos too", "#4B4DF2", { x: W * 0.06, y: py - W * 0.02, rot: -4 })}`);
    },
  },
  {
    id: "05-see-what-the-world-thinks",
    render: ({ width: W, height: H, frame }) => {
      const P = Math.min(W * 0.62, H * 0.62 * (390 / 844));
      const py = H * 0.355;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 45% at 50% 0%,rgba(190,255,215,.45),transparent 60%),linear-gradient(170deg,#16B26E 0%,#0B8550 50%,#05502F 100%)"></div>
        <div class="rings" style="left:${-W * 0.3}px;top:${H * 0.42}px;width:${W * 1.6}px;height:${W * 1.6}px"></div>
        <h1 style="left:0;right:0;top:${H * 0.06}px;text-align:center;color:#fff">See what the<br><span style="color:#D9F99D">world</span> thinks.</h1>
        <p class="sub" style="left:${W * 0.1}px;right:${W * 0.1}px;top:${H * 0.06 + W * 0.255}px;text-align:center;color:rgba(255,255,255,.9)">Real votes from real shoppers, country by country.</p>
        ${phone("country", frame, { P, x: (W - P) / 2, y: py })}
        ${crop("country.verdict", { w: W * 0.84, x: W * 0.08, y: py + P * 1.02, rot: -2.5 })}
        ${chip("globe", "115 countries", "#0B8550", { x: W * 0.56, y: py + P * 0.12, rot: 4 })}`);
    },
  },
];

function featureGraphic() {
  const W = 1024, H = 500, P = 250;
  return page(W, H, `
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 90% 0%,rgba(255,220,180,.55),transparent 60%),linear-gradient(120deg,#FF9160 0%,#F0643C 45%,#C93F2E 100%)"></div>
    <div class="fist" style="left:-60px;top:170px;width:420px;height:420px;opacity:.1;transform:rotate(-12deg)"></div>
    <div style="position:absolute;left:60px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center;z-index:5">
      <div style="display:flex;align-items:center;gap:14px;font:800 30px/1 'Bricolage Grotesque',sans-serif"><img src="data:image/png;base64,${iconB64}" style="width:60px;height:60px;border-radius:15px;box-shadow:0 0 0 3px rgba(255,255,255,.35),0 10px 26px rgba(0,0,0,.25)">Solidarity</div>
      <div style="margin-top:22px;font:800 70px/.93 'Bricolage Grotesque',sans-serif;letter-spacing:-.04em">Know what<br>you <span style="color:#2A0B03">buy.</span></div>
      <div style="margin-top:16px;font:600 20px/1.35 Inter,sans-serif;color:rgba(255,255,255,.92)">Scan a barcode. See the country and the brand owner behind it.</div>
    </div>
    ${phone("hero", "android", { P, x: 600, y: 40, rot: -7 })}
    ${crop("hero.verdict", { w: 330, x: 660, y: 245, rot: 4, z: 4 })}`);
}

/** An unfolded foldable showing capture `id`. D = device width in px. */
const foldable = (id, { D, x, y, rot = 0, z = 1 }) => `<div class="fd" style="--D:${D}px;left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${z}">
  <div class="fscreen"><div class="fsb"><span>12:30</span><i class="hole"></i><span class="sbi">
    <svg viewBox="0 0 16 12" height="0.9em"><path fill="#fff" d="M8 12 0 3.3A11.6 11.6 0 0 1 8 0c3 0 5.8 1.2 8 3.3z"/></svg>
    <svg viewBox="0 0 12 12" height="0.9em"><path fill="#fff" d="M12 0v12H0z"/></svg>
    <svg viewBox="0 0 8 14" height="0.95em"><rect x="0" y="1.5" width="8" height="12.5" rx="1.4" fill="#fff"/><rect x="2.5" y="0" width="3" height="2" rx=".5" fill="#fff"/></svg>
  </span></div><div class="shot s-${id}"></div></div></div>`;

// Play foldable set: unfolded 1:1, unfolded 4:3, outer screen portrait 10:16.
const FOLDABLE = [
  {
    id: "fold-01-unfolded-1x1", width: 2048, height: 2048,
    render: (W, H) => {
      const D = W * 0.84;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 50% at 85% 0%,rgba(255,220,180,.6),transparent 60%),linear-gradient(165deg,#FF9160 0%,#F0643C 45%,#C93F2E 100%)"></div>
        <div class="fist" style="left:${W * 0.62}px;top:${-W * 0.06}px;width:${W * 0.45}px;height:${W * 0.45}px;opacity:.12;transform:rotate(14deg)"></div>
        <div class="rings" style="left:${-W * 0.3}px;top:${H * 0.3}px;width:${W * 1.6}px;height:${W * 1.6}px"></div>
        <h1 style="left:${W * 0.08}px;top:${H * 0.065}px;color:#fff;font-size:${W * 0.105}px">Unfold.<br>See it <span style="color:#2A0B03">all.</span></h1>
        <p class="sub" style="left:${W * 0.08}px;right:${W * 0.08}px;top:${H * 0.065 + W * 0.215}px;font-size:${W * 0.03}px;color:rgba(255,255,255,.92)">Scanner and verdict side by side on the big screen.</p>
        ${foldable("foldHero", { D, x: (W - D) / 2, y: H * 0.36, rot: -2 })}
        ${chip("check", "You support Bangladesh", "#22A866", { x: W * 0.36, y: H * 0.86, rot: 3 })}`);
    },
  },
  {
    id: "fold-02-unfolded-4x3", width: 2400, height: 1800,
    render: (W, H) => {
      const D = W * 0.6;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 60% 70% at 10% 0%,rgba(160,190,255,.55),transparent 60%),linear-gradient(150deg,#4B4DF2 0%,#3530C9 55%,#221D8F 100%)"></div>
        <div class="rings" style="left:${W * 0.25}px;top:${-H * 0.4}px;width:${W * 1.2}px;height:${W * 1.2}px"></div>
        <h1 style="left:${W * 0.06}px;top:${H * 0.2}px;color:#fff;font-size:${W * 0.062}px">Every vote,<br>one <span style="color:#FFD84D">glance.</span></h1>
        <p class="sub" style="left:${W * 0.06}px;width:${W * 0.3}px;top:${H * 0.2 + W * 0.135}px;font-size:${W * 0.019}px;color:rgba(255,255,255,.9)">The whole community, country by country, laid out on your unfolded screen.</p>
        ${foldable("foldCommunity", { D, x: W * 0.37, y: (H - D * 830 / 960) / 2, rot: 2 })}
        <div class="chip" style="left:${W * 0.06}px;top:${H * 0.74}px;transform:rotate(-3deg);--c:#4B4DF2;font-size:${W * 0.022}px"><b>${svg("globe")}</b><span>115 countries</span></div>`);
    },
  },
  {
    id: "fold-03-outer-10x16", width: 1200, height: 1920,
    render: (W, H) => {
      const P = Math.min(W * 0.62, H * 0.6 * (390 / 844));
      const py = H * 0.345;
      return page(W, H, `
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 45% at 50% 0%,rgba(190,255,215,.45),transparent 60%),linear-gradient(170deg,#16B26E 0%,#0B8550 50%,#05502F 100%)"></div>
        <div class="rings" style="left:${-W * 0.3}px;top:${H * 0.4}px;width:${W * 1.6}px;height:${W * 1.6}px"></div>
        <h1 style="left:0;right:0;top:${H * 0.06}px;text-align:center;color:#fff">Folded?<br><span style="color:#D9F99D">Still fast.</span></h1>
        <p class="sub" style="left:${W * 0.1}px;right:${W * 0.1}px;top:${H * 0.06 + W * 0.255}px;text-align:center;color:rgba(255,255,255,.9)">Check any product right from the cover screen.</p>
        ${phone("avoid", "android", { P, x: W * 0.5 - P * 0.62, y: py, rot: -5 })}
        ${crop("avoid.verdict", { w: W * 0.72, x: W * 0.24, y: py + P * 0.95, rot: 3 })}`);
    },
  },
];

// ---------------------------------------------------------------- render
rmSync(OUT, { recursive: true, force: true });
const problems = [];
const render = async (html, width, height, file) => {
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  // Stores flag clipped text as low quality: every headline, subtitle and chip must sit inside the frame.
  const clipped = await p.evaluate(({ width, height }) =>
    [...document.querySelectorAll("h1, .sub, .chip")]
      .map((el) => ({ text: el.textContent.trim().slice(0, 40), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.left < 0 || r.top < 0 || r.right > width || r.bottom > height)
      .map(({ text }) => text), { width, height });
  if (clipped.length) problems.push(`${file}: clipped ${clipped.map((t) => `"${t}"`).join(", ")}`);
  await p.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
  await p.close();
  process.stdout.write("+");
};

for (const t of TARGETS) {
  const dir = join(OUT, t.dir);
  mkdirSync(dir, { recursive: true });
  for (const s of SLIDES) await render(s.render(t), t.width, t.height, join(dir, `${s.id}.png`));
}
await render(featureGraphic(), 1024, 500, join(OUT, "android", "feature-graphic-1024x500.png"));
mkdirSync(join(OUT, "android", "foldable"), { recursive: true });
for (const f of FOLDABLE) await render(f.render(f.width, f.height), f.width, f.height, join(OUT, "android", "foldable", `${f.id}.png`));
await render(
  `<!doctype html><html><body style="margin:0"><img src="data:image/png;base64,${iconB64}" style="width:512px;height:512px;display:block"></body></html>`,
  512, 512, join(OUT, "android", "icon-512.png")
);
copyFileSync(join(root, "assets/images/icon.png"), join(OUT, "ios", "icon-1024.png")); // RGB, no alpha, as Apple requires

await browser.close();
console.log("\nWrote store images to files/android and files/ios");
if (problems.length) {
  console.error(`\n${problems.length} image(s) have clipped text:\n${problems.join("\n")}`);
  process.exitCode = 1;
}
