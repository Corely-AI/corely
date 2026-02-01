import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Switch } from "../../../shared/ui/switch";
import { Textarea } from "../../../shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/ui/select";
import { taxApi } from "../../../lib/tax-api";
import {
  taxProfileFormSchema,
  toUpsertTaxProfileInput,
  getDefaultTaxProfileFormValues,
  taxProfileDtoToFormData,
  type TaxProfileFormData,
} from "../schemas/tax-profile-form.schema";
import {
  taxConsultantFormSchema,
  toUpsertTaxConsultantInput,
  type TaxConsultantFormData,
} from "../schemas/tax-consultant-form.schema";

export default function TaxSettingsPage() {
  const queryClient = useQueryClient();

  // Load tax profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => taxApi.getProfile(),
  });

  const { data: consultantData, isLoading: isLoadingConsultant } = useQuery({
    queryKey: ["tax-consultant"],
    queryFn: () => taxApi.getConsultant(),
  });

  // Form setup
  const form = useForm<TaxProfileFormData>({
    resolver: zodResolver(taxProfileFormSchema),
    defaultValues: profile ? taxProfileDtoToFormData(profile) : getDefaultTaxProfileFormValues(),
  });

  const consultantForm = useForm<TaxConsultantFormData>({
    resolver: zodResolver(taxConsultantFormSchema),
    defaultValues: consultantData?.consultant ?? { name: "", email: "", phone: "", notes: "" },
  });

  // Reset form when profile loads
  React.useEffect(() => {
    if (profile) {
      form.reset(taxProfileDtoToFormData(profile));
    }
  }, [profile, form]);

  React.useEffect(() => {
    if (consultantData?.consultant) {
      consultantForm.reset({
        name: consultantData.consultant.name,
        email: consultantData.consultant.email ?? "",
        phone: consultantData.consultant.phone ?? "",
        notes: consultantData.consultant.notes ?? "",
      });
    }
  }, [consultantData, consultantForm]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TaxProfileFormData) => {
      const input = toUpsertTaxProfileInput(data);
      return taxApi.upsertProfile(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tax-profile"] });
      toast.success("Tax profile saved successfully");
    },
    onError: (error) => {
      console.error("Error saving tax profile:", error);
      toast.error("Failed to save tax profile");
    },
  });

  const onSubmit = (data: TaxProfileFormData) => {
    saveMutation.mutate(data);
  };

  const saveConsultant = useMutation({
    mutationFn: async (data: TaxConsultantFormData) => {
      const input = toUpsertTaxConsultantInput(data);
      return taxApi.upsertConsultant(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tax-consultant"] });
      toast.success("Consultant saved");
    },
    onError: () => {
      toast.error("Failed to save consultant");
    },
  });

  const regimeOptions = [
    { value: "SMALL_BUSINESS", label: "Small Business (Kleinunternehmer §19 UStG)" },
    { value: "STANDARD_VAT", label: "Standard VAT" },
    { value: "VAT_EXEMPT", label: "I am VAT exempt according to §4 Tax Act" },
  ];

  const exemptionParagraphs = [
    { value: "4.1", label: "§ 4 Nr. 1 - Export deliveries" },
    { value: "4.2", label: "§ 4 Nr. 2 - Intra-community deliveries" },
    { value: "4.8", label: "§ 4 Nr. 8 - Financial services" },
    { value: "4.11", label: "§ 4 Nr. 11 - Insurance services" },
    { value: "4.12", label: "§ 4 Nr. 12 - Letting and leasing" },
    { value: "4.14", label: "§ 4 Nr. 14 - Medical services" },
    { value: "4.21", label: "§ 4 Nr. 21 - Educational services" },
  ];

  const selectedRegime = form.watch("regime");
  const isVatExempt = selectedRegime === "VAT_EXEMPT";

  const countryOptions = [{ value: "DE", label: "Germany (DE)" }];

  const filingOptions = [
    { value: "MONTHLY", label: "Monthly" },
    { value: "QUARTERLY", label: "Quarterly" },
    { value: "YEARLY", label: "Yearly" },
  ];

  if (isLoading || isLoadingConsultant) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-muted-foreground">Loading tax settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tax Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your tax profile and VAT settings</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Tax Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-foreground">VAT enabled</p>
                <p className="text-sm text-muted-foreground">
                  Toggle if you are registered and required to file VAT.
                </p>
              </div>
              <Controller
                control={form.control}
                name="vatEnabled"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Controller
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "DE"}
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? "DE"}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Currently only Germany is supported
                </p>
              </div>

              <div>
                <Label htmlFor="regime">Tax Regime</Label>
                <Controller
                  control={form.control}
                  name="regime"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax regime" />
                      </SelectTrigger>
                      <SelectContent>
                        {regimeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.regime && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.regime.message}
                  </p>
                )}
              </div>
            </div>

            {isVatExempt && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <Label htmlFor="vatExemptionParagraph">VAT Exemption paragraph</Label>
                <div className="mt-2">
                  <Controller
                    control={form.control}
                    name="vatExemptionParagraph"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select exemption paragraph" />
                        </SelectTrigger>
                        <SelectContent>
                          {exemptionParagraphs.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Please select the paragraph of the German Tax Act (§4 UStG) that applies to your
                    business.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="usesTaxAdvisor" className="base">
                  I use a tax advisor (Steuerberater)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Checking this extends your annual tax filing deadline to February 28th of the
                  second following year.
                </p>
              </div>
              <Controller
                control={form.control}
                name="usesTaxAdvisor"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vatId">VAT ID (optional)</Label>
                <Input id="vatId" {...form.register("vatId")} placeholder="DE123456789" />
                {form.formState.errors.vatId && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.vatId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="filingFrequency">Filing Frequency</Label>
                <Controller
                  control={form.control}
                  name="filingFrequency"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select filing frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {filingOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="vatAccountingMethod">VAT Accounting Method</Label>
                <Controller
                  control={form.control}
                  name="vatAccountingMethod"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IST">Cash Basis (Ist-Versteuerung)</SelectItem>
                        <SelectItem value="SOLL">Accrual Basis (Soll-Versteuerung)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cash Basis: You owe VAT when payment is received.
                  <br />
                  Accrual Basis: You owe VAT when invoice is issued.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxYearStartMonth">Tax year start month</Label>
                <Controller
                  control={form.control}
                  name="taxYearStartMonth"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>
                            {new Date(0, idx).toLocaleString("en", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="localTaxOfficeName">Local tax office</Label>
                <Input
                  id="localTaxOfficeName"
                  placeholder="Finanzamt Berlin"
                  {...form.register("localTaxOfficeName")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={saveMutation.isPending}
              >
                Reset
              </Button>
              <Button type="submit" variant="default" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Tax Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Tax Consultant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={consultantForm.handleSubmit((data) => saveConsultant.mutate(data))}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="consultantName">Name</Label>
                <Input id="consultantName" {...consultantForm.register("name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="consultantEmail">Email</Label>
                <Input id="consultantEmail" {...consultantForm.register("email")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="consultantPhone">Phone</Label>
                <Input id="consultantPhone" {...consultantForm.register("phone")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="consultantNotes">Notes</Label>
                <Textarea id="consultantNotes" {...consultantForm.register("notes")} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={saveConsultant.isPending}>
                {saveConsultant.isPending ? "Saving..." : "Save consultant"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
