export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GeminiError extends AppError {
  public readonly rawResponse?: string;

  constructor(message: string, rawResponse?: string) {
    super(message, 502);
    this.name = "GeminiError";
    this.rawResponse = rawResponse;
  }
}

export class UploadError extends AppError {
  constructor(message: string) {
    super(message, 502);
    this.name = "UploadError";
  }
}
