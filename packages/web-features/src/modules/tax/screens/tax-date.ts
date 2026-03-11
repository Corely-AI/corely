export const parseLocalDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
};

export const formatLocalDate = (value?: Date): string | undefined => {
  if (!value) {
    return undefined;
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
