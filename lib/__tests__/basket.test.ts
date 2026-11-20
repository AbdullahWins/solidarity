jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import {
  addToBasket,
  basketCounts,
  basketShareText,
  BASKET_EXPIRY_MS,
  finishBasket,
  getBasket,
  loadBasket,
  removeFromBasket,
  setBasketActive,
} from "../basket";

const item = (code: string, tone: "positive" | "negative" | "neutral", country = "Germany") => ({
  scanId: `s-${code}`,
  addedAt: 0,
  code,
  country,
  tone,
});

beforeEach(async () => {
  await finishBasket(0);
});

test("a barcode is added once per basket", async () => {
  await setBasketActive(true, 1000);
  expect(await addToBasket(item("111", "positive"), 1000)).toBe(true);
  expect(await addToBasket(item("111", "positive"), 2000)).toBe(false);
  expect(getBasket().items).toHaveLength(1);
});

test("counts follow adds and removes", async () => {
  await setBasketActive(true, 0);
  await addToBasket(item("1", "positive"));
  await addToBasket(item("2", "negative"));
  await addToBasket(item("3", "neutral", "Coupons"));
  expect(basketCounts(getBasket().items)).toEqual({ positive: 1, negative: 1, neutral: 1, total: 3 });
  await removeFromBasket("2");
  expect(basketCounts(getBasket().items)).toEqual({ positive: 1, negative: 0, neutral: 1, total: 2 });
});

test("an open basket is restored, and discarded after 12 hours idle", async () => {
  await setBasketActive(true, 0);
  await addToBasket(item("1", "positive"), 1000);
  expect((await loadBasket(1000 + 60 * 60 * 1000)).items).toHaveLength(1);
  const stale = await loadBasket(1000 + BASKET_EXPIRY_MS + 1);
  expect(stale.items).toHaveLength(0);
  expect(stale.active).toBe(false);
});

test("finishing empties the basket and turns basket mode off", async () => {
  await setBasketActive(true);
  await addToBasket(item("1", "positive"));
  await finishBasket();
  expect(getBasket()).toMatchObject({ active: false, items: [] });
});

test("the share text groups by verdict and contains no barcodes", () => {
  const text = basketShareText([
    item("4006381333931", "positive"),
    { ...item("5601234567892", "negative", "Portugal"), productName: "Olive oil" },
  ]);
  expect(text).toContain("My basket: 2 items. 1 fine, 1 to avoid, 0 neutral.");
  expect(text).toContain("Avoid:\n• Olive oil (Portugal)");
  expect(text).toContain("Fine:\n• Germany");
  expect(text).not.toMatch(/\d{8,}/);
});

test("the same barcode captured twice is saved once", async () => {
  const { recordBasketScan } = require("../basket") as typeof import("../basket");
  await setBasketActive(true);
  const saveScan = jest.fn(async () => ({ record: { id: "scan-1" } }));
  const input = { code: "4006381333931", country: "Germany", tone: "positive" as const };
  expect((await recordBasketScan(input, saveScan)).status).toBe("added");
  expect((await recordBasketScan(input, saveScan)).status).toBe("duplicate");
  expect(saveScan).toHaveBeenCalledTimes(1);
  expect(getBasket().items).toHaveLength(1);
});
