import { Platform } from "react-native";

export const APP_NAME = "Solidarity";
export const ANDROID_PACKAGE = "com.abdullahwins.solidarity";

/**
 * Numeric App Store ID (from App Store Connect → App Information → Apple ID).
 * Leave empty until the iOS app is live; iOS links then fall back to the website.
 */
export const IOS_APP_STORE_ID = "";

/** Public website (GitHub Pages, deployed from /website). Keep the trailing slash. */
export const WEBSITE_URL = "https://abdullahwins.github.io/solidarity/";

export const LINKS = {
  website: WEBSITE_URL,
  privacy: `${WEBSITE_URL}privacy-policy.html`,
  terms: `${WEBSITE_URL}terms.html`,
  support: `${WEBSITE_URL}support.html`,
  deleteAccount: `${WEBSITE_URL}delete-account.html`,
  playStore: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
  playStoreReview: `market://details?id=${ANDROID_PACKAGE}`,
  appStore: IOS_APP_STORE_ID ? `https://apps.apple.com/app/id${IOS_APP_STORE_ID}` : "",
  appStoreReview: IOS_APP_STORE_ID
    ? `itms-apps://itunes.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`
    : "",
} as const;

/** Store page for the current platform, or the website when there is none. */
export const APP_SHARE_URL =
  Platform.OS === "ios" ? LINKS.appStore || LINKS.website : Platform.OS === "android" ? LINKS.playStore : LINKS.website;
