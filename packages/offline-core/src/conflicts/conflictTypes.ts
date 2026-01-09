export interface ConflictInfo<TServerState = unknown> {
  serverVersion?: number;
  serverState?: TServerState;
  message?: string;
}
