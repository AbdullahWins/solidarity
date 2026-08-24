import { useCallback, useEffect, useState } from "react";

import { DEFAULT_PREFERENCES, getPreferences, savePreferences, type Preferences } from "../lib/preferences";

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setPreferences(await getPreferences());
      setLoading(false);
    })();
  }, []);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      void savePreferences(next);
      return next;
    });
  }, []);

  return { preferences, update, loading };
}
