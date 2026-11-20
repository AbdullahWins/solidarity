import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";

type Props = {
  dailyCounts: Record<string, number>;
  /** Fixed number of weeks. When omitted, as many weeks as fit the width (max 53). */
  weeksToShow?: number;
  cellSize?: number;
  showMonthLabels?: boolean;
  interactive?: boolean;
};

const CELL_GAP = 3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const toLocalDateString = (date: Date) => date.toLocaleDateString("en-CA");

type Day = { dateStr: string; month: number; inRange: boolean };

function buildWeeks(weeks: number): Day[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Grid ends on the Saturday of the current week; columns are weeks.
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - today.getDay()));
  const cursor = new Date(gridEnd);
  cursor.setDate(cursor.getDate() - (weeks * 7 - 1));

  const out: Day[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: Day[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ dateStr: toLocalDateString(cursor), month: cursor.getMonth(), inRange: cursor <= today });
      cursor.setDate(cursor.getDate() + 1);
    }
    out.push(week);
  }
  return out;
}

function intensity(count: number): string {
  if (count <= 0) return colors.panelStrong;
  if (count === 1) return "rgba(142, 166, 255, 0.35)";
  if (count <= 3) return "rgba(142, 166, 255, 0.6)";
  if (count <= 6) return "rgba(142, 166, 255, 0.85)";
  return colors.accent;
}

const formatDay = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export function ContributionGraph({
  dailyCounts,
  weeksToShow,
  cellSize = 12,
  showMonthLabels = true,
  interactive = true,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<Day | null>(null);
  const step = cellSize + CELL_GAP;
  const weeksCount = weeksToShow ?? Math.max(8, Math.min(53, Math.floor((width + CELL_GAP) / step)));
  const weeks = useMemo(() => buildWeeks(weeksCount), [weeksCount]);

  const monthMarkers = useMemo(() => {
    const markers: { index: number; label: string }[] = [];
    let last = -1;
    weeks.forEach((week, index) => {
      if (week[0].month !== last) {
        if (index > 0 || week[0].dateStr.endsWith("-01")) markers.push({ index, label: MONTHS[week[0].month] });
        last = week[0].month;
      }
    });
    return markers;
  }, [weeks]);

  const total = useMemo(
    () => weeks.flat().reduce((sum, d) => sum + (d.inRange ? dailyCounts[d.dateStr] ?? 0 : 0), 0),
    [weeks, dailyCounts]
  );

  const onPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const w = Math.floor(locationX / step);
    const d = Math.floor(locationY / step);
    const day = weeks[w]?.[d];
    if (day?.inRange) setSelected(day);
  };

  const ready = weeksToShow !== undefined || width > 0;

  const grid = (
    <View style={styles.grid}>
      {weeks.map((week, w) => (
        <View key={w} style={{ marginRight: w === weeks.length - 1 ? 0 : CELL_GAP }}>
          {week.map((day) => {
            const isSelected = selected?.dateStr === day.dateStr;
            return (
              <View
                key={day.dateStr}
                style={{
                  width: cellSize,
                  height: cellSize,
                  marginBottom: CELL_GAP,
                  borderRadius: Math.max(2, cellSize * 0.25),
                  backgroundColor: day.inRange ? intensity(dailyCounts[day.dateStr] ?? 0) : "transparent",
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: colors.text,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View onLayout={weeksToShow === undefined ? (e) => setWidth(e.nativeEvent.layout.width) : undefined}>
      {ready ? (
        <>
          {showMonthLabels && (
            <View style={[styles.monthRow, { height: 16 }]}>
              {monthMarkers.map((m) => (
                <Text key={`${m.label}-${m.index}`} style={[styles.monthLabel, { left: m.index * step }]}>
                  {m.label}
                </Text>
              ))}
            </View>
          )}
          {interactive ? (
            <Pressable
              onPress={onPress}
              accessibilityRole="image"
              accessibilityLabel={`Scan activity: ${total} scans in the last ${weeksCount} weeks`}
              accessibilityHint="Tap a day to see its scan count"
            >
              {grid}
            </Pressable>
          ) : (
            grid
          )}
          {interactive && (
            <View style={styles.footer}>
              <Text style={styles.hint}>
                {selected
                  ? `${dailyCounts[selected.dateStr] ?? 0} scan${(dailyCounts[selected.dateStr] ?? 0) === 1 ? "" : "s"} · ${formatDay(selected.dateStr)}`
                  : `${total} scans in ${weeksCount} weeks · tap a day`}
              </Text>
              <View style={styles.legend}>
                <Text style={styles.legendText}>Less</Text>
                {[0, 1, 2, 4, 7].map((n) => (
                  <View key={n} style={[styles.legendCell, { backgroundColor: intensity(n) }]} />
                ))}
                <Text style={styles.legendText}>More</Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={{ height: 7 * step + (showMonthLabels ? 16 : 0) }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
  },
  monthRow: {
    marginBottom: spacing.xs,
  },
  monthLabel: {
    ...typography.caption,
    color: colors.muted,
    position: "absolute",
    top: 0,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.subtext,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  legendText: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
    marginHorizontal: 2,
  },
});
