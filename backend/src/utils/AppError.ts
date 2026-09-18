export class AppError extends Error {
  public readonly statusCode: number;
  public readonly userMessage: string;

  constructor(userMessage: string, statusCode = 400) {
    super(userMessage);
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const Errors = {
  invalidFileType: () =>
    new AppError("Only .pdf and .docx files are supported.", 400),
  fileTooLarge: (maxMb: number) =>
    new AppError(`File is too large. Maximum size is ${maxMb}MB.`, 400),
  emptyCv: () =>
    new AppError(
      "We couldn't read any text from your CV. Please upload a text-based PDF or DOCX (not a scanned image).",
      400
    ),
  emptyJobDescription: () =>
    new AppError("Please paste the job description before analyzing.", 400),
  parsingFailed: () =>
    new AppError(
      "We couldn't read your CV file. Please make sure it's a valid PDF or DOCX.",
      422
    ),
  aiFailed: () =>
    new AppError(
      "Our AI service is having trouble right now. Please try again in a moment.",
      502
    ),
  aiTimeout: () =>
    new AppError("The AI took too long to respond. Please try again.", 504),
  malformedAiResponse: () =>
    new AppError(
      "We had trouble processing the AI response. Please try again.",
      502
    ),
  quotaExceeded: () =>
    new AppError("You've used your free CV optimizations.", 403),
  unauthorized: (message = "Authentication required.") =>
    new AppError(message, 401),
  notFound: (message = "Resource not found.") =>
    new AppError(message, 404),
  internal: (message = "Internal server error.") =>
    new AppError(message, 500),
  validation: (message: string) => new AppError(message, 400),
};
