// Base error class for all custom errors
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Content and document related errors
export class ContentNotFoundError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

// AI/Request related errors
export class NoResponseError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ParseError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

// Generation specific errors
export class FlashcardGenerationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class NoFlashcardGenerated extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

export class QuizGenerationError extends BaseError {
  constructor(message: string) {
    super(message);
  }
}

// Export all errors for easy importing
export const Errors = {
  BaseError,
  ContentNotFoundError,
  NoResponseError,
  ParseError,
  ValidationError,
  FlashcardGenerationError,
  QuizGenerationError,
  NoFlashcardGenerated,
};

// Default export - export ContentNotFoundError as default for backward compatibility
export default ContentNotFoundError;