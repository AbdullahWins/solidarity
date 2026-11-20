import { computeCheckDigit, expandUpcE, hasValidCheckDigit, parseBarcode } from "../gtin";
import { countryForPrefix, identifyCountry } from "../scan-logic";

describe("check digits", () => {
  it.each(["4006381333931", "036000291452", "96385074", "00012345600012"])("accepts %s", (code) => {
    expect(hasValidCheckDigit(code)).toBe(true);
  });
  it("rejects a typo", () => {
    expect(hasValidCheckDigit("4006381333932")).toBe(false);
  });
});

describe("parseBarcode", () => {
  it("pads UPC-A to GTIN-13 before taking the prefix", () => {
    const parsed = parseBarcode("036000291452");
    expect(parsed).toMatchObject({ ok: true, kind: "upc_a", prefix: "003" });
    expect(identifyCountry("036000291452")).toBe("USA & Canada");
  });

  it("matches the iOS 13-digit form of the same UPC-A", () => {
    expect(identifyCountry("0036000291452")).toBe("USA & Canada");
  });

  it("reads EAN-13 prefixes", () => {
    expect(identifyCountry("4006381333931")).toBe("Germany");
    const india = `890103086527${computeCheckDigit("890103086527")}`;
    expect(identifyCountry(india)).toBe("India");
  });

  it("strips spaces and dashes", () => {
    expect(parseBarcode("400 6381-333931")).toMatchObject({ ok: true, code: "4006381333931" });
  });

  it("handles EAN-8 and restricted EAN-8 ranges", () => {
    expect(parseBarcode("96385074")).toMatchObject({ ok: true, kind: "ean8", prefix: "963" });
    expect(countryForPrefix(null)).toBe("Reserved");
  });

  it("expands UPC-E", () => {
    // 0 | 12345 | 0 -> manufacturer 12000, product 00345
    expect(expandUpcE("01234505")).toBe("012000003455");
    expect(parseBarcode("01234505", "upc_e")).toMatchObject({ ok: true, kind: "upc_e", prefix: "001" });
    expect(parseBarcode("123450")).toMatchObject({ ok: true, kind: "upc_e", code: "01234505" });
    expect(parseBarcode("01234506", "upc_e")).toMatchObject({ ok: false, reason: "checksum" });
  });

  it("uses GTIN-14 prefix after the indicator digit", () => {
    expect(parseBarcode("10012345678902")).toMatchObject({ ok: true, prefix: "001" });
  });

  it("rejects bad input with a reason", () => {
    expect(parseBarcode("")).toMatchObject({ ok: false, reason: "empty" });
    expect(parseBarcode("12345")).toMatchObject({ ok: false, reason: "length" });
    expect(parseBarcode("4006381333932")).toMatchObject({ ok: false, reason: "checksum" });
    expect(identifyCountry("https://example.com")).toBeNull();
  });
});
