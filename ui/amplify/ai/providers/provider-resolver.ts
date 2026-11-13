import { ModelProvider } from "./types";

/**
 * Model registration entry
 */
interface ModelRegistration {
  model: string;
  label: string;
  inputFeatures?: string; // Input capabilities (T=text, I=image, A=audio, V=video)
  outputFeatures?: string; // Output capabilities (T=text, I=image, A=audio, V=video)
  provider: ModelProvider;
}

/**
 * ProviderResolver - Central registry for all AI model providers
 * 
 * Providers register themselves with their supported models when instantiated.
 * This is the single source of truth for model-to-provider mappings.
 */
export class ProviderResolver {
  private static instance: ProviderResolver | null = null;
  private modelMap: Map<string, ModelRegistration> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of ProviderResolver
   */
  static getInstance(): ProviderResolver {
    if (!ProviderResolver.instance) {
      ProviderResolver.instance = new ProviderResolver();
    }
    return ProviderResolver.instance;
  }

  /**
   * Register a provider with its supported models
   * @param provider The provider instance
   * @param models Array of { model, label, inputFeatures?, outputFeatures? } objects for each model this provider supports
   */
  register(provider: ModelProvider, models: ReadonlyArray<{ readonly model: string; readonly label: string; readonly inputFeatures?: string; readonly outputFeatures?: string }>): void {
    for (const { model, label, inputFeatures, outputFeatures } of models) {
      if (this.modelMap.has(model)) {
        throw new Error(`Model ${model} is already registered with another provider`);
      }
      this.modelMap.set(model, {
        model,
        label,
        inputFeatures,
        outputFeatures,
        provider,
      });
    }
  }

  /**
   * Get the provider for a given model
   * @param model The model name
   * @returns The provider instance, or null if model is not supported
   */
  getProviderForModel(model: string): ModelProvider | null {
    const registration = this.modelMap.get(model);
    return registration?.provider || null;
  }

  /**
   * Check if a model is supported
   * @param model The model name
   * @returns True if the model is supported
   */
  isModelSupported(model: string): boolean {
    return this.modelMap.has(model);
  }

  /**
   * Get all supported models as an array of strings
   * @returns Array of model names
   */
  getAllSupportedModels(): string[] {
    return Array.from(this.modelMap.keys());
  }

  /**
   * Get all models formatted for UI display (e.g., dropdowns, selects)
   * @returns Array of { value, label } objects
   */
  getModelsForUI(): Array<{ value: string; label: string }> {
    return Array.from(this.modelMap.values()).map(({ model, label }) => ({
      value: model,
      label,
    }));
  }

  /**
   * Get the label for a specific model
   * @param model The model name
   * @returns The label, or null if model is not supported
   */
  getModelLabel(model: string): string | null {
    const registration = this.modelMap.get(model);
    return registration?.label || null;
  }

  /**
   * Get the input features for a specific model
   * @param model The model name
   * @returns The input features string (T=text, I=image, A=audio, V=video), or null if model is not supported or features not available
   */
  getModelInputFeatures(model: string): string | null {
    const registration = this.modelMap.get(model);
    return registration?.inputFeatures || null;
  }

  /**
   * Get the output features for a specific model
   * @param model The model name
   * @returns The output features string (T=text, I=image, A=audio, V=video), or null if model is not supported or features not available
   */
  getModelOutputFeatures(model: string): string | null {
    const registration = this.modelMap.get(model);
    return registration?.outputFeatures || null;
  }

  /**
   * Clear all registered models (useful for testing)
   */
  clear(): void {
    this.modelMap.clear();
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    ProviderResolver.instance = null;
  }
}

