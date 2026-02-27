import { ValidationFailedError } from "@corely/domain";

type IndexedTemplate = {
  index?: number | null;
};

export const assertValidProgramTitle = (title: string | undefined) => {
  if (!title?.trim()) {
    throw new ValidationFailedError("title is required", [
      { message: "title is required", members: ["title"] },
    ]);
  }
};

export const assertValidExpectedSessionsCount = (value: number | null | undefined) => {
  if (value === undefined || value === null) {
    return;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationFailedError("expectedSessionsCount must be a positive integer", [
      {
        message: "expectedSessionsCount must be a positive integer",
        members: ["expectedSessionsCount"],
      },
    ]);
  }
};

const assertValidTemplateIndexes = (field: string, items: IndexedTemplate[]) => {
  const seen = new Set<number>();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const indexValue = item.index;
    if (!Number.isInteger(indexValue) || indexValue < 0) {
      throw new ValidationFailedError(`${field} index must be a non-negative integer`, [
        {
          message: `${field} index must be a non-negative integer`,
          members: [`${field}.${index}.index`],
        },
      ]);
    }
    if (seen.has(indexValue)) {
      throw new ValidationFailedError(`${field} contains duplicate index values`, [
        {
          message: `${field} contains duplicate index values`,
          members: [`${field}.${index}.index`],
        },
      ]);
    }
    seen.add(indexValue);
  }
};

export const assertValidSessionTemplates = (items: IndexedTemplate[]) => {
  assertValidTemplateIndexes("sessionTemplates", items);
};

export const assertValidMilestoneTemplates = (items: IndexedTemplate[]) => {
  assertValidTemplateIndexes("milestoneTemplates", items);
};
