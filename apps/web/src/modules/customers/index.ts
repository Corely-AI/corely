export { default as CustomersPage } from "./screens/CustomersPage";
export { default as NewCustomerPage } from "./screens/NewCustomerPage";
export { default as EditCustomerPage } from "./screens/EditCustomerPage";
export { default as StudentsPage } from "./screens/StudentsPage";
export { default as NewStudentPage } from "./screens/NewStudentPage";
export { default as StudentDetailPage } from "./screens/StudentDetailPage";
export {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  toUpdateCustomerInput,
  type CustomerFormData,
} from "./schemas/customer-form.schema";
