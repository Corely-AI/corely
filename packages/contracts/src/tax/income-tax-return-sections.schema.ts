import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import {
  AnnualIncomeSectionPayloadSchema,
  type AnnualIncomeSectionPayload,
} from "./annual-income-report.schema";

export const BinaryChoiceSchema = z.enum(["yes", "no"]);
export type BinaryChoice = z.infer<typeof BinaryChoiceSchema>;

export const OptionalBinaryChoiceSchema = z.enum(["yes", "no", ""]);
export type OptionalBinaryChoice = z.infer<typeof OptionalBinaryChoiceSchema>;

export const DeclarationTypeSchema = z.enum(["joint", "individual"]);
export type DeclarationType = z.infer<typeof DeclarationTypeSchema>;

export const GenderSchema = z.enum(["female", "male"]);
export type Gender = z.infer<typeof GenderSchema>;

export const OptionalGenderSchema = z.enum(["female", "male", ""]);
export type OptionalGender = z.infer<typeof OptionalGenderSchema>;

export const HomeAddressChoiceSchema = z.enum(["yes", "no"]);
export type HomeAddressChoice = z.infer<typeof HomeAddressChoiceSchema>;

export const BankAccountOwnerSchema = z.enum(["you", "spouse", "both"]);
export type BankAccountOwner = z.infer<typeof BankAccountOwnerSchema>;

export const MoveDirectionSchema = z.enum(["moved-to-germany", "moved-out-of-germany", ""]);
export type MoveDirection = z.infer<typeof MoveDirectionSchema>;

export const PayslipPartnerSchema = z.enum(["spouse", "main-partner"]);
export type PayslipPartner = z.infer<typeof PayslipPartnerSchema>;

export const RelationshipValueSchema = z.enum([
  "biological-child",
  "adopted-child",
  "step-child",
  "foster-child",
  "grandchild",
]);
export type RelationshipValue = z.infer<typeof RelationshipValueSchema>;

export const OptionalRelationshipValueSchema = z.enum([
  "biological-child",
  "adopted-child",
  "step-child",
  "foster-child",
  "grandchild",
  "",
]);
export type OptionalRelationshipValue = z.infer<typeof OptionalRelationshipValueSchema>;

export const SharedHouseholdValueSchema = z.enum(["yes-entire-year", "no"]);
export type SharedHouseholdValue = z.infer<typeof SharedHouseholdValueSchema>;

export const ChildResidenceValueSchema = z.enum(["with-me", "with-other-parent", "somewhere-else"]);
export type ChildResidenceValue = z.infer<typeof ChildResidenceValueSchema>;

export const ReligionValueSchema = z.enum([
  "--",
  "ak",
  "ev",
  "fa",
  "fb",
  "fg",
  "fm",
  "fr",
  "fs",
  "ib",
  "ih",
  "il",
  "is",
  "iw",
  "jd",
  "jh",
  "na",
  "lt",
  "rf",
  "rk",
  "",
]);
export type ReligionValue = z.infer<typeof ReligionValueSchema>;

export const PersonalDetailsSectionPayloadSchema = z.object({
  civilStatus: z.string().default("married"),
  marriedSince: localDateSchema.optional(),
  declarationType: DeclarationTypeSchema.default("joint"),
  jointTaxStateRegister: z.string().default(""),
  jointTaxNumber: z.string().default(""),
  gender: GenderSchema.default("female"),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  professionInGerman: z.string().default(""),
  birthDate: localDateSchema.optional(),
  street: z.string().default(""),
  houseNumber: z.string().default(""),
  apartmentNumber: z.string().default(""),
  additionalInfo: z.string().default(""),
  city: z.string().default(""),
  zipCode: z.string().default(""),
  personalTaxId: z.string().default(""),
  religion: ReligionValueSchema.default("--"),
  spouseGender: OptionalGenderSchema.default(""),
  spouseFirstName: z.string().default(""),
  spouseLastName: z.string().default(""),
  spouseProfessionInGerman: z.string().default(""),
  spouseBirthDate: localDateSchema.optional(),
  spouseDifferentHomeAddress: HomeAddressChoiceSchema.default("no"),
  spouseStreet: z.string().default(""),
  spouseHouseNumber: z.string().default(""),
  spouseApartmentNumber: z.string().default(""),
  spouseAdditionalInfo: z.string().default(""),
  spouseCity: z.string().default(""),
  spouseZipCode: z.string().default(""),
  spousePersonalTaxId: z.string().default(""),
  spouseReligion: ReligionValueSchema.default(""),
});
export type PersonalDetailsSectionPayload = z.infer<typeof PersonalDetailsSectionPayloadSchema>;

