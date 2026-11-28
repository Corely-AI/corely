import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { normalizeError } from "@corely/api-client";
import { QuoteSendGuidanceSlot } from "@corely/sales-ui";
import { quoteSendGuidance } from "../quote-send-guidance";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { QuoteForm, type QuoteFormValues } from "../components/QuoteForm";
import { salesQueryKeys } from "../queries/sales.queryKeys";
import { toast } from "sonner";

export default function QuoteDetailPage() {
  const uiCopy = useUiCopy("ui.sales-quotedetailpage");
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quoteData, isLoading } = useQuery({
    queryKey: salesQueryKeys.quotes.detail(quoteId ?? ""),
    queryFn: () => salesApi.getQuote(quoteId ?? ""),
    enabled: Boolean(quoteId),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });
  const customers = (customersData?.customers ?? []).flatMap((customer) =>
    customer.id && customer.displayName
      ? [{ id: customer.id, displayName: customer.displayName }]
      : []
  );

  const quote = quoteData?.quote;
  const isDraft = quote?.status === "DRAFT";
  const quoteInitial = quote
    ? {
        customerPartyId: quote.customerPartyId ?? "",
        customerContactPartyId: quote.customerContactPartyId ?? undefined,
        currency: quote.currency ?? "EUR",
        paymentTerms: quote.paymentTerms ?? "",
        issueDate: quote.issueDate ?? "",
        validUntilDate: quote.validUntilDate ?? "",
        notes: quote.notes ?? "",
        lineItems:
          quote.lineItems?.map((item) => ({
            id: item.id,
            description: item.description ?? "",
            quantity: item.quantity ?? 1,
            unitPriceCents: item.unitPriceCents ?? 0,
            discountCents: item.discountCents,
          })) ?? [],
      }
    : undefined;

  const updateMutation = useMutation({
    mutationFn: (values: QuoteFormValues) =>
      salesApi.updateQuote(quoteId ?? "", {
        quoteId: quoteId ?? "",
        headerPatch: {
          customerPartyId: values.customerPartyId,
          currency: values.currency,
          paymentTerms: values.paymentTerms,
          issueDate: values.issueDate,
          validUntilDate: values.validUntilDate,
          notes: values.notes,
        },
        lineItems: values.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success(uiCopy("quote-updated"));
    },
    onError: () => toast.error(uiCopy("failed-to-update-quote")),
  });

  const sendMutation = useMutation({
    mutationFn: () => salesApi.sendQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success(uiCopy("quote-sent"));
    },
    onError: (error) => {
      const problem = normalizeError(error);
      toast.error(
        problem.code === "Sales:QuoteSendPolicyRejected" ? problem.detail : "Failed to send quote"
      );
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => salesApi.acceptQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success(uiCopy("quote-accepted"));
    },
    onError: () => toast.error(uiCopy("failed-to-accept-quote")),
  });

  const rejectMutation = useMutation({
    mutationFn: () => salesApi.rejectQuote(quoteId ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesQueryKeys.quotes.detail(quoteId ?? "") });
      toast.success(uiCopy("quote-rejected"));
    },
    onError: () => toast.error(uiCopy("failed-to-reject-quote")),
  });

  const convertToOrderMutation = useMutation({
    mutationFn: () => salesApi.convertQuoteToOrder(quoteId ?? ""),
    onSuccess: (data) => {
      toast.success(uiCopy("sales-order-created"));
      navigate(`/sales/orders/${data.order.id}`);
    },
    onError: () => toast.error(uiCopy("failed-to-convert-quote")),
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: () => salesApi.convertQuoteToInvoice(quoteId ?? ""),
    onSuccess: (data) => {
      toast.success(uiCopy("invoice-created"));
      const opened = window.open(
        `/sales/invoices/${data.invoice.id}`,
        "_blank",
        "noopener,noreferrer"
      );
      if (!opened) {
        toast.error(uiCopy("unable-to-open-invoice"));
      }
    },
    onError: () => toast.error(uiCopy("failed-to-convert-quote")),
  });

  if (isLoading) {
    return <PageLoadingSkeleton variant="detail" />;
  }

  if (!quote) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">{uiCopy("loading-quote")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1 text-foreground">
              {uiCopy("quote") + " "}
              {quote.number ?? uiCopy("draft")}
            </h1>
            <Badge variant={isDraft ? "muted" : "accent"}>{quote.status}</Badge>
          </div>
          <p className="text-muted-foreground">{uiCopy("manage-quote-details-and")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate("/sales/copilot")}>
            <Sparkles className="h-4 w-4" />
            {uiCopy("ai-assist")}
          </Button>
          {isDraft && (
            <Button variant="accent" onClick={() => sendMutation.mutate()}>
              {uiCopy("send-quote")}
            </Button>
          )}
          {quote.status === "SENT" && (
            <>
              <Button variant="secondary" onClick={() => acceptMutation.mutate()}>
                {uiCopy("accept")}
              </Button>
              <Button variant="ghost" onClick={() => rejectMutation.mutate()}>
                {uiCopy("reject")}
              </Button>
            </>
          )}
          {quote.status === "ACCEPTED" && (
            <>
              <Button variant="secondary" onClick={() => convertToOrderMutation.mutate()}>
                {uiCopy("convert-to-order")}
              </Button>
              <Button variant="accent" onClick={() => convertToInvoiceMutation.mutate()}>
                {uiCopy("convert-to-invoice")}
              </Button>
            </>
          )}
        </div>
      </div>

      {isDraft && (
        <QuoteSendGuidanceSlot
          Guidance={quoteSendGuidance.get(quote.tenantId)}
          validUntilDate={quote.validUntilDate ?? null}
        />
      )}
      <Card>
        <CardContent className="p-6">
          <QuoteForm
            customers={customers}
            initial={quoteInitial}
            disabled={!isDraft}
            onSubmit={(values) => updateMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
