import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  RestaurantAiToolCard,
  RestaurantApprovalSummaryCard,
  RestaurantFloorAttentionCard,
  RestaurantKitchenSummaryCard,
  RestaurantOrderProposalCard,
  RestaurantShiftCloseSummaryCard,
} from "@corely/contracts";
import { Button, Card, TextField } from "@/ui/components";
import { posTheme } from "@/ui/theme";

type QuickAction = {
  label: string;
  buildPrompt: () => string | Promise<string>;
};

interface RestaurantCopilotPanelProps {
  title: string;
  placeholder?: string;
  helperText?: string;
  quickActions?: QuickAction[];
  runPrompt: (prompt: string) => Promise<RestaurantAiToolCard | null>;
  onApplyOrderProposal?: (card: RestaurantOrderProposalCard) => Promise<void>;
  testIdPrefix?: string;
}

const isOrderProposal = (card: RestaurantAiToolCard): card is RestaurantOrderProposalCard =>
  card.cardType === "restaurant.order-proposal";
const isFloorAttention = (card: RestaurantAiToolCard): card is RestaurantFloorAttentionCard =>
  card.cardType === "restaurant.floor-attention";
const isKitchenSummary = (card: RestaurantAiToolCard): card is RestaurantKitchenSummaryCard =>
  card.cardType === "restaurant.kitchen-summary";
const isApprovalSummary = (card: RestaurantAiToolCard): card is RestaurantApprovalSummaryCard =>
  card.cardType === "restaurant.approval-summary";
const isShiftSummary = (card: RestaurantAiToolCard): card is RestaurantShiftCloseSummaryCard =>
  card.cardType === "restaurant.shift-close-summary";

