export type CashEntryCreatedEvent = {
  eventType: "cash.entry.created";
  payload: {
    entryId: string;
    registerId: string;
    entryNo: number;
    amountCents: number;
    type: string;
    direction: string;
    sourceType: string;
    businessDate: string;
  };
};

export type CashEntryReversedEvent = {
  eventType: "cash.entry.reversed";
  payload: {
    originalEntryId: string;
    reversalEntryId: string;
    registerId: string;
    reason: string;
  };
};

export type CashDayClosedEvent = {
  eventType: "cash.day.closed";
  payload: {
    dayCloseId: string;
    registerId: string;
    dayKey: string;
    differenceCents: number;
    status: string;
  };
};

export type CashEntryAttachmentAddedEvent = {
  eventType: "cash.entry.attachment.added";
  payload: {
    entryId: string;
    attachmentId: string;
    documentId: string;
  };
};
