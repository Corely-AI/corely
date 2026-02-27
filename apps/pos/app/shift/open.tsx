import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useRegisterStore } from "@/stores/registerStore";
import { useShiftStore } from "@/stores/shiftStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { AppShell, Button, Card, MoneyInput, NumericKeypad, useMoneyPad } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function OpenShiftScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { openShift, isLoading } = useShiftStore();
  const { selectedRegister } = useRegisterStore();
  const [inputError, setInputError] = useState<string | null>(null);
  const pad = useMoneyPad("");

  const handleOpenShift = async () => {
    if (!selectedRegister) {
      Alert.alert(t("checkout.registerRequiredTitle"), t("shift.openRegisterRequiredMessage"));
      return;
    }

    const parsed = pad.value ? Number(pad.value) : null;
    const startingCashCents = parsed === null ? null : Math.round(parsed * 100);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setInputError(t("shift.invalidAmountMessage"));
      return;
    }

    setInputError(null);
    try {
      await openShift({
        registerId: selectedRegister.registerId,
        startingCashCents,
      });
      Alert.alert(t("shift.openedTitle"), t("shift.openedMessage"), [
        {
          text: t("common.confirm"),
          onPress: () => router.replace("/(main)"),
        },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("shift.openFailed");
      Alert.alert(t("common.error"), message);
    }
  };

  return (
    <AppShell
      title={t("shift.openTitle")}
      subtitle={t("shift.openDescription")}
      onBack={() => router.back()}
      maxWidth={980}
    >
      <View testID="pos-shift-open-screen" style={[styles.layout, isTablet && styles.layoutTablet]}>
        <Card>
          <View style={styles.cardBody}>
            <View style={styles.iconWrap}>
              <Ionicons name="time-outline" size={46} color={posTheme.colors.primary} />
            </View>
            <MoneyInput
              testID="pos-shift-open-starting-cash"
              label={t("shift.startingCashOptional")}
              value={pad.value}
              onChange={(value) => {
                setInputError(null);
                pad.setValue(value);
              }}
              help={t("shift.startingCashHint")}
              {...(inputError ? { error: inputError } : {})}
            />
            <Button
              testID="pos-shift-open-submit"
              label={t("shift.openShift")}
              onPress={handleOpenShift}
              loading={isLoading}
            />
          </View>
        </Card>

        {isTablet ? (
          <NumericKeypad onKey={pad.append} onBackspace={pad.backspace} onClear={pad.clear} />
        ) : (
          <Text style={styles.mobileHint}>{t("shift.mobileHint")}</Text>
        )}
      </View>
    </AppShell>
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
  cardBody: {
    flex: 1,
    gap: posTheme.spacing.md,
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 6,
  },
  mobileHint: {
    color: posTheme.colors.textMuted,
    textAlign: "center",
    fontSize: 12,
  },
});
