export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}
