import type { ActivityDto, DealDto } from "@corely/contracts";

export const unwrapDealResponse = (response: unknown): DealDto => {
  if (response && typeof response === "object") {
    if ("deal" in response) {
      return (response as { deal: DealDto }).deal;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("deal" in data) {
          return (data as { deal: DealDto }).deal;
        }
        if ("id" in data) {
          return data as DealDto;
        }
      }
    }
    if ("id" in response) {
      return response as DealDto;
    }
  }

  return response as DealDto;
};

export const unwrapActivityResponse = (response: unknown): ActivityDto => {
  if (response && typeof response === "object") {
    if ("activity" in response) {
      return (response as { activity: ActivityDto }).activity;
    }
    if ("data" in response) {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === "object") {
        if ("activity" in data) {
          return (data as { activity: ActivityDto }).activity;
        }
        if ("id" in data) {
          return data as ActivityDto;
        }
      }
    }
    if ("id" in response) {
      return response as ActivityDto;
    }
  }

  return response as ActivityDto;
};
