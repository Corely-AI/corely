import { describe, expect, it } from "vitest";
import { CreateEmployeeTaskSchema, UpdateEmployeeTaskSchema } from "@corely/contracts";
import { transitionTask, type TaskRecord } from "../domain/task-rules";
describe("Employee task contracts and lifecycle", () => {
  it("normalizes due instants while rejecting invalid or privileged fields", () => {
    expect(
      CreateEmployeeTaskSchema.parse({
        title: "  Opening  ",
        ownerStaffId: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
        dueAt: "2026-11-09T09:30:00+07:00",
      })
    ).toMatchObject({ title: "Opening", dueAt: "2026-11-09T02:30:00.000Z" });
    for (const field of [{ title: "" }, { status: "COMPLETED" }, { workspaceId: "foreign" }])
      expect(CreateEmployeeTaskSchema.safeParse(field).success).toBe(false);
    expect(
      UpdateEmployeeTaskSchema.safeParse({
        title: "x",
        ownerStaffId: "35f708b5-cbda-4bc1-bcee-51506c9e6018",
      }).success
    ).toBe(false);
  });
  it("preserves identity and assignment through completion and reopening", () => {
    const record: TaskRecord = {
      id: "task",
      workspaceId: "workspace",
      title: "Opening",
      ownerStaffId: "owner",
      ownerName: "Anna",
      dueAt: null,
      status: "OPEN",
      version: 1,
      createdAt: "created",
      updatedAt: "created",
      completedAt: null,
    };
    const completed = transitionTask(record, true, "completed");
    expect(completed).toMatchObject({
      id: "task",
      ownerStaffId: "owner",
      version: 2,
      status: "COMPLETED",
      completedAt: "completed",
    });
    expect(transitionTask(completed, false, "reopened")).toMatchObject({
      version: 3,
      status: "OPEN",
      completedAt: null,
      updatedAt: "reopened",
    });
    expect(record.status).toBe("OPEN");
  });
});
