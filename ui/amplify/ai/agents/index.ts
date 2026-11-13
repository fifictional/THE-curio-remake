/**
 * Agent system for orchestrating AI model calls and agent-to-agent communication
 * 
 * @example
 * ```typescript
 * import { BaseAgent, orchestrator } from './agents';
 * 
 * class MyAgent extends BaseAgent {
 *   name = 'my-agent';
 *   description = 'Does something useful';
 * 
 *   async execute(input, context) {
 *     const result = await this.callAI(input, context, {
 *       model: 'gpt',
 *       category: 'chat',
 *       feature: 'my-feature',
 *       prompt: 'You are a helpful assistant',
 *       userTier: input.userTier,
 *     });
 * 
 *     if (result.error) {
 *       return this.createResponse(`Error: ${result.error}`);
 *     }
 * 
 *     return this.createResponse(result.responseText || 'No response');
 *   }
 * }
 * 
 * orchestrator.register(new MyAgent());
 * 
 * const output = await orchestrator.execute('my-agent', {
 *   userUuid: '...',
 *   userTier: 'ultra',
 *   text: 'Hello!',
 * }, {
 *   saveTokenData: async (data) => { ... },
 *   cloudwatchClient: new CloudWatchClient({}),
 * });
 * ```
 */

export * from './types';
export * from './base-agent';
export * from './orchestrator';
export * from '../ai-client';
export * from './document-summary-agent';
export * from './flashcard-generation-agent';
export * from './document-categorisation-agent';
export * from './document-file-type-detection-agent';
export * from './image-generation';

