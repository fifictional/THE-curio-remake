import { AllModels } from "@ai-providers/all-models";

export class CurioRateLimitError extends Error {
  constructor(public status: number, public model: AllModels, public originalError: Error, public headers: Headers) {
    super('Rate limit exceeded');
  }
}
