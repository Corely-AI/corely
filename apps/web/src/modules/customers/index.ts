import type { Command } from "@/shared/command-palette/types";

export { default as CustomersPage } from "./screens/CustomersPage";
export { default as NewCustomerPage } from "./screens/NewCustomerPage";
export { default as EditCustomerPage } from "./screens/EditCustomerPage";
export { default as SuppliersPage } from "./screens/SuppliersPage";
export { default as NewSupplierPage } from "./screens/NewSupplierPage";
export { default as EditSupplierPage } from "./screens/EditSupplierPage";
export { default as StudentsPage } from "./screens/StudentsPage";
export { default as NewStudentPage } from "./screens/NewStudentPage";
export { default as StudentDetailPage } from "./screens/StudentDetailPage";
export { default as BirthdayRemindersPage } from "./screens/BirthdayRemindersPage";
export {
  customerFormSchema,
  getDefaultCustomerFormValues,
  toCreateCustomerInput,
  toUpdateCustomerInput,
  type CustomerFormData,
} from "./schemas/customer-form.schema";

export const commandContributions = (): Command[] => [
  {
    id: "module.customers.suppliers.list",
    title: "Suppliers",
    subtitle: "Navigate to suppliers list",
    keywords: ["vendor", "supplier", "contacts"],
    group: "Navigate",
    run: ({ navigate }) => navigate("/suppliers"),
  },
  {
    id: "module.customers.suppliers.create",
    title: "New Supplier",
    subtitle: "Create a supplier profile",
    keywords: ["supplier", "vendor", "create"],
    group: "Create",
    run: ({ navigate }) => navigate("/suppliers/new"),
  },
  {
    id: "module.customers.birthdays.list",
    title: "Birthday Reminders",
    subtitle: "View upcoming customer birthdays",
    keywords: ["customers", "birthdays", "reminders"],
    group: "Navigate",
    run: ({ navigate }) => navigate("/customers/birthdays"),
  },
];
