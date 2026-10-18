export interface ErrorEnvelope {
  success: false;
  message: string;
  data: null;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationEnvelope extends ErrorEnvelope {
  errors: FieldError[];
}

export function errorEnvelope(message: string): ErrorEnvelope {
  return { success: false, message, data: null };
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly expose: boolean;

  constructor(message: string, statusCode = 500, expose: boolean = statusCode < 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export class ValidationError extends AppError {
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super("Data yang dikirim tidak valid", 422);
    this.name = "ValidationError";
    this.errors = errors;
  }
}
