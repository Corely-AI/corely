import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Register } from "@corely/contracts";
import { useRegisterStore } from "@/stores/registerStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { AppShell, Badge, Button, Card, EmptyState, TextField } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function RegisterSelectionScreen() {
  const { t } = useTranslation();
  const { isTablet } = useAdaptiveLayout();
  const { registers, selectedRegister, isLoading, loadRegisters, selectRegister } =
    useRegisterStore();
  const [search, setSearch] = useState("");
  const [draftSelection, setDraftSelection] = useState<string | null>(
    selectedRegister?.registerId ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadRegisters().catch((error) => {
      Alert.alert(t("common.error"), t("register.failedLoad"));
      console.error(error);
    });
  }, [loadRegisters, t]);

  useEffect(() => {
    if (selectedRegister?.registerId) {
      setDraftSelection(selectedRegister.registerId);
    }
  }, [selectedRegister?.registerId]);

  const filteredRegisters = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return registers;
    }
    return registers.filter((item) => item.name.toLowerCase().includes(query));
  }, [registers, search]);

  const selected =
    filteredRegisters.find((item) => item.registerId === draftSelection) ??
    registers.find((item) => item.registerId === draftSelection) ??
    null;

  const handleUseRegister = async (registerId = draftSelection) => {
    if (!registerId) {
      return;
    }
    setSubmitting(true);
    try {
      await selectRegister(registerId);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)");
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("register.failedSelect"));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={t("register.selectTitle")}
      subtitle={t("register.selectSubtitle")}
      onBack={() => router.back()}
    >
      <View
        testID="pos-register-selection-screen"
        style={[styles.layout, isTablet && styles.layoutTablet]}
      >
        <Card>
          <View style={styles.listHeader}>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder={t("register.searchPlaceholder")}
              testID="pos-register-search"
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={posTheme.colors.primary} />
              <Text style={styles.loadingText}>{t("register.loading")}</Text>
            </View>
          ) : filteredRegisters.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={
                  <Ionicons name="desktop-outline" size={40} color={posTheme.colors.textMuted} />
                }
                title={t("register.noneAvailable")}
                description={t("register.noneFoundHint")}
              />
            </View>
          ) : (
            <FlatList
              data={filteredRegisters}
              keyExtractor={(item) => item.registerId}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <RegisterRow
                  register={item}
                  selected={item.registerId === draftSelection}
                  onPress={() => {
                    setDraftSelection(item.registerId);
                    void handleUseRegister(item.registerId);
                  }}
                />
              )}
            />
          )}
        </Card>

        <Card>
          {selected ? (
            <View style={styles.detailBody}>
              <Text style={styles.detailTitle}>{selected.name}</Text>
              <View style={styles.detailMeta}>
                <Badge
                  label={selected.status}
                  tone={
                    selected.status === "ACTIVE"
                      ? "success"
                      : selected.status === "INACTIVE"
                        ? "warning"
                        : "neutral"
                  }
                />
              </View>
              <Text style={styles.detailText}>
                {t("register.idLabel", { id: selected.registerId.slice(0, 8) })}
              </Text>
              <Text style={styles.detailText}>{t("register.useHint")}</Text>
              <Button
                testID="pos-register-use-selected"
                label={t("register.useSelected")}
                onPress={handleUseRegister}
                loading={submitting}
                disabled={!draftSelection || submitting}
              />
            </View>
          ) : (
            <EmptyState
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={40}
                  color={posTheme.colors.textMuted}
                />
              }
              title={t("register.pickTitle")}
              description={t("register.pickDescription")}
            />
          )}
        </Card>
      </View>
    </AppShell>
  );
}

function RegisterRow({
  register,
  selected,
  onPress,
}: {
  register: Register;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      testID={`pos-register-item-${register.registerId}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t("register.accessibilityUse", { name: register.name })}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{register.name}</Text>
        <Text style={styles.rowSubtitle}>
          {t("register.statusLabel", { status: register.status })}
        </Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={posTheme.colors.primary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  layoutTablet: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  listHeader: {
    marginBottom: posTheme.spacing.sm,
  },
  listContent: {
    gap: posTheme.spacing.xs,
    paddingBottom: posTheme.spacing.sm,
  },
  row: {
    minHeight: 56,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surfaceMuted,
    paddingHorizontal: posTheme.spacing.sm,
    paddingVertical: posTheme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
  },
  rowSelected: {
    borderColor: posTheme.colors.primary,
    backgroundColor: posTheme.colors.primaryMuted,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  rowSubtitle: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  detailBody: {
    flex: 1,
    gap: posTheme.spacing.sm,
    justifyContent: "space-between",
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: posTheme.colors.text,
  },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.xs,
  },
  detailText: {
    color: posTheme.colors.textMuted,
  },
  loadingWrap: {
    paddingVertical: posTheme.spacing.xl,
    alignItems: "center",
    gap: posTheme.spacing.xs,
  },
  loadingText: {
    color: posTheme.colors.textMuted,
  },
  emptyWrap: {
    paddingBottom: posTheme.spacing.sm,
  },
});
