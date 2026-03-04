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
  MAX_PROFESSION_LENGTH,
  RELIGION_OPTIONS,
  RequiredHint,
  SegmentedControl,
  sanitizeNumeric,
  sanitizeTaxId,
} from "./income-tax-return-shared";
import type {
  DeclarationType,
  Gender,
  HomeAddressChoice,
  ReligionValue,
} from "./income-tax-return-shared";

export const IncomeTaxReturnPersonalDetailsStep = () => {
  const [civilStatus, setCivilStatus] = React.useState("married");
  const [marriedSinceDay, setMarriedSinceDay] = React.useState("9");
  const [marriedSinceMonth, setMarriedSinceMonth] = React.useState("9");
  const [marriedSinceYear, setMarriedSinceYear] = React.useState("2010");
  const [declarationType, setDeclarationType] = React.useState<DeclarationType>("joint");
  const [jointTaxStateRegister, setJointTaxStateRegister] = React.useState("");
  const [jointTaxNumber, setJointTaxNumber] = React.useState("");

  const [gender, setGender] = React.useState<Gender>("female");
  const [firstName, setFirstName] = React.useState("Manh Ha");
  const [lastName, setLastName] = React.useState("Doan");
  const [professionInGerman, setProfessionInGerman] = React.useState("Softwareentwicklung");
  const [birthDay, setBirthDay] = React.useState("23");
  const [birthMonth, setBirthMonth] = React.useState("8");
  const [birthYear, setBirthYear] = React.useState("1986");
  const [street, setStreet] = React.useState("Wolfsberger Str.");
  const [houseNumber, setHouseNumber] = React.useState("11");
  const [apartmentNumber, setApartmentNumber] = React.useState("6");
  const [additionalInfo, setAdditionalInfo] = React.useState("Mustermann o");
  const [city, setCity] = React.useState("Berlin");
  const [zipCode, setZipCode] = React.useState("12623");
  const [personalTaxId, setPersonalTaxId] = React.useState("12 345 678 901");
  const [religion, setReligion] = React.useState<ReligionValue>("not-subject-church-tax");

  const [spouseGender, setSpouseGender] = React.useState<Gender | "">("");
  const [spouseFirstName, setSpouseFirstName] = React.useState("");
  const [spouseLastName, setSpouseLastName] = React.useState("");
  const [spouseProfessionInGerman, setSpouseProfessionInGerman] = React.useState("");
  const [spouseBirthDay, setSpouseBirthDay] = React.useState("");
  const [spouseBirthMonth, setSpouseBirthMonth] = React.useState("");
  const [spouseBirthYear, setSpouseBirthYear] = React.useState("");
  const [spouseDifferentHomeAddress, setSpouseDifferentHomeAddress] = React.useState<
    HomeAddressChoice | ""
  >("");
  const [spousePersonalTaxId, setSpousePersonalTaxId] = React.useState("");
  const [spouseReligion, setSpouseReligion] = React.useState<ReligionValue | "">("");

  const isJointTaxNumberMissing =
    declarationType === "joint" && (!jointTaxStateRegister || jointTaxNumber.trim().length === 0);
  const isSpouseGenderMissing = spouseGender === "";
  const isSpouseFirstNameMissing = spouseFirstName.trim().length === 0;
  const isSpouseLastNameMissing = spouseLastName.trim().length === 0;
  const isSpouseProfessionMissing = spouseProfessionInGerman.trim().length === 0;
  const isSpouseBirthDateMissing = !spouseBirthDay || !spouseBirthMonth || !spouseBirthYear;
  const isSpouseDifferentAddressMissing = spouseDifferentHomeAddress === "";
  const isSpouseReligionMissing = spouseReligion === "";

  return (
    <>
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

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-h3 text-foreground">Personal details</h2>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Gender</Label>
            <SegmentedControl
              ariaLabel="Primary gender"
              value={gender}
              onChange={(next) => setGender(next as Gender)}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-name" className="text-sm font-medium text-foreground">
              First name
            </Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name" className="text-sm font-medium text-foreground">
              Last name
            </Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profession-in-german" className="text-sm font-medium text-foreground">
                Current profession in German
              </Label>
              <span className="text-xs text-muted-foreground">
                {professionInGerman.length}/{MAX_PROFESSION_LENGTH}
              </span>
            </div>
            <Input
              id="profession-in-german"
              value={professionInGerman}
              onChange={(event) =>
                setProfessionInGerman(event.target.value.slice(0, MAX_PROFESSION_LENGTH))
              }
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">Your current profession in German</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Birth date</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[92px_92px_1fr]">
              <div className="space-y-1">
                <Label htmlFor="birth-day" className="text-xs text-muted-foreground">
                  Day
                </Label>
                <Input
                  id="birth-day"
                  inputMode="numeric"
                  value={birthDay}
                  onChange={(event) => setBirthDay(sanitizeNumeric(event.target.value, 2))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="birth-month" className="text-xs text-muted-foreground">
                  Month
                </Label>
                <Input
                  id="birth-month"
                  inputMode="numeric"
                  value={birthMonth}
                  onChange={(event) => setBirthMonth(sanitizeNumeric(event.target.value, 2))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="birth-year" className="text-xs text-muted-foreground">
                  Year
                </Label>
                <Input
                  id="birth-year"
                  inputMode="numeric"
                  value={birthYear}
                  onChange={(event) => setBirthYear(sanitizeNumeric(event.target.value, 4))}
                  className="h-10"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Home address</legend>
            <div className="space-y-1">
              <Label htmlFor="street" className="text-xs text-muted-foreground">
                Street
              </Label>
              <Input
                id="street"
                value={street}
                onChange={(event) => setStreet(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="house-number" className="text-xs text-muted-foreground">
                  House number
                </Label>
                <Input
                  id="house-number"
                  value={houseNumber}
                  onChange={(event) => setHouseNumber(event.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="apartment-number" className="text-xs text-muted-foreground">
                  Apartment number
                </Label>
                <Input
                  id="apartment-number"
                  value={apartmentNumber}
                  onChange={(event) => setApartmentNumber(event.target.value)}
                  placeholder="e.g. 6"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="additional-info" className="text-xs text-muted-foreground">
                  Additional info
                </Label>
                <Input
                  id="additional-info"
                  value={additionalInfo}
                  onChange={(event) => setAdditionalInfo(event.target.value)}
                  placeholder="e.g. Mustermann o"
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs text-muted-foreground">
                  City
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zip-code" className="text-xs text-muted-foreground">
                  Zip code
                </Label>
                <Input
                  id="zip-code"
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(event) => setZipCode(sanitizeNumeric(event.target.value, 5))}
                  className="h-10"
                />
              </div>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="personal-tax-id" className="text-sm font-medium text-foreground">
              Personal tax id (Optional)
            </Label>
            <Input
              id="personal-tax-id"
              value={personalTaxId}
              onChange={(event) => setPersonalTaxId(sanitizeTaxId(event.target.value))}
              placeholder="e.g. 12 345 678 901"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Your 11 digits personal tax id. Also known as Identifikationsnummer.
              <button type="button" className="ml-1 text-sky-600 hover:underline">
                Learn more
              </button>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="religion" className="text-sm font-medium text-foreground">
              Religion
            </Label>
            <Select value={religion} onValueChange={(next) => setReligion(next as ReligionValue)}>
              <SelectTrigger id="religion" className="h-10">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RELIGION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The religion you are registered with and pay church tax to.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-h3 text-foreground">Spouse personal details</h2>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Gender</Label>
            <SegmentedControl
              ariaLabel="Spouse gender"
              value={spouseGender}
              onChange={(next) => setSpouseGender(next as Gender)}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
            />
            <RequiredHint show={isSpouseGenderMissing} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse-first-name" className="text-sm font-medium text-foreground">
              First name
            </Label>
            <Input
              id="spouse-first-name"
              value={spouseFirstName}
              onChange={(event) => setSpouseFirstName(event.target.value)}
              placeholder="e.g. Max"
              className="h-10"
            />
            <RequiredHint show={isSpouseFirstNameMissing} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse-last-name" className="text-sm font-medium text-foreground">
              Last name
            </Label>
            <Input
              id="spouse-last-name"
              value={spouseLastName}
              onChange={(event) => setSpouseLastName(event.target.value)}
              placeholder="e.g. Mustermann"
              className="h-10"
            />
            <RequiredHint show={isSpouseLastNameMissing} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="spouse-profession-in-german"
                className="text-sm font-medium text-foreground"
              >
                Current profession in German
              </Label>
              <span className="text-xs text-muted-foreground">
                {spouseProfessionInGerman.length}/{MAX_PROFESSION_LENGTH}
              </span>
            </div>
            <Input
              id="spouse-profession-in-german"
              value={spouseProfessionInGerman}
              onChange={(event) =>
                setSpouseProfessionInGerman(event.target.value.slice(0, MAX_PROFESSION_LENGTH))
              }
              placeholder="e.g. Architekt"
              className="h-10"
            />
            <RequiredHint show={isSpouseProfessionMissing} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Birth date</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[92px_92px_1fr]">
              <div className="space-y-1">
                <Label htmlFor="spouse-birth-day" className="text-xs text-muted-foreground">
                  Day
                </Label>
                <Input
                  id="spouse-birth-day"
                  inputMode="numeric"
                  value={spouseBirthDay}
                  onChange={(event) => setSpouseBirthDay(sanitizeNumeric(event.target.value, 2))}
                  placeholder="e.g. 28"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="spouse-birth-month" className="text-xs text-muted-foreground">
                  Month
                </Label>
                <Input
                  id="spouse-birth-month"
                  inputMode="numeric"
                  value={spouseBirthMonth}
                  onChange={(event) => setSpouseBirthMonth(sanitizeNumeric(event.target.value, 2))}
                  placeholder="e.g. 2"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="spouse-birth-year" className="text-xs text-muted-foreground">
                  Year
                </Label>
                <Input
                  id="spouse-birth-year"
                  inputMode="numeric"
                  value={spouseBirthYear}
                  onChange={(event) => setSpouseBirthYear(sanitizeNumeric(event.target.value, 4))}
                  placeholder="e.g. 1990"
                  className="h-10"
                />
              </div>
            </div>
            <RequiredHint show={isSpouseBirthDateMissing} />
          </fieldset>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Spouse has a different home address?
            </Label>
            <SegmentedControl
              ariaLabel="Spouse different home address"
              value={spouseDifferentHomeAddress}
              onChange={(next) => setSpouseDifferentHomeAddress(next as HomeAddressChoice)}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
            <RequiredHint show={isSpouseDifferentAddressMissing} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse-personal-tax-id" className="text-sm font-medium text-foreground">
              Personal tax id (Optional)
            </Label>
            <Input
              id="spouse-personal-tax-id"
              value={spousePersonalTaxId}
              onChange={(event) => setSpousePersonalTaxId(sanitizeTaxId(event.target.value))}
              placeholder="e.g. 12 345 678 901"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Your 11 digits personal tax id. Also known as Identifikationsnummer.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse-religion" className="text-sm font-medium text-foreground">
              Religion
            </Label>
            <Select
              value={spouseReligion || undefined}
              onValueChange={(next) => setSpouseReligion(next as ReligionValue)}
            >
              <SelectTrigger id="spouse-religion" className="h-10">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RELIGION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The religion you are registered with and pay church tax to.
            </p>
            <RequiredHint show={isSpouseReligionMissing} />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
