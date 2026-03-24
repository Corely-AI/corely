import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useShiftStore } from "@/stores/shiftStore";
import { Badge, Card, EmptyState, SegmentedControl } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function RestaurantFloorScreen() {
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { floorPlan, isLoading, loadFloorPlan, openOrResumeTable } = useRestaurantStore();
  const { selectedRegister } = useRegisterStore();
  const { currentShift } = useShiftStore();
  const [roomFilter, setRoomFilter] = useState<string>("ALL");

  useEffect(() => {
    void loadFloorPlan().catch((error) => {
      console.error("Failed to load restaurant floor plan", error);
    });
  }, [loadFloorPlan]);

  const rooms = useMemo(
    () => (roomFilter === "ALL" ? floorPlan : floorPlan.filter((room) => room.id === roomFilter)),
    [floorPlan, roomFilter]
  );

  if (!selectedRegister) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Select a register first"
          description="Restaurant POS uses the same register and shift context as the core POS flow."
        />
      </View>
    );
  }

  if (!currentShift) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Open a shift first"
          description="Restaurant tables can only be opened while a cashier shift is active."
        />
      </View>
    );
  }

  return (
    <ScrollView
      testID="pos-restaurant-floor-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant floor</Text>
        <Text style={styles.subtitle}>
          Open and resume table sessions from the dining room map.
        </Text>
      </View>

      <SegmentedControl
        value={roomFilter}
        onChange={setRoomFilter}
        options={[
          { value: "ALL", label: "All", count: floorPlan.length },
          ...floorPlan.map((room) => ({
            value: room.id,
            label: room.name,
            count: room.tables.length,
          })),
        ]}
      />

      {isLoading ? (
        <Card>
          <Text style={styles.muted}>Loading floor plan…</Text>
        </Card>
      ) : null}

      {rooms.map((room) => (
        <Card key={room.id}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomTitle}>{room.name}</Text>
            <Badge label={`${room.tables.length} tables`} />
          </View>
          <View style={[styles.tablesGrid, isTablet && styles.tablesGridTablet]}>
            {room.tables.map((table) => (
              <Pressable
                key={table.id}
                style={[
                  styles.tableCard,
                  table.availabilityStatus === "OCCUPIED" && styles.tableCardOccupied,
                ]}
                onPress={async () => {
                  try {
                    await openOrResumeTable(table.id);
                    router.push(`/restaurant/table/${table.id}` as never);
                  } catch (error) {
                    Alert.alert(
                      "Unable to open table",
                      error instanceof Error ? error.message : "Unknown error"
                    );
                  }
                }}
              >
                <View style={styles.tableHeader}>
                  <Text style={styles.tableName}>{table.name}</Text>
                  <Ionicons
                    name={
                      table.availabilityStatus === "OCCUPIED" ? "restaurant" : "ellipse-outline"
                    }
                    size={18}
                    color={posTheme.colors.text}
                  />
                </View>
                <Text style={styles.tableMeta}>
                  {table.availabilityStatus} · seats {table.capacity ?? "?"}
                </Text>
                <Text style={styles.tableMeta}>
                  {table.activeOrderId ? "Tap to resume check" : "Tap to open check"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
  },
  content: {
    padding: posTheme.spacing.md,
    gap: posTheme.spacing.md,
  },
  centered: {
    flex: 1,
    padding: posTheme.spacing.lg,
    backgroundColor: posTheme.colors.background,
    justifyContent: "center",
  },
  header: {
    gap: 4,
  },
  title: {
    color: posTheme.colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: posTheme.colors.textMuted,
    fontSize: 14,
  },
  muted: {
    color: posTheme.colors.textMuted,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: posTheme.spacing.sm,
  },
  roomTitle: {
    color: posTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  tablesGrid: {
    gap: posTheme.spacing.sm,
  },
  tablesGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tableCard: {
    borderRadius: posTheme.radius.lg,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surfaceMuted,
    padding: posTheme.spacing.md,
    minWidth: 180,
    gap: 6,
  },
  tableCardOccupied: {
    backgroundColor: posTheme.colors.primaryMuted,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableName: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  tableMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
});