export function RestaurantCopilotPanel({
  title,
  placeholder,
  helperText,
  quickActions = [],
  runPrompt,
  onApplyOrderProposal,
  testIdPrefix = "pos-restaurant-copilot",
}: RestaurantCopilotPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [card, setCard] = useState<RestaurantAiToolCard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executePrompt = async (prompt: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextCard = await runPrompt(prompt);
      setCard(nextCard);
      if (!nextCard) {
        setErrorMessage("The copilot did not return a restaurant tool card.");
      }
    } catch (error) {
      setCard(null);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <View testID={`${testIdPrefix}-panel`} style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        {errorMessage ? (
          <Text testID={`${testIdPrefix}-error`} style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}

        {placeholder ? (
          <View style={styles.form}>
            <TextField
              testID={`${testIdPrefix}-input`}
              value={input}
              onChangeText={setInput}
              placeholder={placeholder}
            />
            <Button
              testID={`${testIdPrefix}-submit`}
              label={isLoading ? "Thinking..." : "Ask copilot"}
              onPress={() => void executePrompt(input)}
              disabled={isLoading || !input.trim()}
            />
          </View>
        ) : null}

        {quickActions.length > 0 ? (
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <Button
                key={action.label}
                testID={`${testIdPrefix}-quick-${action.label
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/gu, "-")
                  .replace(/(^-|-$)/gu, "")}`}
                label={action.label}
                variant="secondary"
                disabled={isLoading}
                onPress={() => {
                  void Promise.resolve(action.buildPrompt()).then((prompt) =>
                    executePrompt(prompt)
                  );
                }}
              />
            ))}
          </View>
        ) : null}

        {card ? (
          <View testID={`${testIdPrefix}-card`} style={styles.result}>
            <Text testID={`${testIdPrefix}-title`} style={styles.cardTitle}>
              {"title" in card ? card.title : "Restaurant copilot"} ·{" "}
              {Math.round(card.confidence * 100)}%
            </Text>
            <Text testID={`${testIdPrefix}-summary`} style={styles.summary}>
              {"summary" in card
                ? card.summary
                : "matches" in card
                  ? `${card.matches.length} menu matches`
                  : ""}
            </Text>

            {isOrderProposal(card) ? (
              <View testID={`${testIdPrefix}-order-proposal`} style={styles.resultBlock}>
                <Text testID={`${testIdPrefix}-rationale`} style={styles.resultText}>
                  {card.rationale}
                </Text>
                {card.ambiguities.map((ambiguity) => (
                  <Text key={`${ambiguity.field}:${ambiguity.message}`} style={styles.resultText}>
                    {ambiguity.message}
                  </Text>
                ))}
                {card.missingRequiredModifiers.map((item, index) => (
                  <Text
                    key={`${item.catalogItemId}:${item.modifierGroupId}`}
                    testID={`${testIdPrefix}-missing-modifier-${index}`}
                    style={styles.resultText}
                  >
                    Missing required modifier: {item.itemName || item.catalogItemId} ·{" "}
                    {item.modifierGroupName}
                  </Text>
                ))}
                <View style={styles.resultActions}>
                  {onApplyOrderProposal ? (
                    <Button
                      testID={`${testIdPrefix}-apply`}
                      label="Apply proposal"
                      disabled={isLoading || card.action.actionType === "NOOP"}
                      onPress={() => {
                        void onApplyOrderProposal(card);
                      }}
                    />
                  ) : null}
                  <Button
                    testID={`${testIdPrefix}-dismiss`}
                    label="Dismiss"
                    variant="ghost"
                    disabled={isLoading}
                    onPress={() => setCard(null)}
                  />
                </View>
              </View>
            ) : null}

            {isFloorAttention(card) ? (
              <View testID={`${testIdPrefix}-floor-attention`} style={styles.resultBlock}>
                {card.items.map((item, index) => (
                  <Text
                    key={item.tableId}
                    testID={`${testIdPrefix}-floor-item-${index}`}
                    style={styles.resultText}
                  >
                    {item.tableName}: {item.status} · {item.reason}
                  </Text>
                ))}
              </View>
            ) : null}

            {isKitchenSummary(card) ? (
              <View testID={`${testIdPrefix}-kitchen-summary`} style={styles.resultBlock}>
                {card.items.map((item, index) => (
                  <Text
                    key={item.ticketId}
                    testID={`${testIdPrefix}-kitchen-item-${index}`}
                    style={styles.resultText}
                  >
                    Ticket {item.ticketId.slice(0, 8)} · {item.status} · {item.ageMinutes}m
                  </Text>
                ))}
              </View>
            ) : null}

            {isApprovalSummary(card) ? (
              <View testID={`${testIdPrefix}-approval-summary`} style={styles.resultBlock}>
                {card.items.map((item, index) => (
                  <Text
                    key={item.approvalRequestId}
                    testID={`${testIdPrefix}-approval-item-${index}`}
                    style={styles.resultText}
                  >
                    {item.type} · {item.status} · {item.reason}
                  </Text>
                ))}
              </View>
            ) : null}

            {isShiftSummary(card) ? (
              <View testID={`${testIdPrefix}-shift-summary`} style={styles.resultBlock}>
                {card.anomalies.map((anomaly, index) => (
                  <Text
                    key={anomaly}
                    testID={`${testIdPrefix}-shift-anomaly-${index}`}
                    style={styles.resultText}
                  >
                    {anomaly}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: posTheme.spacing.sm,
  },
  title: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  helper: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: posTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  form: {
    gap: posTheme.spacing.sm,
  },
  quickActions: {
    gap: posTheme.spacing.xs,
  },
  result: {
    borderTopWidth: 1,
    borderTopColor: posTheme.colors.border,
    paddingTop: posTheme.spacing.sm,
    gap: posTheme.spacing.xs,
  },
  cardTitle: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  summary: {
    color: posTheme.colors.text,
  },
  resultBlock: {
    gap: 4,
  },
  resultActions: {
    gap: posTheme.spacing.xs,
    marginTop: posTheme.spacing.xs,
  },
  resultText: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
});