export const IncomeSectionPayloadSchema = z.object({
  annualIncome: AnnualIncomeSectionPayloadSchema.default({
    incomeSources: [],
    noIncomeFlag: false,
  }),
  spouseHasSelfEmploymentIncome: BinaryChoiceSchema.default("no"),
  spouseTaxState: z.string().default(""),
  spouseTaxNumber: z.string().default(""),
  spouseLegalType: z.string().default(""),
  spouseProfit: z.string().default(""),
  spouseCoronaAid: OptionalBinaryChoiceSchema.default(""),
  spouseCoronaAidAmount: z.string().default(""),
  hasEmploymentIncome: BinaryChoiceSchema.default("no"),
  spouseHasEmploymentIncome: BinaryChoiceSchema.default("no"),
  hasUnemploymentBenefits: BinaryChoiceSchema.default("no"),
  unemploymentBenefitsAmount: z.string().default(""),
  spouseHasUnemploymentBenefits: BinaryChoiceSchema.default("no"),
  spouseUnemploymentBenefitsAmount: z.string().default(""),
  hasIncomeAbroad: BinaryChoiceSchema.default("no"),
  moveDirection: MoveDirectionSchema.default(""),
  incomeAbroadAmount: z.string().default(""),
  livedOutsideGermany: BinaryChoiceSchema.default("no"),
  departureDate: localDateSchema.optional(),
  residenceCountry: z.string().default(""),
  addressOutsideGermany: z.string().default(""),
  ownedCompanyWhenLeaving: OptionalBinaryChoiceSchema.default(""),
  intendReturnWithinSevenYears: OptionalBinaryChoiceSchema.default(""),
  movedToLowTaxCountry: OptionalBinaryChoiceSchema.default(""),
  spouseLivedOutsideGermany: BinaryChoiceSchema.default("no"),
  spouseDepartureDate: localDateSchema.optional(),
  spouseResidenceCountry: z.string().default(""),
  spouseAddressOutsideGermany: z.string().default(""),
  spouseOwnedCompanyWhenLeaving: OptionalBinaryChoiceSchema.default(""),
  spouseIntendReturnWithinSevenYears: OptionalBinaryChoiceSchema.default(""),
  spouseMovedToLowTaxCountry: OptionalBinaryChoiceSchema.default(""),
  hasInvestmentIncome: BinaryChoiceSchema.default("no"),
});
export type IncomeSectionPayload = z.infer<typeof IncomeSectionPayloadSchema>;

export const HealthInsuranceSectionPayloadSchema = z.object({
  hasStatutoryHealthInsurance: BinaryChoiceSchema.default("yes"),
  employeeHealthInsuranceContribution: z.string().default("€0.00"),
  statutoryContributionSelfEmployed: z.string().default("€ 0"),
  employeeNursingInsuranceContribution: z.string().default("€0.00"),
  contributionWithSickBenefit: z.string().default("€ 0"),
  nursingContributionSelfEmployed: z.string().default("€ 0"),
  refundedContribution: z.string().default("€ 0"),
  refundedContributionWithSickBenefit: z.string().default("€ 0"),
  voluntaryContributionSubsidy: z.string().default("€ 0"),
  additionalContribution: z.string().default("€ 0"),
  spouseHasStatutoryHealthInsurance: OptionalBinaryChoiceSchema.default(""),
  spouseEmployeeHealthInsuranceContribution: z.string().default("€0.00"),
  spouseStatutoryContributionSelfEmployed: z.string().default("€ 0"),
  spouseEmployeeNursingInsuranceContribution: z.string().default("€0.00"),
  spouseContributionWithSickBenefit: z.string().default("€ 0"),
  spouseNursingContributionSelfEmployed: z.string().default("€ 0"),
  spouseRefundedContribution: z.string().default("€ 0"),
  spouseRefundedContributionWithSickBenefit: z.string().default("€ 0"),
  spouseVoluntaryContributionSubsidy: z.string().default("€ 0"),
  spouseAdditionalContribution: z.string().default("€ 0"),
  hasPrivateHealthInsurance: BinaryChoiceSchema.default("no"),
  privateBasicCoverageContribution: z.string().default("€ 0"),
  privateMandatoryNursingContribution: z.string().default("€ 0"),
  privateReimbursedContribution: z.string().default("€ 0"),
  privateThirdPartySubsidy: z.string().default("€ 0"),
  privateOptionalServicesContribution: z.string().default("€ 0"),
  spouseHasPrivateHealthInsurance: OptionalBinaryChoiceSchema.default(""),
  spousePrivateBasicCoverageContribution: z.string().default("€ 0"),
  spousePrivateMandatoryNursingContribution: z.string().default("€ 0"),
  spousePrivateReimbursedContribution: z.string().default("€ 0"),
  spousePrivateThirdPartySubsidy: z.string().default("€ 0"),
  spousePrivateOptionalServicesContribution: z.string().default("€ 0"),
});
export type HealthInsuranceSectionPayload = z.infer<typeof HealthInsuranceSectionPayloadSchema>;

