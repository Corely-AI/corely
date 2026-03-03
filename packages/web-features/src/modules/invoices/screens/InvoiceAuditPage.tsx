import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Button } from "@corely/ui";
import { Loader2 } from "lucide-react";
import { invoicesApi } from "@corely/web-shared/lib/invoices-api";

type AuditEntry = {
  title: string;
  timestamp: string;
  detail?: string;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function InvoiceAuditPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const entity = params.get("entity");
  const id = params.get("id");

  const isInvoiceEntity = entity === "invoice";
  const canLoadInvoice = isInvoiceEntity && Boolean(id);

  const {
    data: invoiceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice-audit", id],
    queryFn: () => invoicesApi.getInvoice(id as string),
    enabled: canLoadInvoice,
  });

  const entries = useMemo<AuditEntry[]>(() => {
    const invoice = invoiceData?.invoice;
    if (!invoice) {
      return [];
    }

    const result: AuditEntry[] = [
      {
        title: "Invoice created",
        timestamp: invoice.createdAt,
      },
      ...(invoice.issuedAt
        ? [
            {
              title: "Invoice issued",
              timestamp: invoice.issuedAt,
            },
          ]
        : []),
      ...(invoice.sentAt
        ? [
            {
              title: "Invoice sent",
              timestamp: invoice.sentAt,
            },
          ]
        : []),
      ...(invoice.pdfGeneratedAt
        ? [
            {
              title: "PDF generated",
              timestamp: invoice.pdfGeneratedAt,
            },
          ]
        : []),
      ...((invoice.payments ?? []).map((payment) => ({
        title: "Payment recorded",
        timestamp: payment.paidAt,
        detail: `${(payment.amountCents / 100).toFixed(2)} ${invoice.currency}`,
      })) satisfies AuditEntry[]),
      ...(invoice.updatedAt !== invoice.createdAt
        ? [
            {
              title: "Last updated",
              timestamp: invoice.updatedAt,
            },
          ]
        : []),
    ];

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [invoiceData]);

  if (!canLoadInvoice) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-muted-foreground">Unsupported audit target.</p>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audit trail...
        </div>
      </div>
    );
  }

  if (error || !invoiceData?.invoice) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-muted-foreground">Could not load invoice audit trail.</p>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Audit Trail</h1>
          <p className="text-muted-foreground">
            Invoice {invoiceData.invoice.number ?? invoiceData.invoice.id}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate(`/invoices/${id}`)}>
          Back to invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No audit events found.</p>
          ) : (
            entries.map((entry, index) => (
              <div
                key={`${entry.title}-${entry.timestamp}-${index}`}
                className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <div className="font-medium">{entry.title}</div>
                  {entry.detail ? (
                    <div className="text-sm text-muted-foreground">{entry.detail}</div>
                  ) : null}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDateTime(entry.timestamp)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
