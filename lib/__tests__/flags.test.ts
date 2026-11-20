import { COUNTRY_ISO } from "../../constants/country-iso";
import { FLAG_SVGS } from "../../constants/flags";
import { getVotableCountryNames } from "../votes";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock("../firebase", () => ({ db: null, isFirebaseConfigured: false }));

describe("flags", () => {
  it("has an ISO code and an SVG flag for every votable country", () => {
    const missing = getVotableCountryNames().filter((name) => !COUNTRY_ISO[name] || !FLAG_SVGS[COUNTRY_ISO[name]]);
    expect(missing).toEqual([]);
  });

  it("stores valid SVG markup", () => {
    for (const svg of Object.values(FLAG_SVGS)) {
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
    }
  });
});
