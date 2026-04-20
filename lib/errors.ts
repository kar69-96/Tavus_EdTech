export class ConfigError extends Error {
  readonly statusCode = 503;
  readonly userMessage: string;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = "ConfigError";
    this.userMessage = userMessage;
    if (cause !== undefined) this.cause = cause;
  }
}
