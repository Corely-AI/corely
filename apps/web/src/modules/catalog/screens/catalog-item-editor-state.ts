export type FormState = {
  code: string;
  name: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  defaultUomId: string;
  taxProfileId: string;
  requiresLotTracking: boolean;
  requiresExpiryDate: boolean;
  shelfLifeDays: string;
  hsCode: string;
};

export type FormErrors = {
  code?: string;
  name?: string;
  defaultUomId?: string;
};

export const defaultState: FormState = {
  code: "",
  name: "",
  description: "",
  type: "PRODUCT",
  defaultUomId: "",
  taxProfileId: "",
  requiresLotTracking: false,
  requiresExpiryDate: false,
  shelfLifeDays: "",
  hsCode: "",
};
