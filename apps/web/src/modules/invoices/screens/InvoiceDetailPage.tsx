import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { formatMoney } from "@/shared/lib/formatters";
import { invoicesApi } from "@/lib/invoices-api";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  invoiceFormSchema,
  toCreateInvoiceInput,
  getDefaultInvoiceFormValues,
  type InvoiceFormData,
  type InvoiceLineFormData,
} from "../schemas/invoice-form.schema";
import type { UpdateInvoiceInput } from "@corely/contracts";
import { RecordCommandBar } from "@/shared/components/RecordCommandBar";
import { SendInvoiceDialog } from "../components/SendInvoiceDialog";

const DEFAULT_VAT_RATE = 19;

type CustomerOption = {
  id: string;
  displayName: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    country?: string;
  };
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: invoiceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => (id ? invoicesApi.getInvoice(id) : Promise.reject("Missing id")),
    enabled: Boolean(id),
  });

  const invoice = invoiceData?.invoice;
  const capabilities = invoiceData?.capabilities;

  const { data: listData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const embeddedCustomer = invoice?.customer;

  const customers = useMemo<CustomerOption[]>(() => {
    const list: CustomerOption[] = (listData?.customers ?? []).map((customer) => ({
      id: customer.id,
      displayName: customer.displayName,
      billingAddress: customer.billingAddress ?? undefined,
    }));

    if (embeddedCustomer) {
      const embeddedOption: CustomerOption = {
        id: embeddedCustomer.id,
        displayName: embeddedCustomer.displayName,
        billingAddress: embeddedCustomer.billingAddress,
      };
      if (!list.some((customer) => customer.id === embeddedOption.id)) {
        list.unshift(embeddedOption);
      }
    }

    if (
      invoice?.customerPartyId &&
      !list.some((customer) => customer.id === invoice.customerPartyId)
    ) {
      const addressLine1 = invoice.billToAddressLine1 ?? undefined;
      const city = invoice.billToCity ?? undefined;
      const country = invoice.billToCountry ?? undefined;
      list.unshift({
        id: invoice.customerPartyId,
        displayName: invoice.billToName ?? embeddedCustomer?.displayName ?? "Unknown Customer",
        billingAddress:
          addressLine1 || city || country ? { line1: addressLine1, city, country } : undefined,
      });
    }

    return list;
  }, [listData, embeddedCustomer, invoice]);

  const [lineItems, setLineItems] = useState<InvoiceLineFormData[]>(
    getDefaultInvoiceFormValues().lineItems || []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [paymentNote, setPaymentNote] = useState<string>("");

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: getDefaultInvoiceFormValues(),
  });

  useEffect(() => {
    if (!invoice) {
      return;
    }
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
    const seededLines =
      invoice.lineItems.length > 0
        ? invoice.lineItems.map((line) => ({
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
            unit: "h",
          }))
        : getDefaultInvoiceFormValues().lineItems || [];

    setLineItems(seededLines);
    form.reset({
      ...getDefaultInvoiceFormValues(),
      invoiceNumber: invoice.number ?? "",
      customerPartyId: invoice.customerPartyId,
      currency: invoice.currency,
      notes: invoice.notes ?? undefined,
      terms: invoice.terms ?? undefined,
      invoiceDate,
      dueDate,
      vatRate: DEFAULT_VAT_RATE,
      lineItems: seededLines,
    });
    const due = invoice.totals?.dueCents ?? 0;
    setPaymentAmount(due > 0 ? (due / 100).toFixed(2) : "");
  }, [invoice, form]);

  useEffect(() => {
    form.setValue("lineItems", lineItems, { shouldValidate: false });
  }, [form, lineItems]);

  const downloadPdf = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.downloadInvoicePdf(invoiceId),
    onSuccess: (data) => {
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error) => {
      console.error("Download PDF failed", error);
      toast.error("Failed to download invoice PDF");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async (payload: Omit<UpdateInvoiceInput, "invoiceId">) => {
      if (!id) {
        throw new Error("Missing invoice id");
      }
      return invoicesApi.updateInvoice(id, payload);
    },
    onError: (err) => {
      console.error("Update invoice failed", err);
      toast.error("Failed to update invoice");
    },
  });

  // Handle email sending from dialog
  const handleSendInvoice = async (data: {
    to: string;
    subject: string;
    message: string;
    sendCopy: boolean;
  }) => {
    if (!id || !invoice) {return;}
    setIsProcessing(true);
    try {
      // 1. Finalize if needed
      if (invoice.status === "DRAFT") {
        await invoicesApi.finalizeInvoice(id);
      }

      // 2. Send email
      await invoicesApi.sendInvoice(id, {
        to: data.to,
        subject: data.subject,
        message: data.message,
        // copyToMe logic: we'd ideally put user's email in cc/bcc here.
        // For now, we omit it as we don't have user context readily available in this component.
        // A real implementation would fetch currentUser.email.
      });

      toast.success("Invoice sent successfully");
      setSendDialogOpen(false);

      // 3. Refresh
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err) {
      console.error("Failed to send invoice", err);
      toast.error("Failed to send invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle status transitions from RecordCommandBar
  const handleTransition = useCallback(
    async (to: string, input?: Record<string, string>) => {
      if (!id || !invoice) {return;}

      if (to === "SENT") {
        setSendDialogOpen(true);
        return;
      }

      setIsProcessing(true);
      try {
        if (to === "ISSUED") {
          await invoicesApi.finalizeInvoice(id);
          toast.success("Invoice issued");
        } else if (to === "CANCELED") {
          await invoicesApi.cancelInvoice(id, input?.reason);
          toast.success("Invoice canceled");
        }
        void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
        void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      } catch (err) {
        console.error("Transition failed", err);
        toast.error("Could not update invoice status");
      } finally {
        setIsProcessing(false);
      }
    },
    [id, invoice, queryClient]
  );

  // Handle actions from RecordCommandBar
  const handleAction = useCallback(
    async (actionKey: string) => {
      if (!id) {return;}

      if (actionKey === "send") {
        setSendDialogOpen(true);
        return;
      }

      setIsProcessing(true);
      try {
        switch (actionKey) {
          case "issue":
            await invoicesApi.finalizeInvoice(id);
            toast.success("Invoice issued");
            break;
          case "download_pdf":
            downloadPdf.mutate(id);
            return; // Don't invalidate for downloads
          case "record_payment":
            setPaymentDialogOpen(true);
            return; // Opens dialog, don't process further
          case "cancel":
            await invoicesApi.cancelInvoice(id);
            toast.success("Invoice canceled");
            break;
          case "duplicate":
            toast.info("Duplicate feature coming soon");
            return;
          case "export":
            toast.info("Export feature coming soon");
            return;
          case "view_audit":
            navigate(`/audit?entity=invoice&id=${id}`);
            return;
          case "send_reminder":
            toast.info("Reminder feature coming soon");
            return;
        }
        void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
        void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      } catch (err) {
        console.error("Action failed", err);
        toast.error("Action failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [id, downloadPdf, navigate, queryClient]
  );

  const handleSubmit = async (data: InvoiceFormData) => {
    if (!id || !invoice) {
      return;
    }
    try {
      const createInput = toCreateInvoiceInput(data);
      const isDraft = invoice.status === "DRAFT";
      const headerPatch: UpdateInvoiceInput["headerPatch"] = {
        notes: createInput.notes,
        terms: createInput.terms,
      };

      if (isDraft) {
        headerPatch.customerPartyId = createInput.customerPartyId;
        headerPatch.currency = createInput.currency;
        headerPatch.invoiceDate = createInput.invoiceDate;
        headerPatch.dueDate = createInput.dueDate;
      }

      const updateInput: Omit<UpdateInvoiceInput, "invoiceId"> = {
        headerPatch,
        ...(isDraft ? { lineItems: createInput.lineItems } : {}),
      };

      await updateInvoice.mutateAsync(updateInput);
      void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated successfully");
      navigate("/invoices");
    } catch {
      // errors handled by mutation
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: "",
        qty: 1,
        unit: "h",
        unitPriceCents: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    field: keyof InvoiceLineFormData,
    value: string | number
  ) => {
    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setLineItems(updated);
  };

  const { subtotalCents, vatCents, totalCents } = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);
    const vatRate = form.watch("vatRate") ?? DEFAULT_VAT_RATE;
    const vat = Math.round(subtotal * (vatRate / 100));
    return { subtotalCents: subtotal, vatCents: vat, totalCents: subtotal + vat };
  }, [lineItems, form]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
              <span className="text-lg">←</span>
            </Button>
            <h1 className="text-h2 text-foreground">Invoice not found</h1>
          </div>
          <Button variant="accent" onClick={() => navigate("/invoices")}>
            Back to invoices
          </Button>
        </div>
        <p className="text-muted-foreground">We couldn&apos;t load this invoice.</p>
      </div>
    );
  }

  // Record payment mutation (kept for dialog use)
  const recordPayment = () => {
    if (!id) {return;}
    const amountCents = Math.round(parseFloat(paymentAmount || "0") * 100);
    if (!amountCents || Number.isNaN(amountCents)) {
      toast.error("Invalid amount");
      return;
    }
    setIsProcessing(true);
    invoicesApi
      .recordPayment({
        invoiceId: id,
        amountCents,
        paidAt: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        note: paymentNote || undefined,
      })
      .then(() => {
        setPaymentDialogOpen(false);
        setPaymentNote("");
        void queryClient.invalidateQueries({ queryKey: ["invoice", id] });
        void queryClient.invalidateQueries({ queryKey: ["invoices"] });
        toast.success("Payment recorded");
      })
      .catch((err) => {
        console.error("Record payment failed", err);
        toast.error("Failed to record payment");
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const currentCustomerId = form.watch("customerPartyId");
  const selectedCustomer = customers.find((c) => c.id === currentCustomerId);

  const displayName =
    selectedCustomer?.displayName ??
    (invoice && currentCustomerId === invoice.customerPartyId
      ? (invoice.billToName ?? "Unknown Customer")
      : null);

  const addressString = selectedCustomer
    ? [
        selectedCustomer.billingAddress?.line1,
        selectedCustomer.billingAddress?.city,
        selectedCustomer.billingAddress?.country,
      ]
        .filter(Boolean)
        .join(", ")
    : invoice && currentCustomerId === invoice.customerPartyId
      ? [invoice.billToAddressLine1, invoice.billToCity, invoice.billToCountry]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Standardized Record Command Bar */}
      {capabilities && (
        <RecordCommandBar
          title={`Invoice ${invoice.number ?? "Draft"}`}
          subtitle={`Created ${invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}`}
          capabilities={capabilities}
          onBack={() => navigate("/invoices")}
          onTransition={handleTransition}
          onAction={handleAction}
          isLoading={isProcessing}
        />
      )}

      {/* Fallback header if capabilities not yet loaded */}
      {!capabilities && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <span className="text-lg">←</span>
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Invoice {invoice.number ?? "Draft"}</h1>
            <p className="text-sm text-muted-foreground">
              Created {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}
            </p>
          </div>
        </div>
      )}

      <SendInvoiceDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        invoice={invoice}
        onSend={handleSendInvoice}
        isSending={isProcessing}
      />

      {/* Payment Dialog (triggered by record_payment action) */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Log a payment to update the outstanding balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Due: {formatMoney(invoice.totals?.dueCents ?? 0, "en-DE", invoice.currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-note">Note (optional)</Label>
              <Input
                id="payment-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Bank transfer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={recordPayment} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-xs text-muted-foreground uppercase">Customer</Label>
                <Select
                  value={currentCustomerId ?? ""}
                  onValueChange={(value) =>
                    form.setValue("customerPartyId", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer">
                      {displayName ?? "Select customer"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customerPartyId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.customerPartyId.message}
                  </p>
                )}
                {displayName && (
                  <div className="rounded-md border border-dashed border-border p-3 space-y-1">
                    <div className="text-sm font-medium">{displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {addressString || "No address on file"}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Invoice date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.watch("invoiceDate") && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("invoiceDate")
                          ? form.watch("invoiceDate").toLocaleDateString()
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("invoiceDate")}
                        onSelect={(date) => form.setValue("invoiceDate", date || new Date())}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Due date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.watch("dueDate") && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("dueDate")
                          ? form.watch("dueDate")?.toLocaleDateString()
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("dueDate")}
                        onSelect={(date) => form.setValue("dueDate", date || undefined)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Invoice number</Label>
                <Input
                  {...form.register("invoiceNumber")}
                  data-testid="invoice-number-input"
                  className="font-medium"
                  placeholder="Invoice number"
                />
                {form.formState.errors.invoiceNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.invoiceNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Description
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Quantity
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Rate
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                        Total
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => {
                      const lineTotal = item.qty * item.unitPriceCents;
                      const lineItemError = form.formState.errors.lineItems?.[index]?.description;
                      return (
                        <tr key={index} className="border-b border-border">
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateLineItem(index, "description", e.target.value)
                                }
                                placeholder="Description"
                                className="border-0 focus-visible:ring-0 px-0"
                                aria-invalid={Boolean(lineItemError)}
                              />
                              {lineItemError?.message && (
                                <p className="text-xs text-destructive">{lineItemError.message}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={item.qty}
                              onChange={(e) =>
                                updateLineItem(index, "qty", parseFloat(e.target.value) || 0)
                              }
                              className="w-20 border-0 focus-visible:ring-0 px-0"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <Input
                                type="number"
                                value={item.unitPriceCents / 100}
                                onChange={(e) =>
                                  updateLineItem(
                                    index,
                                    "unitPriceCents",
                                    Math.round((parseFloat(e.target.value) || 0) * 100)
                                  )
                                }
                                className="border-0 focus-visible:ring-0 px-0"
                                min="0"
                                step="0.01"
                              />
                              <span className="ml-2 text-sm text-muted-foreground">EUR</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {(lineTotal / 100).toLocaleString("en-DE", {
                              style: "currency",
                              currency: invoice.currency ?? "EUR",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addLineItem}
                className="w-full border-2 border-dashed border-accent rounded-lg py-3 px-4 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add a line
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Notes</Label>
                <Input
                  {...form.register("notes")}
                  placeholder="Notes for the customer"
                  className="w-full"
                />
                <Label>Terms</Label>
                <Input {...form.register("terms")} placeholder="Payment terms" className="w-full" />
              </div>

              <div className="space-y-3 lg:ml-auto lg:w-80">
                <div className="flex justify-between items-center pb-3">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="text-lg font-semibold">
                    {(subtotalCents / 100).toLocaleString("en-DE", {
                      style: "currency",
                      currency: invoice.currency ?? "EUR",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">VAT</span>
                    <Select
                      value={String(form.watch("vatRate") ?? DEFAULT_VAT_RATE)}
                      onValueChange={(value) => form.setValue("vatRate", parseInt(value))}
                    >
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 7, 19].map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-lg font-semibold">
                    {(vatCents / 100).toLocaleString("en-DE", {
                      style: "currency",
                      currency: invoice.currency ?? "EUR",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold">
                    {(totalCents / 100).toLocaleString("en-DE", {
                      style: "currency",
                      currency: invoice.currency ?? "EUR",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate("/invoices")}>
                Cancel
              </Button>
              <Button variant="accent" type="submit" disabled={updateInvoice.isPending}>
                {updateInvoice.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
