jest.mock("expo-camera", () => ({ scanFromURLAsync: jest.fn() }));

import { pickRetailCodes, planPhoto } from "../photoScan";

test("keeps valid retail codes and drops bad check digits and other types", () => {
  const codes = pickRetailCodes([
    { type: "ean13", data: "4006381333931" },
    { type: "ean13", data: "4006381333932" }, // wrong check digit
    { type: "qr", data: "https://example.com" },
    { type: "ean8", data: "96385074" },
  ]);
  expect(codes.map((c) => c.code)).toEqual(["4006381333931", "96385074"]);
});

test("merges duplicates, including UPC-A reported as EAN-13", () => {
  const codes = pickRetailCodes([
    { type: "ean13", data: "4006381333931" },
    { type: "ean13", data: "4006381333931" },
    { type: "upc_a", data: "036000291452" },
    { type: "ean13", data: "0036000291452" },
  ]);
  expect(codes).toHaveLength(2);
});

test("plans none / one / choose / all", () => {
  const one = pickRetailCodes([{ type: "ean13", data: "4006381333931" }]);
  const two = pickRetailCodes([
    { type: "ean13", data: "4006381333931" },
    { type: "ean8", data: "96385074" },
  ]);
  expect(planPhoto([], false)).toEqual({ kind: "none" });
  expect(planPhoto(one, false).kind).toBe("one");
  expect(planPhoto(two, false).kind).toBe("choose");
  expect(planPhoto(two, true).kind).toBe("all");
});