export const OtherInsurancesSectionPayloadSchema = z.object({
  hasPensionFund: BinaryChoiceSchema.default("yes"),
  pensionEmployeeContribution: z.string().default("€0.00"),
  pensionSelfEmployedContribution: z.string().default("€ 0.00"),
  basicPensionCosts: z.string().default("€ 0.00"),
  spouseHasPensionFund: BinaryChoiceSchema.default("yes"),
  spousePensionEmployeeContribution: z.string().default("€0.00"),
  spouseBasicPensionCosts: z.string().default("€ 0.00"),
  hasAccidentLifeInsurance: BinaryChoiceSchema.default("yes"),
  accidentLifeInsuranceCosts: z.string().default("€ 0.00"),
  spouseHasAccidentLifeInsurance: BinaryChoiceSchema.default("yes"),
  spouseAccidentLifeInsuranceCosts: z.string().default("€ 0.00"),
  hasUnemploymentInsurance: BinaryChoiceSchema.default("yes"),
  unemploymentEmployeeContribution: z.string().default("€0.00"),
  unemploymentSelfEmployedContribution: z.string().default("€ 0.00"),
  spouseHasUnemploymentInsurance: OptionalBinaryChoiceSchema.default(""),
  spouseUnemploymentEmployeeContribution: z.string().default("€0.00"),
  spouseUnemploymentSelfEmployedContribution: z.string().default("€ 0.00"),
  hasWorkDisabilityInsurance: BinaryChoiceSchema.default("yes"),
  workDisabilityInsuranceCosts: z.string().default("€ 0.00"),
  spouseHasWorkDisabilityInsurance: BinaryChoiceSchema.default("yes"),
  spouseWorkDisabilityInsuranceCosts: z.string().default("€ 0.00"),
});
export type OtherInsurancesSectionPayload = z.infer<typeof OtherInsurancesSectionPayloadSchema>;

export const AdditionalExpensesSectionPayloadSchema = z.object({
  hasChildrenUnder18: BinaryChoiceSchema.default("yes"),
  hasDonations: BinaryChoiceSchema.default("yes"),
  hasEmployeeExpensesOverThreshold: BinaryChoiceSchema.default("yes"),
  donationsNationalCharities: z.string().default("€ 0"),
  donationsEuInstitutions: z.string().default("€ 0"),
  donationsPoliticalParties: z.string().default("€ 0"),
  donationsVoterUnions: z.string().default("€ 0"),
});
export type AdditionalExpensesSectionPayload = z.infer<
  typeof AdditionalExpensesSectionPayloadSchema
>;

export const TaxOfficeInfoSectionPayloadSchema = z.object({
  iban: z.string().default(""),
  bankAccountOwner: BankAccountOwnerSchema.default("both"),
  additionalInformation: z.string().default(""),
});
export type TaxOfficeInfoSectionPayload = z.infer<typeof TaxOfficeInfoSectionPayloadSchema>;

export const PayslipMoneyValuesSchema = z.record(z.string(), z.string()).default({});
export type PayslipMoneyValues = z.infer<typeof PayslipMoneyValuesSchema>;

export const PayslipEntrySchema = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  partner: PayslipPartnerSchema,
  taxClass: z.string().default(""),
  periodStart: localDateSchema.optional(),
  periodEnd: localDateSchema.optional(),
  values: PayslipMoneyValuesSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type PayslipEntry = z.infer<typeof PayslipEntrySchema>;

export const PayslipsSectionPayloadSchema = z.object({
  entries: z.array(PayslipEntrySchema).default([]),
});
export type PayslipsSectionPayload = z.infer<typeof PayslipsSectionPayloadSchema>;

export const ChildCareCostSchema = z.object({
  id: z.string().min(1),
  service: z.string().default(""),
  provider: z.string().default(""),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  amount: z.string().default("€ 0"),
});
export type ChildCareCost = z.infer<typeof ChildCareCostSchema>;

