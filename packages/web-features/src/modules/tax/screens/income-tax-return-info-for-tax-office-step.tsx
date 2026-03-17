import React from "react";
import type { BankAccountOwner, TaxOfficeInfoSectionPayload } from "@corely/contracts";
import { AlertCircle } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { RequiredHint, SegmentedControl } from "./income-tax-return-shared";

type IncomeTaxReturnInfoForTaxOfficeStepProps = {
  value: TaxOfficeInfoSectionPayload;
  onChange: (next: TaxOfficeInfoSectionPayload) => void;
  onNext?: () => void;
};

const MAX_ADDITIONAL_INFO_LENGTH = 999;

export const IncomeTaxReturnInfoForTaxOfficeStep = ({
  value,
  onChange,
  onNext,
}: IncomeTaxReturnInfoForTaxOfficeStepProps) => {
  const update = (patch: Partial<TaxOfficeInfoSectionPayload>) => onChange({ ...value, ...patch });
  const iban = value.iban;
  const bankAccountOwner = value.bankAccountOwner as BankAccountOwner;
  const additionalInformation = value.additionalInformation;

  const sanitizedIban = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .slice(0, 34);

  const isIbanMissing = iban.trim().length === 0;

  return (
    <div className="space-y-6">
      {isIbanMissing ? (
        <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>Required details are missing on this page</p>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <h2 className="text-h3 text-foreground">Bank account</h2>
            <p className="max-w-3xl text-body text-muted-foreground">
              Used by the Finanzamt for tax refunds. Your details won&apos;t be shared with anyone
              but the Finanzamt.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-iban" className="text-sm font-medium text-foreground">
              IBAN
            </Label>
            <Input
              id="refund-iban"
              value={iban}
              onChange={(event) => update({ iban: sanitizedIban(event.target.value) })}
              className="h-10"
            />
            <RequiredHint show={isIbanMissing} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Bank account belongs to</Label>
            <SegmentedControl
              ariaLabel="Bank account belongs to"
              value={bankAccountOwner}
              onChange={(next) => update({ bankAccountOwner: next as BankAccountOwner })}
              options={[
                { value: "you", label: "You" },
                { value: "spouse", label: "Your spouse" },
                { value: "both", label: "Both" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <h2 className="text-h3 text-foreground">Additional information</h2>
            <p className="max-w-3xl text-body text-muted-foreground">
              Further information or issues to be considered which have not been already included
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="tax-office-additional-information"
                className="text-sm font-medium text-foreground"
              >
                Further data to your tax declaration (Optional)
              </Label>
              <span className="text-xs text-muted-foreground">
                {additionalInformation.length}/{MAX_ADDITIONAL_INFO_LENGTH}
              </span>
            </div>
            <Textarea
              id="tax-office-additional-information"
              value={additionalInformation}
              onChange={(event) =>
                update({
                  additionalInformation: event.target.value.slice(0, MAX_ADDITIONAL_INFO_LENGTH),
                })
              }
              className="min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {onNext ? (
        <div className="flex justify-end">
          <Button type="button" onClick={onNext} className="rounded-full px-8">
            Next: Paid add ons
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default IncomeTaxReturnInfoForTaxOfficeStep;
