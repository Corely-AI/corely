import React from "react";
import type { PersonalDetailsSectionPayload } from "@corely/contracts";
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
  MAX_PROFESSION_LENGTH,
  ReligionSelect,
  RequiredHint,
  SegmentedControl,
  sanitizeTaxId,
} from "./income-tax-return-shared";
import type {
  DeclarationType,
  Gender,
  HomeAddressChoice,
  ReligionValue,
} from "./income-tax-return-shared";
import { formatLocalDate, parseLocalDate } from "./tax-date";

type IncomeTaxReturnPersonalDetailsStepProps = {
  value: PersonalDetailsSectionPayload;
  onChange: (next: PersonalDetailsSectionPayload) => void;
};

export const IncomeTaxReturnPersonalDetailsStep = ({
  value,
  onChange,
}: IncomeTaxReturnPersonalDetailsStepProps) => {
  const update = (patch: Partial<PersonalDetailsSectionPayload>) =>
    onChange({ ...value, ...patch });

  const civilStatus = value.civilStatus;
  const marriedSince = parseLocalDate(value.marriedSince);
  const setMarriedSince = (next: Date | undefined) =>
    update({ marriedSince: formatLocalDate(next) });
  const declarationType = value.declarationType as DeclarationType;
  const jointTaxStateRegister = value.jointTaxStateRegister;
  const jointTaxNumber = value.jointTaxNumber;

  const gender = value.gender as Gender;
  const firstName = value.firstName;
  const lastName = value.lastName;
  const professionInGerman = value.professionInGerman;
  const birthDate = parseLocalDate(value.birthDate);
  const setBirthDate = (next: Date | undefined) => update({ birthDate: formatLocalDate(next) });
  const street = value.street;
  const houseNumber = value.houseNumber;
  const apartmentNumber = value.apartmentNumber;
  const additionalInfo = value.additionalInfo;
  const city = value.city;
  const zipCode = value.zipCode;
  const personalTaxId = value.personalTaxId;
  const religion = value.religion as ReligionValue;

  const spouseGender = value.spouseGender as Gender | "";
  const spouseFirstName = value.spouseFirstName;
  const spouseLastName = value.spouseLastName;
  const spouseProfessionInGerman = value.spouseProfessionInGerman;
  const spouseBirthDate = parseLocalDate(value.spouseBirthDate);
  const setSpouseBirthDate = (next: Date | undefined) =>
    update({ spouseBirthDate: formatLocalDate(next) });
  const spouseDifferentHomeAddress = value.spouseDifferentHomeAddress as HomeAddressChoice;
  const spouseStreet = value.spouseStreet;
  const spouseHouseNumber = value.spouseHouseNumber;
  const spouseApartmentNumber = value.spouseApartmentNumber;
  const spouseAdditionalInfo = value.spouseAdditionalInfo;
  const spouseCity = value.spouseCity;
  const spouseZipCode = value.spouseZipCode;
  const spousePersonalTaxId = value.spousePersonalTaxId;
  const spouseReligion = value.spouseReligion as ReligionValue | "";

  const setCivilStatus = (next: string) => update({ civilStatus: next });
  const setDeclarationType = (next: DeclarationType) => update({ declarationType: next });
  const setJointTaxStateRegister = (next: string) => update({ jointTaxStateRegister: next });
  const setJointTaxNumber = (next: string) => update({ jointTaxNumber: next });
  const setGender = (next: Gender) => update({ gender: next });
  const setFirstName = (next: string) => update({ firstName: next });
  const setLastName = (next: string) => update({ lastName: next });
  const setProfessionInGerman = (next: string) => update({ professionInGerman: next });
  const setStreet = (next: string) => update({ street: next });
  const setHouseNumber = (next: string) => update({ houseNumber: next });
  const setApartmentNumber = (next: string) => update({ apartmentNumber: next });
  const setAdditionalInfo = (next: string) => update({ additionalInfo: next });
  const setCity = (next: string) => update({ city: next });
  const setZipCode = (next: string) => update({ zipCode: next });
  const setPersonalTaxId = (next: string) => update({ personalTaxId: next });
  const setReligion = (next: ReligionValue) => update({ religion: next });
  const setSpouseGender = (next: Gender | "") => update({ spouseGender: next });
  const setSpouseFirstName = (next: string) => update({ spouseFirstName: next });
  const setSpouseLastName = (next: string) => update({ spouseLastName: next });
  const setSpouseProfessionInGerman = (next: string) => update({ spouseProfessionInGerman: next });
  const setSpouseDifferentHomeAddress = (next: HomeAddressChoice | "") =>
    update({ spouseDifferentHomeAddress: next as HomeAddressChoice });
  const setSpouseStreet = (next: string) => update({ spouseStreet: next });
  const setSpouseHouseNumber = (next: string) => update({ spouseHouseNumber: next });
  const setSpouseApartmentNumber = (next: string) => update({ spouseApartmentNumber: next });
  const setSpouseAdditionalInfo = (next: string) => update({ spouseAdditionalInfo: next });
  const setSpouseCity = (next: string) => update({ spouseCity: next });
  const setSpouseZipCode = (next: string) => update({ spouseZipCode: next });
  const setSpousePersonalTaxId = (next: string) => update({ spousePersonalTaxId: next });
  const setSpouseReligion = (next: ReligionValue | "") => update({ spouseReligion: next });

  const isJointTaxNumberMissing =
    declarationType === "joint" && (!jointTaxStateRegister || jointTaxNumber.trim().length === 0);
  const isSpouseGenderMissing = spouseGender === "";
  const isSpouseFirstNameMissing = spouseFirstName.trim().length === 0;
  const isSpouseLastNameMissing = spouseLastName.trim().length === 0;
  const isSpouseProfessionMissing = spouseProfessionInGerman.trim().length === 0;
  const isSpouseBirthDateMissing = !spouseBirthDate;
  const isSpouseDifferentAddressMissing = false;
  const shouldShowSpouseAddress = spouseDifferentHomeAddress === "yes";
  const isSpouseStreetMissing = shouldShowSpouseAddress && spouseStreet.trim().length === 0;
  const isSpouseHouseNumberMissing =
    shouldShowSpouseAddress && spouseHouseNumber.trim().length === 0;
  const isSpouseCityMissing = shouldShowSpouseAddress && spouseCity.trim().length === 0;
  const isSpouseZipCodeMissing = shouldShowSpouseAddress && spouseZipCode.trim().length === 0;
  const isSpouseReligionMissing = spouseReligion === "";

  return (
    <>
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-h3 text-foreground">Civil status</h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

            {civilStatus === "married" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Married since</Label>
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
                        <span>Select date</span>
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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Birth date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? birthDate.toLocaleDateString("de-DE") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={birthDate} onSelect={setBirthDate} />
              </PopoverContent>
            </Popover>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Home address</legend>
            <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="zip-code" className="text-xs text-muted-foreground">
                  Zip code
                </Label>
                <Input
                  id="zip-code"
                  inputMode="numeric"
                  value={zipCode}
                  onChange={(event) =>
                    setZipCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))
                  }
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
            <ReligionSelect id="religion" value={religion} onValueChange={setReligion} />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Birth date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 w-full justify-start text-left font-normal",
                    !spouseBirthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {spouseBirthDate ? (
                    spouseBirthDate.toLocaleDateString("de-DE")
                  ) : (
                    <span>Select date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={spouseBirthDate} onSelect={setSpouseBirthDate} />
              </PopoverContent>
            </Popover>
            <RequiredHint show={isSpouseBirthDateMissing} />
          </div>

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

          {shouldShowSpouseAddress ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Home address</legend>

              <div className="space-y-2">
                <Label htmlFor="spouse-street" className="text-xs text-muted-foreground">
                  Street
                </Label>
                <Input
                  id="spouse-street"
                  value={spouseStreet}
                  onChange={(event) => setSpouseStreet(event.target.value)}
                  placeholder="e.g. Rosa Luxemburg"
                  className="h-10"
                />
                <RequiredHint show={isSpouseStreetMissing} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="spouse-house-number" className="text-xs text-muted-foreground">
                    House number
                  </Label>
                  <Input
                    id="spouse-house-number"
                    value={spouseHouseNumber}
                    onChange={(event) => setSpouseHouseNumber(event.target.value)}
                    placeholder="e.g. 28"
                    className="h-10"
                  />
                  <RequiredHint show={isSpouseHouseNumberMissing} />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="spouse-apartment-number"
                    className="text-xs text-muted-foreground"
                  >
                    Apartment number
                  </Label>
                  <Input
                    id="spouse-apartment-number"
                    value={spouseApartmentNumber}
                    onChange={(event) => setSpouseApartmentNumber(event.target.value)}
                    placeholder="e.g. 6"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse-additional-info" className="text-xs text-muted-foreground">
                    Additional Info
                  </Label>
                  <Input
                    id="spouse-additional-info"
                    value={spouseAdditionalInfo}
                    onChange={(event) => setSpouseAdditionalInfo(event.target.value)}
                    placeholder="e.g. Mustermann o"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="spouse-city" className="text-xs text-muted-foreground">
                    City
                  </Label>
                  <Input
                    id="spouse-city"
                    value={spouseCity}
                    onChange={(event) => setSpouseCity(event.target.value)}
                    placeholder="e.g. Berlin"
                    className="h-10"
                  />
                  <RequiredHint show={isSpouseCityMissing} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse-zip-code" className="text-xs text-muted-foreground">
                    Zip code
                  </Label>
                  <Input
                    id="spouse-zip-code"
                    inputMode="numeric"
                    value={spouseZipCode}
                    onChange={(event) =>
                      setSpouseZipCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))
                    }
                    placeholder="e.g. 12345"
                    className="h-10"
                  />
                  <RequiredHint show={isSpouseZipCodeMissing} />
                </div>
              </div>
            </fieldset>
          ) : null}

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
            <ReligionSelect
              id="spouse-religion"
              value={spouseReligion || undefined}
              onValueChange={setSpouseReligion}
            />
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
