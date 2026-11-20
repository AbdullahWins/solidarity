import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";
import { Platform } from "react-native";

import { ensureBasketLoaded, setBasketActive } from "./basket";

/**
 * Home-screen shortcuts (long-press the app icon): straight to the camera,
 * or straight into basket mode.
 */
export type QuickActionId = "scan" | "basket";

export const QUICK_ACTIONS: QuickActions.Action[] = [
  { id: "scan", title: "Scan", icon: Platform.OS === "ios" ? "symbol:barcode.viewfinder" : undefined },
  { id: "basket", title: "Basket", icon: Platform.OS === "ios" ? "symbol:basket" : undefined },
];

export async function registerQuickActions(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (!(await QuickActions.isSupported())) return;
    await QuickActions.setItems(QUICK_ACTIONS);
  } catch {
    // Shortcuts are a convenience; never block startup on them.
  }
}

/** What an action should do: always the Scan tab, with basket mode on for "basket". */
export function planQuickAction(id: string): { basket: boolean } | null {
  if (id === "scan") return { basket: false };
  if (id === "basket") return { basket: true };
  return null;
}

export async function runQuickAction(action: Pick<QuickActions.Action, "id">): Promise<void> {
  const plan = planQuickAction(action.id);
  if (!plan) return;
  if (plan.basket) {
    // On a cold start the saved basket may still be loading; don't let it overwrite this.
    await ensureBasketLoaded();
    await setBasketActive(true);
  }
  router.navigate("/");
}
