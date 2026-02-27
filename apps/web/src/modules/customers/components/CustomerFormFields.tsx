import type { ReactNode } from "react";
import { Controller, useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { Button, Input, Label, Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";

import type { CustomerFormData } from "../schemas/customer-form.schema";

interface CustomerFormFieldsProps {
  form: UseFormReturn<CustomerFormData>;
  className?: string;
  afterDisplayName?: ReactNode;
}

export function CustomerFormFields({ form, className, afterDisplayName }: CustomerFormFieldsProps) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socialLinks",
  });

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("customers.basicInformation")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="displayName">
              {t("customers.displayName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              {...form.register("displayName")}
              placeholder={t("customers.placeholders.displayName")}
              data-testid="customer-displayName-input"
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.displayName.message}
              </p>
            )}
          </div>

          {afterDisplayName ? <div className="md:col-span-2">{afterDisplayName}</div> : null}

          <div>
            <Label htmlFor="email">{t("customers.email")}</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder={t("customers.placeholders.email")}
              data-testid="customer-email-input"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">{t("customers.phone")}</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder={t("customers.placeholders.phone")}
              data-testid="customer-phone-input"
            />
          </div>

          <div>
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              {...form.register("birthday")}
              data-testid="customer-birthday-input"
            />
          </div>

          <div>
            <Label htmlFor="vatId">{t("customers.vatId")}</Label>
            <Input
              id="vatId"
              {...form.register("vatId")}
              placeholder={t("customers.placeholders.vatId")}
              data-testid="customer-vatId-input"
            />
          </div>

          <div>
            <Label htmlFor="lifecycleStatus">
              {t("common.status")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="lifecycleStatus"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <SelectTrigger id="lifecycleStatus" data-testid="customer-status-select">
                    <SelectValue placeholder={t("customers.placeholders.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">{t("common.lead")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("common.active")}</SelectItem>
                    <SelectItem value="PAUSED">{t("common.paused")}</SelectItem>
                    <SelectItem value="ARCHIVED">{t("common.archived")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("customers.billingAddress")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.line1">{t("customers.addressLine1")}</Label>
            <Input
              id="billingAddress.line1"
              {...form.register("billingAddress.line1")}
              placeholder={t("customers.placeholders.addressLine1")}
              data-testid="customer-address-line1-input"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.line2">{t("customers.addressLine2")}</Label>
            <Input
              id="billingAddress.line2"
              {...form.register("billingAddress.line2")}
              placeholder={t("customers.placeholders.addressLine2")}
              data-testid="customer-address-line2-input"
            />
          </div>

          <div>
            <Label htmlFor="billingAddress.city">{t("customers.city")}</Label>
            <Input
              id="billingAddress.city"
              {...form.register("billingAddress.city")}
              placeholder={t("customers.placeholders.city")}
              data-testid="customer-address-city-input"
            />
          </div>

          <div>
            <Label htmlFor="billingAddress.postalCode">{t("customers.postalCode")}</Label>
            <Input
              id="billingAddress.postalCode"
              {...form.register("billingAddress.postalCode")}
              placeholder={t("customers.placeholders.postalCode")}
              data-testid="customer-address-postalCode-input"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="billingAddress.country">{t("customers.country")}</Label>
            <Input
              id="billingAddress.country"
              {...form.register("billingAddress.country")}
              placeholder={t("customers.placeholders.country")}
              data-testid="customer-address-country-input"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">{t("customers.notes")}</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          placeholder={t("customers.placeholders.notes")}
          rows={4}
          data-testid="customer-notes-input"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("customers.social.title")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ platform: "linkedin", url: "", label: "", isPrimary: false })}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("customers.social.add")}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("customers.social.empty")}</div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded-md border border-border/70 dark:border-border/40 p-3"
              >
                <div className="md:col-span-3">
                  <Label>Platform</Label>
                  <Controller
                    control={form.control}
                    name={`socialLinks.${index}.platform`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="x">X</SelectItem>
                          <SelectItem value="github">GitHub</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="md:col-span-5">
                  <Label>URL</Label>
                  <Input {...form.register(`socialLinks.${index}.url`)} placeholder="https://..." />
                </div>
                <div className="md:col-span-3">
                  <Label>Label</Label>
                  <Input
                    {...form.register(`socialLinks.${index}.label`)}
                    placeholder="Public profile"
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerFormFields;
