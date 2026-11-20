import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

import { LINKS } from "../constants/app-info";
import { colors } from "../constants/theme";

/** In-app browser (SFSafariViewController / Custom Tabs) styled to match the app. */
export async function openInAppBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      enableBarCollapsing: true,
    });
  } catch {
    await Linking.openURL(url).catch(() => {});
  }
}

/** Opens the store's review page for this platform, falling back to the web listing. */
export async function openStoreReview(): Promise<void> {
  const native = Platform.OS === "ios" ? LINKS.appStoreReview : Platform.OS === "android" ? LINKS.playStoreReview : "";
  if (native) {
    try {
      await Linking.openURL(native);
      return;
    } catch {
      // store app missing (emulator, de-Googled device) — fall through
    }
  }
  const web = Platform.OS === "ios" ? LINKS.appStore || LINKS.website : LINKS.playStore;
  await openInAppBrowser(web);
}

export function openEmail(address: string, subject: string): void {
  Linking.openURL(`mailto:${address}?subject=${encodeURIComponent(subject)}`).catch(() => {});
}
