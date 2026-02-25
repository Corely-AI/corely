import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { posTheme } from "@/ui/theme";

export interface ErrorBannerProps {
  message: string;
  traceId?: string;
  variant?: "error" | "warning" | "info";
  onDismiss?: () => void;
  testID?: string;
}

/**
 * Error banner component for POS with trace ID support
 *
 * Displays error messages with optional trace ID that can be copied
 * for support/debugging purposes.
 */
export function ErrorBanner({
  message,
  traceId,
  variant = "error",
  onDismiss,
  testID = "error-banner",
}: ErrorBannerProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyTraceId = async () => {
    if (traceId) {
      await Clipboard.setStringAsync(traceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const backgroundColor = {
    error: posTheme.colors.bannerErrorBg,
    warning: posTheme.colors.bannerWarningBg,
    info: posTheme.colors.bannerInfoBg,
  }[variant];

  const textColor = {
    error: posTheme.colors.bannerErrorText,
    warning: posTheme.colors.bannerWarningText,
    info: posTheme.colors.bannerInfoText,
  }[variant];

  const borderColor = {
    error: posTheme.colors.bannerErrorBorder,
    warning: posTheme.colors.bannerWarningBorder,
    info: posTheme.colors.bannerInfoBorder,
  }[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>

        {traceId && (
          <TouchableOpacity
            onPress={handleCopyTraceId}
            style={styles.traceIdContainer}
            testID={`${testID}-trace-id-button`}
          >
            <Text style={[styles.traceIdLabel, { color: textColor }]}>
              Trace ID: {traceId.substring(0, 8)}...
            </Text>
            <Text style={[styles.copyButton, { color: textColor }]}>
              {copied ? "✓ Copied" : "Copy"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          testID={`${testID}-dismiss`}
        >
          <Text style={[styles.dismissText, { color: textColor }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  traceIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  traceIdLabel: {
    fontSize: 12,
    fontFamily: "monospace",
    marginRight: 8,
  },
  copyButton: {
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
