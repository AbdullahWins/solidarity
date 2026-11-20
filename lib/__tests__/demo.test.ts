import { isDemoEnabled } from "../demo";

describe("demo mode", () => {
  it("is only enabled on web with the explicit flag", () => {
    expect(isDemoEnabled("web", "1")).toBe(true);
    expect(isDemoEnabled("web", null)).toBe(false);
    expect(isDemoEnabled("web", "true")).toBe(false);
  });

  it("can never be enabled on native platforms", () => {
    expect(isDemoEnabled("android", "1")).toBe(false);
    expect(isDemoEnabled("ios", "1")).toBe(false);
  });
});
