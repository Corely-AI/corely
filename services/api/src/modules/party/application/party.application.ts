import type { ArchiveCustomerUseCase } from "./use-cases/archive-customer/archive-customer.usecase";
import type { CreateCustomerUseCase } from "./use-cases/create-customer/create-customer.usecase";
import type { GetCustomerByIdUseCase } from "./use-cases/get-customer-by-id/get-customer-by-id.usecase";
import type { ListCustomersUseCase } from "./use-cases/list-customers/list-customers.usecase";
import type { SearchCustomersUseCase } from "./use-cases/search-customers/search-customers.usecase";
import type { UnarchiveCustomerUseCase } from "./use-cases/unarchive-customer/unarchive-customer.usecase";
import type { UpdateCustomerUseCase } from "./use-cases/update-customer/update-customer.usecase";
import type { GetStudentGuardiansUseCase } from "./use-cases/student-guardians/get-student-guardians.usecase";
import type { LinkGuardianToStudentUseCase } from "./use-cases/student-guardians/link-guardian-to-student.usecase";
import type { SetPrimaryPayerUseCase } from "./use-cases/student-guardians/set-primary-payer.usecase";
import type { UnlinkGuardianUseCase } from "./use-cases/student-guardians/unlink-guardian.usecase";
import type { UpdatePartyLifecycleStatusUseCase } from "./use-cases/update-party-lifecycle-status.usecase";

export class PartyApplication {
  constructor(
    public readonly createCustomer: CreateCustomerUseCase,
    public readonly updateCustomer: UpdateCustomerUseCase,
    public readonly archiveCustomer: ArchiveCustomerUseCase,
    public readonly unarchiveCustomer: UnarchiveCustomerUseCase,
    public readonly getCustomerById: GetCustomerByIdUseCase,
    public readonly listCustomers: ListCustomersUseCase,
    public readonly searchCustomers: SearchCustomersUseCase,
    public readonly getStudentGuardians: GetStudentGuardiansUseCase,
    public readonly linkGuardianToStudent: LinkGuardianToStudentUseCase,
    public readonly unlinkGuardian: UnlinkGuardianUseCase,
    public readonly setPrimaryPayer: SetPrimaryPayerUseCase,
    public readonly updateLifecycleStatus: UpdatePartyLifecycleStatusUseCase
  ) {}
}
