import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@corely/ui";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  GERMAN_STATE_OPTIONS,
  RequiredHint,
  SegmentedControl,
  sanitizeNumeric,
} from "./income-tax-return-shared";
import type { DeclarationType } from "./income-tax-return-shared";

export const IncomeTaxReturnCivilStatusCard = () => {
  const uiCopy = useUiCopy("ui.tax-income-tax-return-civil-status-card");
  const [civilStatus, setCivilStatus] = React.useState("married");
  const [marriedSince, setMarriedSince] = React.useState<Date | undefined>(new Date(2010, 8, 9));
  const [declarationType, setDeclarationType] = React.useState<DeclarationType>("joint");
  const [jointTaxStateRegister, setJointTaxStateRegister] = React.useState("");
  const [jointTaxNumber, setJointTaxNumber] = React.useState("");

  const isJointTaxNumberMissing =
    declarationType === "joint" && (!jointTaxStateRegister || jointTaxNumber.trim().length === 0);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <h2 className="text-h3 text-foreground">{uiCopy("civil-status")}</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="civil-status" className="text-sm font-medium text-foreground">
              {uiCopy("what-is-your-civil")}
            </Label>
            <Select value={civilStatus} onValueChange={setCivilStatus}>
              <SelectTrigger id="civil-status" className="h-10">
                <SelectValue placeholder={uiCopy("select-a-status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{uiCopy("single")}</SelectItem>
                <SelectItem value="married">{uiCopy("married")}</SelectItem>
                <SelectItem value="divorced">{uiCopy("divorced")}</SelectItem>
                <SelectItem value="widowed">{uiCopy("widowed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {civilStatus === "married" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {uiCopy("married-since")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-start text-left font-normal",
                      !marriedSince && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {marriedSince ? (
                      marriedSince.toLocaleDateString("de-DE")
                    ) : (
                      <span>{uiCopy("select-date")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={marriedSince} onSelect={setMarriedSince} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-body text-foreground">{uiCopy("would-you-like-to")}</p>
          <SegmentedControl
            ariaLabel="Declaration type"
            value={declarationType}
            onChange={(next) => setDeclarationType(next as DeclarationType)}
            options={[
              { value: "joint", label: "Joint declaration" },
              { value: "individual", label: "Individual declaration" },
            ]}
          />
          <p className="text-sm text-muted-foreground">{uiCopy("joint-declaration-is-only")}</p>
        </div>

        {declarationType === "joint" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">{uiCopy("tax-number-for-joint")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="joint-tax-state" className="text-xs text-muted-foreground">
                  {uiCopy("state-register-id")}
                </Label>
                <Select value={jointTaxStateRegister} onValueChange={setJointTaxStateRegister}>
                  <SelectTrigger id="joint-tax-state" className="h-10">
                    <SelectValue placeholder={uiCopy("select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {GERMAN_STATE_OPTIONS.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="joint-tax-number" className="text-xs text-muted-foreground">
                  {uiCopy("tax-number")}
                </Label>
                <Input
                  id="joint-tax-number"
                  value={jointTaxNumber}
                  onChange={(event) => setJointTaxNumber(event.target.value)}
                  placeholder={uiCopy("e-g-12-345")}
                  className="h-10"
                />
              </div>
            </div>
            <RequiredHint show={isJointTaxNumberMissing} />
            <p className="text-xs text-muted-foreground">{uiCopy("as-a-couple-provide")}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
