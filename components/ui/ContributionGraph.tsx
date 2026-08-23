import React, { useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";

type Props = {
  dailyCounts: Record<string, number>;
  weeksToShow?: number;
  cellSize?: number;
  showMonthLabels?: boolean;
  interactive?: boolean;
};

const CELL_GAP = 3;
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const toLocalDateString = (date: Date) => date.toLocaleDateString("en-CA");

function buildWeeks(weeksToShow: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = weeksToShow * 7;
  // find the most recent Saturday (end of current week column) then walk back
  const endOfWeekOffset = 6 - today.getDay();
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + endOfWeekOffset);

  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - (totalDays - 1));

  const weeks: { date: Date; dateStr: string; inRange: boolean }[][] = [];
  const cursor = new Date(gridStart);

  for (let w = 0; w < weeksToShow; w++) {
    const week: { date: Date; dateStr: string; inRange: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      week.push({
        date,
        dateStr: toLocalDateString(date),
        inRange: date <= today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function intensityColor(count: number): string {
  if (count <= 0) return colors.panelSoft;
  if (count === 1) return `${colors.accent}40`;
  if (count <= 3) return `${colors.accent}80`;
  if (count <= 6) return `${colors.accent}bf`;
  return colors.accent;
}

export function ContributionGraph({
  dailyCounts,
  weeksToShow = 53,
  cellSize = 11,
  showMonthLabels = true,
  interactive = true,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [selected, setSelected] = useState<{ dateStr: string; count: number } | null>(null);

  const weeks = useMemo(() => buildWeeks(weeksToShow), [weeksToShow]);

  const monthMarkers = useMemo(() => {
    const markers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0].date;
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        markers.push({ weekIndex, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
    });
    return markers;
  }, [weeks]);

  const step = cellSize + CELL_GAP;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <View>
          {showMonthLabels && (
            <View style={styles.monthRow}>
              {monthMarkers.map((marker, i) => (
                <Text
                  key={`${marker.label}-${marker.weekIndex}`}
                  style={[
                    styles.monthLabel,
                    { marginLeft: i === 0 ? marker.weekIndex * step : undefined },
                  ]}
                >
                  {marker.label}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={{ marginRight: CELL_GAP }}>
                {week.map((day) => {
                  const count = dailyCounts[day.dateStr] ?? 0;
                  return (
                    <View
                      key={day.dateStr}
                      onTouchEnd={
                        interactive && day.inRange
                          ? () => setSelected({ dateStr: day.dateStr, count })
                          : undefined
                      }
                      style={{
                        width: cellSize,
                        height: cellSize,
                        marginBottom: CELL_GAP,
                        borderRadius: 2,
                        backgroundColor: day.inRange
                          ? intensityColor(count)
                          : "transparent",
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {interactive && (
        <Text style={styles.hint}>
          {selected
            ? `${selected.count} scan${selected.count === 1 ? "" : "s"} on ${selected.dateStr}`
            : "Tap a day to see scan count"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
  },
  monthRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  monthLabel: {
    ...typography.caption,
    color: colors.subtext,
    marginRight: 24,
  },
  hint: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: spacing.sm,
  },
});
