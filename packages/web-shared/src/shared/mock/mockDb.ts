import type {
  Tenant,
  User,
  Customer,
  Project,
  Expense,
  Invoice,
  Conversation,
  ChatMessage,
  ExpenseCategory,
  VatRate,
  InvoiceStatus,
} from "../types";
import {
  seedTenant,
  seedUser,
  seedCustomers,
  seedProjects,
  seedExpenses,
  seedInvoices,
} from "./seedData";

// Storage key
const STORAGE_KEY = "Corely One ERP-mock-db";

export interface MockDatabase {
  tenant: Tenant;
  user: User;
  customers: Customer[];
  projects: Project[];
  expenses: Expense[];
  invoices: Invoice[];
  conversations: Conversation[];
  invoiceSequence: number;
}

function createInitialDb(): MockDatabase {
  return {
    tenant: seedTenant,
    user: seedUser,
    customers: seedCustomers,
    projects: seedProjects,
    expenses: seedExpenses,
    invoices: seedInvoices,
    conversations: [],
    invoiceSequence: 7,
  };
}

export function loadDb(): MockDatabase {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load mock DB:", e);
  }
  return createInitialDb();
}

export function saveDb(db: MockDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save mock DB:", e);
  }
}

export function resetDb(): MockDatabase {
  const db = createInitialDb();
  saveDb(db);
  return db;
}

// Export singleton instance
let dbInstance: MockDatabase | null = null;

export function getDb(): MockDatabase {
  if (!dbInstance) {
    dbInstance = loadDb();
  }
  return dbInstance;
}

export function updateDb(updater: (db: MockDatabase) => MockDatabase): MockDatabase {
  const db = getDb();
  const updated = updater(db);
  dbInstance = updated;
  saveDb(updated);
  return updated;
}
