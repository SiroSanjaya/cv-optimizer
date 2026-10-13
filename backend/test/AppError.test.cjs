const assert = require("node:assert/strict");
const test = require("node:test");
const { Errors } = require("../dist/utils/AppError");
const { errorHandler, notFoundHandler } = require("../dist/middleware/errorHandler");

test("file upload errors expose standard HTTP statuses and stable codes", () => {
  assert.equal(Errors.invalidFileType().statusCode, 415);
  assert.equal(Errors.invalidFileType().code, "INVALID_FILE_TYPE");
  assert.equal(Errors.fileTooLarge(5).statusCode, 413);
  assert.equal(Errors.fileTooLarge(5).code, "FILE_TOO_LARGE");
});

test("error responses preserve the legacy message and include a stable code", () => {
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  errorHandler(Errors.validation("Invalid request."), {}, response, () => {});

  assert.equal(statusCode, 400);
  assert.deepEqual(body, {
    success: false,
    error: "Invalid request.",
    code: "VALIDATION_ERROR",
  });
});

test("internal errors do not expose their internal message to clients", () => {
  let body;
  const response = {
    status() {
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(Errors.internal("database password leaked"), {}, response, () => {});
  } finally {
    console.error = originalError;
  }

  assert.equal(body.code, "INTERNAL_ERROR");
  assert.equal(body.error, "Something went wrong on our end. Please try again.");
  assert.equal(body.error.includes("database password"), false);
});

test("not-found responses use the shared error response contract", () => {
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  notFoundHandler({}, response);

  assert.equal(statusCode, 404);
  assert.deepEqual(body, {
    success: false,
    error: "Not found.",
    code: "NOT_FOUND",
  });
});
