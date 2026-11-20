jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  buildLookupUrl,
  CACHE_LIMIT,
  cacheProduct,
  getCachedProduct,
  lookupProduct,
  parseLookupResponse,
  resetProductCacheMemory,
} from "../productLookup";

const CODE = "3017620422003";
const DAY = 24 * 60 * 60 * 1000;

function respond(status: number, body?: unknown) {
  return jest.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetProductCacheMemory();
});

test("the request carries only the barcode and requested fields", () => {
  const url = buildLookupUrl(CODE, "android");
  expect(url).toBe(
    `https://world.openfoodfacts.org/api/v2/product/${CODE}?fields=product_name,brands,image_front_small_url`
  );
  expect(buildLookupUrl(CODE, "web")).toContain("&app_name=Solidarity");
});

test("parses a found product, keeping the first brand and only https images", () => {
  expect(
    parseLookupResponse({
      status: 1,
      product: { product_name: " Nutella ", brands: "Ferrero, Nutella", image_front_small_url: "https://img/x.jpg" },
    })
  ).toEqual({ status: "found", product: { name: "Nutella", brand: "Ferrero", image: "https://img/x.jpg" } });
  expect(parseLookupResponse({ status: 1, product: { product_name: "X", image_front_small_url: "http://img" } })).toEqual({
    status: "found",
    product: { name: "X", brand: undefined, image: undefined },
  });
});

test("status 0 or an empty product is not found", () => {
  expect(parseLookupResponse({ status: 0 })).toEqual({ status: "not-found" });
  expect(parseLookupResponse({ status: 1, product: {} })).toEqual({ status: "not-found" });
});

test("found products are fetched once, then served from the cache", async () => {
  const fetchImpl = respond(200, { status: 1, product: { product_name: "Nutella", brands: "Ferrero" } });
  const first = await lookupProduct(CODE, { fetchImpl });
  const second = await lookupProduct(CODE, { fetchImpl });
  expect(first).toEqual(second);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("a 404 is cached as not found", async () => {
  const fetchImpl = respond(404);
  expect(await lookupProduct(CODE, { fetchImpl })).toEqual({ status: "not-found" });
  expect(await getCachedProduct(CODE)).toEqual({ status: "not-found" });
});

test("rate limits and errors are unavailable and not cached", async () => {
  expect(await lookupProduct(CODE, { fetchImpl: respond(429) })).toEqual({ status: "unavailable" });
  const failing = jest.fn(async () => {
    throw new Error("offline");
  }) as unknown as typeof fetch;
  expect(await lookupProduct(CODE, { fetchImpl: failing })).toEqual({ status: "unavailable" });
  expect(await getCachedProduct(CODE)).toBeNull();
});

test("a lookup that takes longer than 4 seconds is abandoned", async () => {
  jest.useFakeTimers();
  const hanging = jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })
  ) as unknown as typeof fetch;
  const pending = lookupProduct(CODE, { fetchImpl: hanging });
  await jest.advanceTimersByTimeAsync(4001);
  await expect(pending).resolves.toEqual({ status: "unavailable" });
  jest.useRealTimers();
});

test("cache expiry: 30 days for found, 7 days for not found", async () => {
  const t0 = 1_000_000_000_000;
  await cacheProduct("1", { status: "found", product: { name: "A" } }, t0);
  await cacheProduct("2", { status: "not-found" }, t0);
  expect(await getCachedProduct("1", t0 + 29 * DAY)).not.toBeNull();
  expect(await getCachedProduct("1", t0 + 31 * DAY)).toBeNull();
  expect(await getCachedProduct("2", t0 + 6 * DAY)).not.toBeNull();
  expect(await getCachedProduct("2", t0 + 8 * DAY)).toBeNull();
});

test("the cache keeps at most 1,000 entries, evicting the oldest", async () => {
  for (let i = 0; i <= CACHE_LIMIT; i++) {
    await cacheProduct(String(i), { status: "not-found" }, 1000 + i);
  }
  expect(await getCachedProduct("0", 2000)).toBeNull();
  expect(await getCachedProduct(String(CACHE_LIMIT), 2000)).not.toBeNull();
});
