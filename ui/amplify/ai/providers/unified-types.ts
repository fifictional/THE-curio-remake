/**
 * Unified response output item - provider-agnostic representation
 * of model response content
 */
export type UnifiedResponseOutputItem =
  | UnifiedResponseMessage
  | UnifiedFunctionCall
  | UnifiedWebSearchCall
  | UnifiedReasoningItem
  | UnifiedCodeInterpreterCall
  | UnifiedFileSearchCall
  | UnifiedImageOutput
  | UnifiedAudioOutput;

/**
 * Unified message output
 */
export interface UnifiedResponseMessage {
  type: 'message';
  id: string;
  role: 'assistant';
  content: UnifiedMessageContent[];
  status?: 'in_progress' | 'completed' | 'incomplete';
}

export type UnifiedMessageContent =
  | UnifiedOutputText
  | UnifiedRefusal;

export interface UnifiedOutputText {
  type: 'output_text';
  text: string;
  annotations?: UnifiedAnnotation[];
}

export interface UnifiedRefusal {
  type: 'refusal';
  refusal: string;
}

export interface UnifiedAnnotation {
  type: 'file_citation' | 'url_citation' | 'container_file_citation';
  file_id?: string;
  url?: string;
  title?: string;
  filename?: string;
  start_index?: number;
  end_index?: number;
  container_id?: string;
}

/**
 * Unified function call
 */
export interface UnifiedFunctionCall {
  type: 'function_call';
  id: string;
  call_id: string;
  name: string;
  arguments: string; // JSON string (normalized from both providers)
  status?: 'in_progress' | 'completed' | 'incomplete';
}

/**
 * Unified web search call
 */
export interface UnifiedWebSearchCall {
  type: 'web_search_call';
  id: string;
  status: 'in_progress' | 'searching' | 'completed' | 'failed';
}

/**
 * Unified reasoning item
 */
export interface UnifiedReasoningItem {
  type: 'reasoning';
  id: string;
  // Reasoning content is typically encrypted or not exposed
}

/**
 * Unified code interpreter call
 */
export interface UnifiedCodeInterpreterCall {
  type: 'code_interpreter_call';
  id: string;
  container_id?: string;
  outputs?: Array<{
    type: string;
    file_id?: string;
    [key: string]: any;
  }>;
}

/**
 * Unified file search call
 */
export interface UnifiedFileSearchCall {
  type: 'file_search_call';
  id: string;
  vector_store_ids: string[];
  results?: Array<{
    file_id: string;
    score?: number;
    [key: string]: any;
  }>;
}

/**
 * Unified image output - for image generation responses
 */
export interface UnifiedImageOutput {
  type: 'image_output';
  id: string;
  /**
   * Base64 encoded image data
   */
  imageBase64: string;
  /**
   * Optional text response from the model (if any)
   */
  text?: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
}

/**
 * Unified audio output - for audio generation responses
 */
export interface UnifiedAudioOutput {
  type: 'audio_output';
  id: string;
  /**
   * Base64 encoded audio data
   */
  audioBase64: string;
  /**
   * MIME type of the audio (e.g., 'audio/pcm16', 'audio/mpeg')
   */
  mimeType: string;
  status?: 'in_progress' | 'completed' | 'incomplete';
}

/**
 * Unified streaming event - provider-agnostic event representation
 */
export type UnifiedStreamEvent =
  | UnifiedRawEvent
  | UnifiedTextDeltaEvent
  | UnifiedOutputItemAddedEvent
  | UnifiedAnnotationAddedEvent
  | UnifiedCompletionEvent
  | UnifiedAudioChunkEvent;

export interface UnifiedTextDeltaEvent {
  type: 'text_delta';
  delta: string;
  sequenceNumber: number;
}

export interface UnifiedOutputItemAddedEvent {
  type: 'output_item_added';
  item: UnifiedResponseOutputItem;
  outputIndex: number;
  sequenceNumber: number;
}

export interface UnifiedAnnotationAddedEvent {
  type: 'annotation_added';
  annotation: UnifiedAnnotation;
  itemId: string;
  outputIndex: number;
  contentIndex: number;
  annotationIndex: number;
}

export interface UnifiedCompletionEvent {
  type: 'completion';
  status?: 'completed' | 'failed';
  error?: string;
  usage?: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number;
    cachedTokens?: number;
  };
}

export interface UnifiedAudioChunkEvent {
  type: 'audio_chunk';
  audio: string; // base64 encoded
  format: string; // e.g., 'pcm16'
  sequenceNumber: number;
  finished?: boolean;
}

/**
 * Raw event from provider - for debugging purposes
 * Contains the raw packet/data from the AI provider before any processing
 */
export interface UnifiedRawEvent {
  type: 'raw_event';
  provider: string; // e.g., 'gemini', 'gpt', etc.
  rawData: any; // Raw packet/chunk from the provider
  timestamp: number;
}
