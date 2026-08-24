const { withAndroidManifest } = require("@expo/config-plugins");

// expo-media-library's plugin declares READ_EXTERNAL_STORAGE/WRITE_EXTERNAL_STORAGE
// with no maxSdkVersion. This app only ever writes one generated image (never reads
// the gallery) and targets Android 13+ scoped storage, so these two legacy
// permissions are only meaningful on Android 12 (API 32) and below. Scoping them
// keeps the manifest minimal for Play's automated permission review.
const LEGACY_PERMISSIONS = [
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

// expo-camera's own AAR manifest unconditionally declares RECORD_AUDIO (for video
// recording, which this app never does — barcode scanning only). The plugin's
// `recordAudioAndroid: false` option only stops the app-level declaration; the
// library's own manifest still merges it in, so it must be explicitly removed.
const REMOVED_PERMISSIONS = ["android.permission.RECORD_AUDIO"];

module.exports = function withCleanPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    const permissions = manifest["uses-permission"] || [];
    for (const permission of permissions) {
      const name = permission.$["android:name"];
      if (LEGACY_PERMISSIONS.includes(name)) {
        permission.$["android:maxSdkVersion"] = "32";
      }
    }

    for (const name of REMOVED_PERMISSIONS) {
      const alreadyPresent = permissions.some((p) => p.$["android:name"] === name);
      if (!alreadyPresent) {
        permissions.push({ $: { "android:name": name } });
      }
    }
    manifest["uses-permission"] = permissions.map((permission) => {
      if (REMOVED_PERMISSIONS.includes(permission.$["android:name"])) {
        return { $: { ...permission.$, "tools:node": "remove" } };
      }
      return permission;
    });

    return config;
  });
};
