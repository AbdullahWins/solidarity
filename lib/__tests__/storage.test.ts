jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { addScan, getScans, updateScan } from "../storage";
import type { ScanRecord } from "../types";

const scan = (id: string): ScanRecord => ({
  id,
  code: "4006381333931",
  country: "Germany",
  isPositive: true,
  source: "camera",
  scannedAt: "2026-11-20T10:00:00.000Z",
});

test("updateScan patches only the given record", async () => {
  await addScan(scan("a"));
  await addScan(scan("b"));
  await updateScan("a", { productName: "Stabilo pen", brand: "Stabilo" });
  const [b, a] = await getScans();
  expect(a).toMatchObject({ id: "a", productName: "Stabilo pen", brand: "Stabilo" });
  expect(b.productName).toBeUndefined();
});
