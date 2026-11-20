import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PREFERENCES,
  getCachedPreferences,
  getPreferences,
  savePreferences,
  type Preferences,
} from "../lib/preferences";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setPreferences(await getPreferences());
      setLoading(false);
    })();
  }, []);

  // Merge into the shared cached copy, not this instance's state: several
  // screens hold their own usePreferences(), and a stale copy must not
  // overwrite a setting another screen changed since.
  const update = useCallback(async (patch: Partial<Preferences>) => {
    const next = { ...getCachedPreferences(), ...patch };
    setPreferences(next);
    await savePreferences(next);
  }, []);

  return { preferences, update, loading };
}
