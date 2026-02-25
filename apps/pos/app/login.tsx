import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { Badge, Button, Card, CenteredActions, TextField } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { isOnline } = useSyncEngine();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isOnline && !isLoading;

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/(main)");
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t("auth.loginFailed"));
      }
    }
  };

  return (
    <KeyboardAvoidingView
      testID="pos-login-screen"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={[styles.cardWrap, isTablet && styles.cardWrapTablet]}>
          <Card>
            <View style={styles.cardBody}>
              <Text style={styles.brand}>{t("common.appName")}</Text>
              <Text style={styles.subtitle}>{t("common.continueSignIn")}</Text>

              {!isOnline ? <Badge label={t("auth.offlineNoSession")} tone="warning" /> : null}

              {error ? (
                <Text testID="pos-login-error" style={styles.error}>
                  {error}
                </Text>
              ) : null}

              <TextField
                testID="pos-login-email"
                label={t("common.email")}
                placeholder={t("common.emailPlaceholder")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!isLoading}
              />
              <TextField
                testID="pos-login-password"
                label={t("common.password")}
                placeholder={t("common.passwordPlaceholder")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />

              <CenteredActions>
                <Button
                  testID="pos-login-submit"
                  label={t("common.signIn")}
                  onPress={handleLogin}
                  loading={isLoading}
                  disabled={!canSubmit}
                  maxWidth={360}
                  size="lg"
                />
              </CenteredActions>
              {!isOnline ? <Text style={styles.offlineHelp}>{t("auth.offlineHelp")}</Text> : null}
            </View>
          </Card>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: posTheme.spacing.md,
    paddingVertical: posTheme.spacing.lg,
  },
  cardWrap: {
    width: "100%",
  },
  cardWrapTablet: {
    maxWidth: 520,
    alignSelf: "center",
  },
  cardBody: {
    gap: posTheme.spacing.sm,
  },
  brand: {
    color: posTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    color: posTheme.colors.textMuted,
    fontSize: 15,
    marginBottom: posTheme.spacing.xs,
  },
  error: {
    color: posTheme.colors.danger,
    fontWeight: "600",
  },
  offlineHelp: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
});
