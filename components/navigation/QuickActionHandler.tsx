import { useQuickActionCallback } from "expo-quick-actions/hooks";
import { useCallback, useEffect, useRef } from "react";

import { registerQuickActions, runQuickAction } from "../../lib/quickActions";

/**
 * Registers the home-screen shortcuts and routes them. When the first-run
 * intro is showing, the launch action is ignored so the intro comes first;
 * later actions (app already running) are always handled.
 */
export function QuickActionHandler({ skipInitial }: { skipInitial: boolean }) {
  const handledFirst = useRef(false);

  useEffect(() => {
    void registerQuickActions();
  }, []);

  const onAction = useCallback(
    (action: { id: string }) => {
      const first = !handledFirst.current;
      handledFirst.current = true;
      if (first && skipInitial) return;
      // Deferred a tick so the navigator is mounted on a cold start.
      setTimeout(() => void runQuickAction(action), 0);
    },
    [skipInitial]
  );

  useQuickActionCallback(onAction);
  return null;
}
