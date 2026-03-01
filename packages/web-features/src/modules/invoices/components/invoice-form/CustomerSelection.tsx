import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@corely/ui";
import { Label } from "@corely/ui";
import { Input } from "@corely/ui";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@corely/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { customersApi } from "@corely/web-shared/lib/customers-api";
import { workspaceQueryKeys } from "@corely/web-shared/shared/workspaces/workspace-query-keys";
import {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  type CustomerFormData,
} from "../../schemas/customer-form.schema";
import { type InvoiceFormData } from "../../schemas/invoice-form.schema";

export interface CustomerOption {
  id: string;
  displayName: string;
  billingAddress?: {
    line1?: string;
    city?: string;
    country?: string;
  } | null;
  email?: string | null;
  vatId?: string | null;
}

interface CustomerSelectionProps {
  additionalOptions?: CustomerOption[];
}

export function CustomerSelection({ additionalOptions = [] }: CustomerSelectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<InvoiceFormData>();

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: workspaceQueryKeys.customers.list(),
    queryFn: () => customersApi.listCustomers(),
  });

  const customers = React.useMemo(() => {
    const list = customersData?.customers ?? [];
    const combined = [...additionalOptions, ...list];
    // Deduplicate by ID
    const unique = new Map<string, CustomerOption>();
    combined.forEach((c) => {
      // Map properties to ensure compatibility if types slightly differ
      unique.set(c.id, {
        id: c.id,
        displayName: c.displayName,
        billingAddress: c.billingAddress,
        email: c.email,
        vatId: c.vatId,
      });
    });
    return Array.from(unique.values());
  }, [customersData, additionalOptions]);

  const customerForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: getDefaultCustomerFormValues(),
  });

  useEffect(() => {
    if (!newCustomerDialogOpen) {
      customerForm.reset(getDefaultCustomerFormValues());
    }
  }, [customerForm, newCustomerDialogOpen]);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const input = toCreateCustomerInput(data);
      return customersApi.createCustomer(input);
    },
    onSuccess: (customer) => {
      if (customer?.id) {
        void queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.customers.all() });
        setValue("customerPartyId", customer.id, { shouldValidate: true, shouldDirty: true });
        toast.success(t("common.success"));
        setNewCustomerDialogOpen(false);
        setCustomerDialogOpen(false);
      } else {
        toast.error(t("common.error"));
      }
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
      toast.error(t("common.error"));
    },
  });

  const selectedCustomerId = watch("customerPartyId");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerAddress = [
    selectedCustomer?.billingAddress?.line1,
    selectedCustomer?.billingAddress?.city,
    selectedCustomer?.billingAddress?.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground uppercase">
            {t("invoices.billedTo")}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => {
              setCustomerDialogOpen(false);
              setNewCustomerDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("customers.addCustomer")}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-left"
          onClick={() => setCustomerDialogOpen(true)}
          data-testid="invoice-customer-select"
        >
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {selectedCustomer ? selectedCustomer.displayName : t("customers.selectCustomer")}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedCustomerAddress || selectedCustomer?.email || t("customers.searchOrAdd")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{t("common.search")}</span>
        </Button>
        {errors.customerPartyId && (
          <p className="text-sm text-destructive">{errors.customerPartyId.message}</p>
        )}
      </div>

      {selectedCustomer && (
        <div className="space-y-1 rounded-md border border-dashed border-border p-3">
          <div className="text-lg font-semibold">{selectedCustomer.displayName}</div>
          {selectedCustomerAddress && (
            <div className="text-sm text-muted-foreground">{selectedCustomerAddress}</div>
          )}
          {selectedCustomer.email && (
            <div className="text-sm text-muted-foreground">{selectedCustomer.email}</div>
          )}
          {selectedCustomer.vatId && (
            <div className="text-sm text-muted-foreground">
              {t("customers.vatLabel", { vatId: selectedCustomer.vatId })}
            </div>
          )}
        </div>
      )}

      {/* Select Customer Dialog */}
      <CommandDialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t("customers.wizard.selectCustomer")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-base font-semibold">{t("customers.wizard.selectCustomer")}</div>
            <p className="text-sm text-muted-foreground">{t("customers.selectExisting")}</p>
          </div>
        </div>
        <CommandInput placeholder={t("customers.searchCustomers")} />
        <CommandList>
          <CommandEmpty>{t("customers.noCustomersFound")}</CommandEmpty>
          <CommandGroup heading={t("customers.title")}>
            {customers.map((customer) => {
              const address = [
                customer.billingAddress?.line1,
                customer.billingAddress?.city,
                customer.billingAddress?.country,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  data-testid={`invoice-customer-option-${customer.id}`}
                  onSelect={() => {
                    setValue("customerPartyId", customer.id, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setCustomerDialogOpen(false);
                  }}
                >
                  <div className="flex flex-col gap-1 py-1">
                    <span className="font-medium">{customer.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {address || customer.email || "No contact details"}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <div className="flex justify-end border-t px-4 py-3">
          <Button
            type="button"
            size="sm"
            variant="accent"
            className="gap-2"
            onClick={() => {
              setCustomerDialogOpen(false);
              setNewCustomerDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("customers.addNewCustomer")}
          </Button>
        </div>
      </CommandDialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle>{t("customers.addNewClient")}</DialogTitle>
            <DialogDescription>{t("customers.createDescription")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={customerForm.handleSubmit((data) => createCustomerMutation.mutate(data))}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">
                  {t("customers.displayName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  {...customerForm.register("displayName")}
                  placeholder={t("customers.placeholders.displayName")}
                  data-testid="customer-displayName-input"
                />
                {customerForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive mt-1">
                    {customerForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{t("customers.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...customerForm.register("email")}
                    placeholder={t("customers.placeholders.email")}
                    data-testid="customer-email-input"
                  />
                  {customerForm.formState.errors.email && (
                    <p className="text-sm text-destructive mt-1">
                      {customerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vatId">{t("customers.vatId")}</Label>
                  <Input
                    id="vatId"
                    {...customerForm.register("vatId")}
                    placeholder={t("customers.placeholders.vatId")}
                    data-testid="customer-vatId-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.line1">{t("customers.addressLine1")}</Label>
                  <Input
                    id="billingAddress.line1"
                    {...customerForm.register("billingAddress.line1")}
                    placeholder={t("customers.placeholders.addressLine1")}
                    data-testid="customer-address-line1-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.line2">{t("customers.addressLine2")}</Label>
                  <Input
                    id="billingAddress.line2"
                    {...customerForm.register("billingAddress.line2")}
                    placeholder={t("customers.placeholders.addressLine2")}
                    data-testid="customer-address-line2-input"
                  />
                </div>
                <div>
                  <Label htmlFor="billingAddress.city">{t("customers.city")}</Label>
                  <Input
                    id="billingAddress.city"
                    {...customerForm.register("billingAddress.city")}
                    placeholder={t("customers.placeholders.city")}
                    data-testid="customer-address-city-input"
                  />
                </div>
                <div>
                  <Label htmlFor="billingAddress.postalCode">{t("customers.postalCode")}</Label>
                  <Input
                    id="billingAddress.postalCode"
                    {...customerForm.register("billingAddress.postalCode")}
                    placeholder={t("customers.placeholders.postalCode")}
                    data-testid="customer-address-postalCode-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress.country">{t("customers.country")}</Label>
                  <Input
                    id="billingAddress.country"
                    {...customerForm.register("billingAddress.country")}
                    placeholder={t("customers.placeholders.country")}
                    data-testid="customer-address-country-input"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewCustomerDialogOpen(false)}
                disabled={createCustomerMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? t("invoices.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
