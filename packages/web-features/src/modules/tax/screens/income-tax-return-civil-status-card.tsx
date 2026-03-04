import React from "react";
import {
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import {
  DeclarationType,
  RequiredHint,
  SegmentedControl,
  sanitizeNumeric,
} from "./income-tax-return-shared";

export const IncomeTaxReturnCivilStatusCard = () => {
  const [civilStatus, setCivilStatus] = React.useState("married");
  const [marriedSinceDay, setMarriedSinceDay] = React.useState("9");
  const [marriedSinceMonth, setMarriedSinceMonth] = React.useState("9");
  const [marriedSinceYear, setMarriedSinceYear] = React.useState("2010");
  const [declarationType, setDeclarationType] = React.useState<DeclarationType>("joint");
  const [jointTaxStateRegister, setJointTaxStateRegister] = React.useState("");
  const [jointTaxNumber, setJointTaxNumber] = React.useState("");

  const isJointTaxNumberMissing =
    declarationType === "joint" && (!jointTaxStateRegister || jointTaxNumber.trim().length === 0);

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <h2 className="text-h3 text-foreground">Civil status</h2>

        <div className="space-y-2">
          <Label htmlFor="civil-status" className="text-sm font-medium text-foreground">
            What is your civil status?
          </Label>
          <Select value={civilStatus} onValueChange={setCivilStatus}>
            <SelectTrigger id="civil-status" className="h-10">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married</SelectItem>
              <SelectItem value="divorced">Divorced</SelectItem>
              <SelectItem value="widowed">Widowed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-foreground">Married since</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_120px_1fr]">
            <div className="space-y-2">
              <Label
                htmlFor="married-since-day"
                className="text-sm font-medium text-muted-foreground"
              >
                Day
              </Label>
              <Input
                id="married-since-day"
                inputMode="numeric"
                value={marriedSinceDay}
                onChange={(event) => setMarriedSinceDay(sanitizeNumeric(event.target.value, 2))}
                placeholder="DD"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="married-since-month"
                className="text-sm font-medium text-muted-foreground"
              >
                Month
              </Label>
              <Input
                id="married-since-month"
                inputMode="numeric"
                value={marriedSinceMonth}
                onChange={(event) => setMarriedSinceMonth(sanitizeNumeric(event.target.value, 2))}
                placeholder="MM"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="married-since-year"
                className="text-sm font-medium text-muted-foreground"
              >
                Year
              </Label>
              <Input
                id="married-since-year"
                inputMode="numeric"
                value={marriedSinceYear}
                onChange={(event) => setMarriedSinceYear(sanitizeNumeric(event.target.value, 4))}
                placeholder="YYYY"
                className="h-10"
              />
            </div>
          </div>
        </fieldset>

        <div className="space-y-3">
          <p className="text-body text-foreground">
            Would you like to submit a joint declaration together with your spouse in 2025?
          </p>
          <SegmentedControl
            ariaLabel="Declaration type"
            value={declarationType}
            onChange={(next) => setDeclarationType(next as DeclarationType)}
            options={[
              { value: "joint", label: "Joint declaration" },
              { value: "individual", label: "Individual declaration" },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Joint declaration is only possible if you lived together for most of 2025
          </p>
        </div>

        {declarationType === "joint" ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              Tax number for joint income tax declaration
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="joint-tax-state" className="text-xs text-muted-foreground">
                  State register id
                </Label>
                <Select value={jointTaxStateRegister} onValueChange={setJointTaxStateRegister}>
                  <SelectTrigger id="joint-tax-state" className="h-10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="berlin">Berlin</SelectItem>
                    <SelectItem value="bayern">Bavaria</SelectItem>
                    <SelectItem value="hamburg">Hamburg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="joint-tax-number" className="text-xs text-muted-foreground">
                  Tax number
                </Label>
                <Input
                  id="joint-tax-number"
                  value={jointTaxNumber}
                  onChange={(event) => setJointTaxNumber(event.target.value)}
                  placeholder="e.g. 12/345/67890"
                  className="h-10"
                />
              </div>
            </div>
            <RequiredHint show={isJointTaxNumberMissing} />
            <p className="text-xs text-muted-foreground">
              As a couple, provide both tax numbers, one for your freelance work and one for your
              joint income tax declaration.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
