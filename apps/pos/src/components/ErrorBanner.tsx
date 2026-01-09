import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";

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
    error: "#FEE2E2", // red-100
    warning: "#FEF3C7", // yellow-100
    info: "#DBEAFE", // blue-100
  }[variant];

  const textColor = {
    error: "#991B1B", // red-800
    warning: "#92400E", // yellow-800
    info: "#1E40AF", // blue-800
  }[variant];

  const borderColor = {
    error: "#FCA5A5", // red-300
    warning: "#FCD34D", // yellow-300
    info: "#93C5FD", // blue-300
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
