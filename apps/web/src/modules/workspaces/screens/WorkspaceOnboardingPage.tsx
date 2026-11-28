import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { getReturnPath } from "@/app/router/return-path";
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorkspaceKindSchema, type WorkspaceKind } from "@corely/contracts";
import { Button } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { useToast } from "@corely/ui";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

const steps = ["Workspace", "Legal & Address", "Tax & Bank"];

export const WorkspaceOnboardingPage: React.FC = () => {
  const uiCopy = useUiCopy("ui.workspaces-workspaceonboardingpage");
  const navigate = useNavigate();
  const { state } = useLocation();
  const { setWorkspace, refresh } = useWorkspace();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalEntityKind, setLegalEntityKind] = useState<WorkspaceKind>("PERSONAL");
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    countryCode: "DE",
    currency: "EUR",
    address: {
      line1: "",
      city: "",
      postalCode: "",
      countryCode: "DE",
    },
    taxId: "",
    bankAccount: {
      iban: "",
      bic: "",
    },
  });

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.legalName.trim().length > 0 &&
      form.address.line1.trim().length > 0 &&
      form.address.city.trim().length > 0 &&
      form.address.postalCode.trim().length > 0
    );
  }, [form]);

  const canGoToNextStep = useMemo(() => {
    if (currentStep === 0) {
      return form.name.trim().length > 0;
    }
    if (currentStep === 1) {
      return (
        form.legalName.trim().length > 0 &&
        form.address.line1.trim().length > 0 &&
        form.address.city.trim().length > 0 &&
        form.address.postalCode.trim().length > 0
      );
    }
    return true;
  }, [currentStep, form]);

  const goNext = () => {
    if (!canGoToNextStep) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: "Missing fields", description: "Please complete the required fields." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        kind: legalEntityKind,
        legalName: form.legalName.trim(),
        countryCode: form.countryCode,
        currency: form.currency,
        address: {
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          postalCode: form.address.postalCode.trim(),
          countryCode: form.address.countryCode,
        },
        taxId: form.taxId || undefined,
        bankAccount:
          form.bankAccount.iban || form.bankAccount.bic
            ? {
                iban: form.bankAccount.iban || undefined,
                bic: form.bankAccount.bic || undefined,
              }
            : undefined,
      };
      const result = await workspacesApi.createWorkspace(payload);
      const createdId = result.workspace.id;
      setWorkspace(createdId);
      await refresh();
      toast({ title: "Workspace created", description: `${result.workspace.name} is now active.` });
      navigate(getReturnPath(state, "/dashboard"), { replace: true });
    } catch (error) {
      toast({
        title: "Workspace creation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{uiCopy("create-your-workspace")}</h1>
          <p className="text-muted-foreground">{t("workspace.setupDescription")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex gap-2">
                {steps.map((label, idx) => (
                  <span
                    key={label}
                    className={`h-2 w-16 rounded-full ${
                      idx <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </span>
              <span className="text-base text-muted-foreground">{steps[currentStep]}</span>
            </CardTitle>
            <CardDescription>{uiCopy("tell-us-about-your")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {uiCopy("workspace-name") + " "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={uiCopy("e-g-corely-gmbh")}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    data-testid="onboarding-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("display-currency")}</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                    }
                    data-testid="onboarding-currency"
                    placeholder="EUR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("country")}</Label>
                  <Input
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
                    }
                    data-testid="onboarding-country"
                    placeholder="DE"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="onboarding-entity-type">{t("workspace.legalEntityType")}</Label>
                  <Select
                    value={legalEntityKind}
                    onValueChange={(value) => setLegalEntityKind(WorkspaceKindSchema.parse(value))}
                  >
                    <SelectTrigger
                      id="onboarding-entity-type"
                      aria-describedby="onboarding-entity-type-help"
                      data-testid="onboarding-kind"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONAL">{t("workspace.legalEntityPersonal")}</SelectItem>
                      <SelectItem value="COMPANY">{t("workspace.legalEntityCompany")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p id="onboarding-entity-type-help" className="text-sm text-muted-foreground">
                    {t("workspace.legalEntityHelp")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>
                    {uiCopy("legal-name") + " "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.legalName}
                    onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                    data-testid="onboarding-legal-name"
                    placeholder={uiCopy("registered-legal-entity")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("tax-id-vat")}</Label>
                  <Input
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    placeholder={uiCopy("optional")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    {uiCopy("address-line") + " "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.line1}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: { ...f.address, line1: e.target.value } }))
                    }
                    data-testid="onboarding-address-line1"
                    placeholder={uiCopy("street-and-number")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {uiCopy("city") + " "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))
                    }
                    data-testid="onboarding-city"
                    placeholder={uiCopy("city")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {uiCopy("postal-code") + " "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.postalCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        address: { ...f.address, postalCode: e.target.value },
                      }))
                    }
                    data-testid="onboarding-postal"
                    placeholder={uiCopy("postal-code")}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={form.bankAccount.iban}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bankAccount: { ...f.bankAccount, iban: e.target.value },
                      }))
                    }
                    data-testid="onboarding-iban"
                    placeholder={uiCopy("optional")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={form.bankAccount.bic}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bankAccount: { ...f.bankAccount, bic: e.target.value },
                      }))
                    }
                    data-testid="onboarding-bic"
                    placeholder={uiCopy("optional")}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={currentStep === 0 || isSubmitting}
                data-testid="onboarding-back"
              >
                {uiCopy("back")}
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={goNext}
                  disabled={!canGoToNextStep || isSubmitting}
                  data-testid="onboarding-next"
                >
                  {uiCopy("continue") + " "}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  data-testid="onboarding-submit"
                >
                  {uiCopy("finish") + " "}
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