export const PrivateSchoolCostSchema = z.object({
  id: z.string().min(1),
  schoolName: z.string().default(""),
  schoolAddress: z.string().default(""),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  amount: z.string().default("€ 0"),
});
export type PrivateSchoolCost = z.infer<typeof PrivateSchoolCostSchema>;

export const ChildEntrySchema = z.object({
  id: z.string().min(1),
  year: z.number().int(),
  taxId: z.string().default(""),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  birthDate: localDateSchema.optional(),
  yourRelationship: OptionalRelationshipValueSchema.default(""),
  spouseRelationship: OptionalRelationshipValueSchema.default(""),
  otherParentName: z.string().default(""),
  otherParentAddress: z.string().default(""),
  sharedHousehold: SharedHouseholdValueSchema.default("yes-entire-year"),
  childResidence: ChildResidenceValueSchema.default("with-me"),
  livedInGermany: BinaryChoiceSchema.default("yes"),
  receivesChildBenefit: BinaryChoiceSchema.default("yes"),
  familyOfficeBranch: z.string().default(""),
  hasChildPrivateHealthInsurance: BinaryChoiceSchema.default("yes"),
  childHealthBasicCoverage: z.string().default("€ 0"),
  childHealthMandatoryNursing: z.string().default("€ 0"),
  childHealthReimbursed: z.string().default("€ 0"),
  childHealthAdditional: z.string().default("€ 0"),
  childCareCosts: z.array(ChildCareCostSchema).default([]),
  privateSchoolCosts: z.array(PrivateSchoolCostSchema).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ChildEntry = z.infer<typeof ChildEntrySchema>;

export const ChildrenSectionPayloadSchema = z.object({
  entries: z.array(ChildEntrySchema).default([]),
});
export type ChildrenSectionPayload = z.infer<typeof ChildrenSectionPayloadSchema>;

export type TaxReportSectionValueByKey = {
  annualIncome: AnnualIncomeSectionPayload;
  personalDetails: PersonalDetailsSectionPayload;
  income: IncomeSectionPayload;
  healthInsurance: HealthInsuranceSectionPayload;
  otherInsurances: OtherInsurancesSectionPayload;
  additionalExpenses: AdditionalExpensesSectionPayload;
  taxOfficeInfo: TaxOfficeInfoSectionPayload;
  payslips: PayslipsSectionPayload;
  children: ChildrenSectionPayload;
};

export const createDefaultPersonalDetailsSectionPayload = (): PersonalDetailsSectionPayload => ({
  civilStatus: "married",
  marriedSince: undefined,
  declarationType: "joint",
  jointTaxStateRegister: "",
  jointTaxNumber: "",
  gender: "female",
  firstName: "",
  lastName: "",
  professionInGerman: "",
  birthDate: undefined,
  street: "",
  houseNumber: "",
  apartmentNumber: "",
  additionalInfo: "",
  city: "",
  zipCode: "",
  personalTaxId: "",
  religion: "--",
  spouseGender: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseProfessionInGerman: "",
  spouseBirthDate: undefined,
  spouseDifferentHomeAddress: "no",
  spouseStreet: "",
  spouseHouseNumber: "",
  spouseApartmentNumber: "",
  spouseAdditionalInfo: "",
  spouseCity: "",
  spouseZipCode: "",
  spousePersonalTaxId: "",
  spouseReligion: "",
});

export const createDefaultIncomeSectionPayload = (): IncomeSectionPayload => ({
  annualIncome: {
    incomeSources: [],
    noIncomeFlag: false,
  },
  spouseHasSelfEmploymentIncome: "no",
  spouseTaxState: "",
  spouseTaxNumber: "",
  spouseLegalType: "",
  spouseProfit: "",
  spouseCoronaAid: "",
  spouseCoronaAidAmount: "",
  hasEmploymentIncome: "no",
  spouseHasEmploymentIncome: "no",
  hasUnemploymentBenefits: "no",
  unemploymentBenefitsAmount: "",
  spouseHasUnemploymentBenefits: "no",
  spouseUnemploymentBenefitsAmount: "",
  hasIncomeAbroad: "no",
  moveDirection: "",
  incomeAbroadAmount: "",
  livedOutsideGermany: "no",
  departureDate: undefined,
  residenceCountry: "",
  addressOutsideGermany: "",
  ownedCompanyWhenLeaving: "",
  intendReturnWithinSevenYears: "",
  movedToLowTaxCountry: "",
  spouseLivedOutsideGermany: "no",
  spouseDepartureDate: undefined,
  spouseResidenceCountry: "",
  spouseAddressOutsideGermany: "",
  spouseOwnedCompanyWhenLeaving: "",
  spouseIntendReturnWithinSevenYears: "",
  spouseMovedToLowTaxCountry: "",
  hasInvestmentIncome: "no",
});

export const createDefaultHealthInsuranceSectionPayload = (): HealthInsuranceSectionPayload => ({
  hasStatutoryHealthInsurance: "yes",
  employeeHealthInsuranceContribution: "€0.00",
  statutoryContributionSelfEmployed: "€ 0",
  employeeNursingInsuranceContribution: "€0.00",
  contributionWithSickBenefit: "€ 0",
  nursingContributionSelfEmployed: "€ 0",
  refundedContribution: "€ 0",
  refundedContributionWithSickBenefit: "€ 0",
  voluntaryContributionSubsidy: "€ 0",
  additionalContribution: "€ 0",
  spouseHasStatutoryHealthInsurance: "",
  spouseEmployeeHealthInsuranceContribution: "€0.00",
  spouseStatutoryContributionSelfEmployed: "€ 0",
  spouseEmployeeNursingInsuranceContribution: "€0.00",
  spouseContributionWithSickBenefit: "€ 0",
  spouseNursingContributionSelfEmployed: "€ 0",
  spouseRefundedContribution: "€ 0",
  spouseRefundedContributionWithSickBenefit: "€ 0",
  spouseVoluntaryContributionSubsidy: "€ 0",
  spouseAdditionalContribution: "€ 0",
  hasPrivateHealthInsurance: "no",
  privateBasicCoverageContribution: "€ 0",
  privateMandatoryNursingContribution: "€ 0",
  privateReimbursedContribution: "€ 0",
  privateThirdPartySubsidy: "€ 0",
  privateOptionalServicesContribution: "€ 0",
  spouseHasPrivateHealthInsurance: "",
  spousePrivateBasicCoverageContribution: "€ 0",
  spousePrivateMandatoryNursingContribution: "€ 0",
  spousePrivateReimbursedContribution: "€ 0",
  spousePrivateThirdPartySubsidy: "€ 0",
  spousePrivateOptionalServicesContribution: "€ 0",
});

export const createDefaultOtherInsurancesSectionPayload = (): OtherInsurancesSectionPayload => ({
  hasPensionFund: "yes",
  pensionEmployeeContribution: "€0.00",
  pensionSelfEmployedContribution: "€ 0.00",
  basicPensionCosts: "€ 0.00",
  spouseHasPensionFund: "yes",
  spousePensionEmployeeContribution: "€0.00",
  spouseBasicPensionCosts: "€ 0.00",
  hasAccidentLifeInsurance: "yes",
  accidentLifeInsuranceCosts: "€ 0.00",
  spouseHasAccidentLifeInsurance: "yes",
  spouseAccidentLifeInsuranceCosts: "€ 0.00",
  hasUnemploymentInsurance: "yes",
  unemploymentEmployeeContribution: "€0.00",
  unemploymentSelfEmployedContribution: "€ 0.00",
  spouseHasUnemploymentInsurance: "",
  spouseUnemploymentEmployeeContribution: "€0.00",
  spouseUnemploymentSelfEmployedContribution: "€ 0.00",
  hasWorkDisabilityInsurance: "yes",
  workDisabilityInsuranceCosts: "€ 0.00",
  spouseHasWorkDisabilityInsurance: "yes",
  spouseWorkDisabilityInsuranceCosts: "€ 0.00",
});

export const createDefaultAdditionalExpensesSectionPayload =
  (): AdditionalExpensesSectionPayload => ({
    hasChildrenUnder18: "yes",
    hasDonations: "yes",
    hasEmployeeExpensesOverThreshold: "yes",
    donationsNationalCharities: "€ 0",
    donationsEuInstitutions: "€ 0",
    donationsPoliticalParties: "€ 0",
    donationsVoterUnions: "€ 0",
  });

export const createDefaultTaxOfficeInfoSectionPayload = (): TaxOfficeInfoSectionPayload => ({
  iban: "",
  bankAccountOwner: "both",
  additionalInformation: "",
});

export const createDefaultPayslipsSectionPayload = (): PayslipsSectionPayload => ({
  entries: [],
});

export const createDefaultChildrenSectionPayload = (): ChildrenSectionPayload => ({
  entries: [],
});
