/**
 * Job registry - central registry for creator and mutator definitions
 */

import { CreatorDefinition, MutatorDefinition, JobRegistry } from './types';

// Global registry instance
const registry: JobRegistry = {
  creators: new Map(),
  mutators: new Map(),
};

/**
 * Register a creator definition
 */
export function registerCreator(definition: CreatorDefinition): void {
  if (registry.creators.has(definition.jobType)) {
    throw new Error(`Creator with jobType "${definition.jobType}" already registered`);
  }
  registry.creators.set(definition.jobType, definition);
}

/**
 * Register a mutator definition
 */
export function registerMutator(definition: MutatorDefinition): void {
  if (registry.mutators.has(definition.jobType)) {
    throw new Error(`Mutator with jobType "${definition.jobType}" already registered`);
  }
  registry.mutators.set(definition.jobType, definition);
}

/**
 * Get a creator definition by jobType
 */
export function getCreator(jobType: string): CreatorDefinition | undefined {
  return registry.creators.get(jobType);
}

/**
 * Get a mutator definition by jobType
 */
export function getMutator(jobType: string): MutatorDefinition | undefined {
  return registry.mutators.get(jobType);
}

/**
 * List all registered creators
 */
export function listCreators(): CreatorDefinition[] {
  return Array.from(registry.creators.values());
}

/**
 * Check if a creator exists
 */
export function hasCreator(jobType: string): boolean {
  return registry.creators.has(jobType);
}

/**
 * Check if a mutator exists
 */
export function hasMutator(jobType: string): boolean {
  return registry.mutators.has(jobType);
}

