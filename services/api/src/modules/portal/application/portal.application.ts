import { type GetPortalMeUseCase } from "./use-cases/get-portal-me.usecase";
import { type GetStudentClassesUseCase } from "./use-cases/get-student-classes.usecase";
import { type GetStudentMaterialsUseCase } from "./use-cases/get-student-materials.usecase";
import { type GetPortalDownloadUrlUseCase } from "./use-cases/get-portal-download-url.usecase";
import { type GetStudentInvoicesUseCase } from "./use-cases/get-student-invoices.usecase";
import { type GetPortalInvoiceDownloadUrlUseCase } from "./use-cases/get-portal-invoice-download-url.usecase";
import { type InvitePortalUserUseCase } from "./use-cases/invite-portal-user.usecase";

export class PortalApplication {
  constructor(
    public readonly getMe: GetPortalMeUseCase,
    public readonly getStudentClasses: GetStudentClassesUseCase,
    public readonly getStudentMaterials: GetStudentMaterialsUseCase,
    public readonly getDownloadUrl: GetPortalDownloadUrlUseCase,
    public readonly getStudentInvoices: GetStudentInvoicesUseCase,
    public readonly getInvoiceDownloadUrl: GetPortalInvoiceDownloadUrlUseCase,
    public readonly inviteUser: InvitePortalUserUseCase
  ) {}
}
