export type AppErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "CV_EMPTY"
  | "JOB_DESCRIPTION_EMPTY"
  | "CV_PARSE_FAILED"
  | "AI_REQUEST_FAILED"
  | "AI_REQUEST_TIMEOUT"
  | "AI_RESPONSE_INVALID"
  | "QUOTA_EXCEEDED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly code: AppErrorCode;

  constructor(
    userMessage: string,
    statusCode = 400,
    code: AppErrorCode = "VALIDATION_ERROR"
  ) {
    super(userMessage);
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  invalidFileType: () =>
    new AppError("Only .pdf and .docx files are supported.", 415, "INVALID_FILE_TYPE"),
  fileTooLarge: (maxMb: number) =>
    new AppError(`File is too large. Maximum size is ${maxMb}MB.`, 413, "FILE_TOO_LARGE"),
  emptyCv: () =>
    new AppError(
      "We couldn't read any text from your CV. Please upload a text-based PDF or DOCX (not a scanned image).",
      422,
      "CV_EMPTY"
    ),
  emptyJobDescription: () =>
    new AppError("Please paste the job description before analyzing.", 400, "JOB_DESCRIPTION_EMPTY"),
  parsingFailed: () =>
    new AppError(
      "We couldn't read your CV file. Please make sure it's a valid PDF or DOCX.",
      422,
      "CV_PARSE_FAILED"
    ),
  aiFailed: () =>
    new AppError(
      "Our AI service is having trouble right now. Please try again in a moment.",
      502,
      "AI_REQUEST_FAILED"
    ),
  aiTimeout: () =>
    new AppError("The AI took too long to respond. Please try again.", 504, "AI_REQUEST_TIMEOUT"),
  malformedAiResponse: () =>
    new AppError(
      "We had trouble processing the AI response. Please try again.",
      502,
      "AI_RESPONSE_INVALID"
    ),
  quotaExceeded: () =>
    new AppError("You've used your free CV optimizations.", 403, "QUOTA_EXCEEDED"),
  unauthorized: (message = "Authentication required.") =>
    new AppError(message, 401, "UNAUTHORIZED"),
  notFound: (message = "Resource not found.") =>
    new AppError(message, 404, "NOT_FOUND"),
  internal: (message = "Internal server error.") =>
    new AppError(message, 500, "INTERNAL_ERROR"),
  validation: (message: string) => new AppError(message, 400, "VALIDATION_ERROR"),
};
