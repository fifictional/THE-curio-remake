'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Sparkles, X, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

type FileAttachmentType = 'pdf' | 'image' | 'text' | 'audio';

/**
 * Convert PCM16 audio data to WAV format
 */
function pcmToWav(pcmData: Uint8Array, sampleRate: number, channels: number): ArrayBuffer {
  const length = pcmData.length;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true); // byte rate
  view.setUint16(32, channels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, length, true);
  
  // Copy PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);
  
  return buffer;
}

interface FileAttachment {
  id: string;
  file: File;
  type: FileAttachmentType;
  base64?: string;
}

function detectFileType(file: File): FileAttachmentType {
  // Check MIME type first
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)) {
    return 'image';
  }
  if (mimeType.includes('audio') || /\.(mp3|wav|aac)$/i.test(file.name)) {
    return 'audio';
  }
  if (mimeType.includes('text') || /\.(txt|md)$/i.test(file.name)) {
    return 'text';
  }
  
  // Fallback to extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['mp3', 'wav', 'aac'].includes(ext || '')) return 'audio';
  if (['txt', 'md'].includes(ext || '')) return 'text';
  
  // Default to text for unknown types
  return 'text';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse features string and return human-readable feature names
 * Features: T=Text, I=Image, A=Audio, V=Video
 */
function parseFeatures(features: string | null): string[] {
  if (!features) return [];
  
  const featureMap: Record<string, string> = {
    'T': 'Text',
    'I': 'Image',
    'A': 'Audio',
    'V': 'Video',
  };
  
  return features
    .split('')
    .map(char => featureMap[char])
    .filter(Boolean);
}

interface VoiceMapping {
  curioId: string;
  curioDescription: string;
  providerVoice: string | null;
}

type ResponseChunkType = 'text' | 'audio' | 'image';

interface ResponseChunk {
  id: string;
  type: ResponseChunkType;
  content: string; // For text: the text content, for audio/image: the URL
  finished?: boolean; // For audio chunks
}

const DEFAULT_VOICE = 'neutral-balanced';
const TEXT_ONLY_VOICE = 'text-only';

export default function AIPlaygroundPage() {
  const [models, setModels] = useState<Array<{ value: string; label: string; inputFeatures: string | null; outputFeatures: string | null }>>([]);
  const [prompt, setPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [voiceMappings, setVoiceMappings] = useState<VoiceMapping[]>([]);
  const [responseChunks, setResponseChunks] = useState<ResponseChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [streamChunks, setStreamChunks] = useState<Array<{ event: string | null; dataType: string; timestamp: number; data?: any }>>([]);
  const [generateRawEvents, setGenerateRawEvents] = useState<boolean>(false);
  const [sendUserPromptAsMessage, setSendUserPromptAsMessage] = useState<boolean>(false);
  const responseRef = useRef<HTMLDivElement>(null);

  // Fetch voice mappings when model changes or models are loaded
  useEffect(() => {
    const fetchVoiceMappings = async () => {
      if (!selectedModel || models.length === 0) {
        setVoiceMappings([]);
        return;
      }

      const selectedModelData = models.find(m => m.value === selectedModel);
      if (!selectedModelData) {
        setVoiceMappings([]);
        return;
      }

      const outputFeatures = selectedModelData.outputFeatures || '';
      const supportsAudioOutput = outputFeatures.includes('A');
      const supportsTextOutput = outputFeatures.includes('T');
      const supportsBothTextAndAudio = supportsAudioOutput && supportsTextOutput;

      if (!supportsAudioOutput) {
        setVoiceMappings([]);
        setVoice(DEFAULT_VOICE);
        return;
      }

      try {
        const res = await fetch(`/api/admin/ai-playground?model=${encodeURIComponent(selectedModel)}`);
        if (res.ok) {
          const data = await res.json();
          const voices = data.voices || [];
          console.log(`Fetched voice mappings for ${selectedModel}:`, {
            count: voices.length,
            sample: voices[0] || 'none',
          });
          setVoiceMappings(voices);
          // Reset to first available voice or default
          // If model supports both text and audio, default to "Text Only"
          if (supportsBothTextAndAudio) {
            setVoice(TEXT_ONLY_VOICE);
          } else if (voices.length > 0) {
            const firstVoice = voices.find((v: VoiceMapping) => v.curioId === DEFAULT_VOICE) || voices[0];
            setVoice(firstVoice.curioId);
          } else {
            console.warn(`No voices found for model ${selectedModel} (supports audio: ${supportsAudioOutput})`);
            setVoice(DEFAULT_VOICE);
          }
        } else {
          const errorText = await res.text();
          console.error('Failed to fetch voice mappings:', res.status, errorText);
          setVoiceMappings([]);
        }
      } catch (err) {
        console.error('Error fetching voice mappings:', err);
        setVoiceMappings([]);
      }
    };

    fetchVoiceMappings();
  }, [selectedModel, models]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/admin/ai-playground');
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
          if (data.models && data.models.length > 0) {
            setSelectedModel(data.models[0].value);
          }
        } else {
          setError('Failed to load models');
        }
      } catch (err) {
        setError('Failed to load models');
        console.error('Error fetching models:', err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when response chunks update
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [responseChunks]);

  const handleSend = async () => {
    if ((!prompt.trim() && !userPrompt.trim()) || !selectedModel) return;

    const startTime = Date.now();
    setIsLoading(true);
    setError(null);
    setResponseChunks([]);
    setDuration(null);
    setStreamChunks([]);

    try {
      // Convert all attachments to base64
      // Backend will decide whether to upload to OpenAI Files API or use base64 directly
      const processedFiles = await Promise.all(
        attachments.map(async (att) => ({
          name: att.file.name,
          type: att.type,
          mimeType: att.file.type,
          base64: att.base64 || await fileToBase64(att.file),
        }))
      );

      // Check if model supports audio output
      const selectedModelData = models.find(m => m.value === selectedModel);
      const outputFeatures = selectedModelData?.outputFeatures || '';
      const supportsAudioOutput = outputFeatures.includes('A');

      const res = await fetch('/api/admin/ai-playground', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt.trim(),
          userPrompt: userPrompt.trim() || undefined,
          sendUserPromptAsMessage: sendUserPromptAsMessage,
          files: processedFiles,
          // Only include voice if it's set and not "text-only"
          ...(supportsAudioOutput && voice && voice !== TEXT_ONLY_VOICE && { voice }),
          generateRawEvents: generateRawEvents,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent: string | null = null;
      let accumulatedText = ''; // For displaying accumulated text in response area
      let accumulatedAudioChunks: string[] = []; // For audio chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Capture event for stream display (1:1 mapping)
              setStreamChunks((prev) => [
                ...prev,
                {
                  event: currentEvent,
                  dataType: data.type || 'unknown',
                  timestamp: Date.now(),
                  data: data,
                },
              ]);
              
              if (data.error) {
                setError(data.error);
                setDuration(Date.now() - startTime);
                setIsLoading(false);
                return;
              }
              
              // Handle unified event types
              if (data.type === 'text_delta') {
                // Display the delta text directly (not accumulated)
                const deltaText = data.delta || '';
                if (deltaText) {
                  // Accumulate for response display
                  accumulatedText += deltaText;
                  
                  // Update response chunks with accumulated text
                  setResponseChunks((prev) => {
                    const lastChunk = prev[prev.length - 1];
                    if (lastChunk && lastChunk.type === 'text') {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastChunk, content: accumulatedText },
                      ];
                    } else {
                      return [
                        ...prev,
                        { id: `${Date.now()}-${Math.random()}`, type: 'text' as const, content: accumulatedText },
                      ];
                    }
                  });
                }
              } else if (data.type === 'output_item_added') {
                // Handle output items (messages, images, etc.)
                const item = data.item;
                
                if (item.type === 'message') {
                  // Extract text from message content
                  let messageText = '';
                  if (item.content && Array.isArray(item.content)) {
                    for (const content of item.content) {
                      if (content.type === 'output_text' && content.text) {
                        messageText += content.text;
                      }
                    }
                  }
                  
                  if (messageText) {
                    accumulatedText = messageText;
                    setResponseChunks((prev) => {
                      const lastChunk = prev[prev.length - 1];
                      if (lastChunk && lastChunk.type === 'text') {
                        return [
                          ...prev.slice(0, -1),
                          { ...lastChunk, content: accumulatedText },
                        ];
                      } else {
                        return [
                          ...prev,
                          { id: `${Date.now()}-${Math.random()}`, type: 'text' as const, content: accumulatedText },
                        ];
                      }
                    });
                  }
                } else if (item.type === 'image_output') {
                  // Handle image output
                  const imageBase64 = item.imageBase64;
                  if (imageBase64) {
                    const imageUrl = `data:image/png;base64,${imageBase64}`;
                    setResponseChunks((prev) => [
                      ...prev,
                      { id: `${Date.now()}-${Math.random()}`, type: 'image' as const, content: imageUrl },
                    ]);
                  }
                }
              } else if (data.type === 'audio_chunk') {
                // Handle audio chunks
                const audioData = data.audio;
                if (audioData) {
                  accumulatedAudioChunks.push(audioData);
                  
                  // Process audio when finished
                  if (data.finished) {
                    try {
                      const format = data.format || 'pcm16';
                      const accumulatedAudio = accumulatedAudioChunks.join('');
                      
                      let audioUrl: string;
                      if (format === 'pcm16') {
                        const pcmData = Uint8Array.from(atob(accumulatedAudio), c => c.charCodeAt(0));
                        if (pcmData.length > 0) {
                          const wav = pcmToWav(pcmData, 24000, 1);
                          const blob = new Blob([wav], { type: 'audio/wav' });
                          audioUrl = URL.createObjectURL(blob);
                        } else {
                          continue;
                        }
                      } else {
                        const audioDataBytes = Uint8Array.from(atob(accumulatedAudio), c => c.charCodeAt(0));
                        if (audioDataBytes.length > 0) {
                          const blob = new Blob([audioDataBytes], { type: 'audio/mpeg' });
                          audioUrl = URL.createObjectURL(blob);
                        } else {
                          continue;
                        }
                      }
                      
                      setResponseChunks((prev) => {
                        const lastChunk = prev[prev.length - 1];
                        if (lastChunk && lastChunk.type === 'audio' && lastChunk.content) {
                          try {
                            URL.revokeObjectURL(lastChunk.content);
                          } catch (e) {
                            // Ignore errors
                          }
                        }
                        return [
                          ...prev.filter(c => c.type !== 'audio'),
                          { id: `${Date.now()}-${Math.random()}`, type: 'audio' as const, content: audioUrl, finished: true },
                        ];
                      });
                      
                      setDuration(Date.now() - startTime);
                      setIsLoading(false);
                    } catch (e) {
                      console.error('Error processing audio:', e);
                      setError(`Failed to process audio response: ${e instanceof Error ? e.message : String(e)}`);
                      setDuration(Date.now() - startTime);
                      setIsLoading(false);
                    }
                  }
                }
              } else if (data.type === 'completion') {
                // Stream is complete
                setDuration(Date.now() - startTime);
                setIsLoading(false);
              }
            } catch (e) {
              // Ignore JSON parse errors for malformed data lines
              console.warn('Failed to parse SSE data:', e);
            }
          } else if (line.trim() === '') {
            // Empty line resets event
            currentEvent = null;
          }
        }
      }

      setDuration(Date.now() - startTime);
      setIsLoading(false);
    } catch (err) {
      setDuration(Date.now() - startTime);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newAttachments: FileAttachment[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: detectFileType(file),
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'audio/*': ['.mp3', '.wav', '.aac'],
    },
    multiple: true,
  });

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const updateAttachmentType = (id: string, type: FileAttachmentType) => {
    setAttachments((prev) =>
      prev.map((att) => (att.id === id ? { ...att, type } : att))
    );
  };

  return (
    <div className="container p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">AI Playground</h1>
          <p className="text-sm text-muted-foreground">
            Direct access to AI models for fast iteration
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <label htmlFor="model-select" className="text-sm font-medium min-w-[80px]">
              Model:
            </label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="w-[350px]"
              placeholder="Select a model"
            >
              {models.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          {/* Curio Voice Selection (only for audio output models) */}
          {(() => {
            if (!selectedModel) return null;
            
            const selectedModelData = models.find(m => m.value === selectedModel);
            const outputFeatures = selectedModelData?.outputFeatures || '';
            const supportsAudioOutput = outputFeatures.includes('A');
            
            if (!supportsAudioOutput) {
              return null;
            }
            
            // Show loading state while fetching voice mappings
            if (voiceMappings.length === 0) {
              return (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium min-w-[80px]">
                    Curio Voice:
                  </label>
                  <div className="text-sm text-muted-foreground">Loading voices...</div>
                </div>
              );
            }
            
            const supportsTextOutput = outputFeatures.includes('T');
            const supportsBothTextAndAudio = supportsAudioOutput && supportsTextOutput;

            return (
              <div className="flex items-center gap-4">
                <label htmlFor="voice-select" className="text-sm font-medium min-w-[80px]">
                  Curio Voice:
                </label>
                <Select
                  value={voice}
                  onValueChange={setVoice}
                  className="w-[500px]"
                  disabled={isLoading}
                >
                  {supportsBothTextAndAudio && (
                    <SelectItem key={TEXT_ONLY_VOICE} value={TEXT_ONLY_VOICE}>
                      Text Only
                    </SelectItem>
                  )}
                  {voiceMappings.map((voiceMapping) => (
                    <SelectItem key={voiceMapping.curioId} value={voiceMapping.curioId}>
                      {voiceMapping.curioId} ({voiceMapping.providerVoice}) - {voiceMapping.curioDescription}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            );
          })()}
          
          {/* Model Features */}
          {selectedModel && (() => {
            const selectedModelData = models.find(m => m.value === selectedModel);
            const inputFeatures = selectedModelData?.inputFeatures;
            const outputFeatures = selectedModelData?.outputFeatures;
            const inputList = parseFeatures(inputFeatures || null);
            const outputList = parseFeatures(outputFeatures || null);
            
            if (inputList.length > 0 || outputList.length > 0) {
              return (
                <div className="ml-[88px] space-y-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Input:</div>
                    <div className="flex flex-wrap gap-2">
                      {inputList.length > 0 ? (
                        inputList.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Output:</div>
                    <div className="flex flex-wrap gap-2">
                      {outputList.length > 0 ? (
                        outputList.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Prompt Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="prompt-input" className="text-sm font-medium">
              System Prompt:
            </label>
            <Textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your system prompt here..."
              className="min-h-[150px] font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user-prompt-input" className="text-sm font-medium">
              User Prompt:
            </label>
            <Textarea
              id="user-prompt-input"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your user prompt here..."
              className="min-h-[150px] font-mono text-sm"
              disabled={isLoading}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-as-message"
                checked={sendUserPromptAsMessage}
                onCheckedChange={(checked) => setSendUserPromptAsMessage(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="send-as-message"
                className="text-sm font-medium cursor-pointer"
              >
                Send as message (instead of user content)
              </label>
            </div>
          </div>
          
          {/* File Attachments */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attachments:
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center text-sm text-muted-foreground">
                {isDragActive ? (
                  <p>Drop files here...</p>
                ) : (
                  <p>
                    Drag & drop files here, or click to select
                  </p>
                )}
                <p className="text-xs mt-1">
                  Supported: PDF, Images (PNG, JPG, GIF, WebP), Text (TXT, MD), Audio (MP3, WAV, AAC)
                </p>
              </div>
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50"
                  >
                    <span className="text-sm flex-1 truncate">{att.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(att.file.size / 1024).toFixed(1)}KB
                    </span>
                    <Select
                      value={att.type}
                      onValueChange={(value) =>
                        updateAttachmentType(att.id, value as FileAttachmentType)
                      }
                      disabled={isLoading}
                    >
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(att.id)}
                      disabled={isLoading}
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debug Options */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="generate-raw-events"
              checked={generateRawEvents}
              onCheckedChange={(checked) => setGenerateRawEvents(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="generate-raw-events"
              className="text-sm font-medium cursor-pointer"
            >
              Generate Raw Events (for debugging)
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={(!prompt.trim() && !userPrompt.trim()) || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Response Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Response:</label>
            {duration !== null && (
              <span className="text-xs text-muted-foreground">
                Completed in {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`}
              </span>
            )}
          </div>
          <div
            ref={responseRef}
            className="border rounded-lg p-4 bg-muted/50 min-h-[400px] max-h-[600px] overflow-y-auto"
          >
            {error ? (
              <div className="text-destructive">{error}</div>
            ) : (
              <div className="space-y-4">
                {/* Render chunks in order */}
                {responseChunks.length > 0 ? (
                  responseChunks.map((chunk) => {
                    if (chunk.type === 'text') {
                      return (
                        <div key={chunk.id} className="font-mono text-sm whitespace-pre-wrap">
                          {chunk.content}
                        </div>
                      );
                    } else if (chunk.type === 'audio') {
                      return (
                        <div key={chunk.id} className="flex flex-col items-center justify-center gap-4 py-4 border-t border-b">
                          <div className="text-sm font-medium">Audio Generated</div>
                          <audio controls src={chunk.content} className="w-full max-w-md">
                            Your browser does not support the audio element.
                          </audio>
                          <a
                            href={chunk.content}
                            download={`audio-${Date.now()}.mp3`}
                            className="text-sm text-primary hover:underline"
                          >
                            Download Audio
                          </a>
                        </div>
                      );
                    } else if (chunk.type === 'image') {
                      return (
                        <div key={chunk.id} className="flex flex-col items-center justify-center gap-4 py-4 border-t border-b">
                          <div className="text-sm font-medium">Image Generated</div>
                          <img
                            src={chunk.content}
                            alt="Generated image"
                            className="max-w-full h-auto rounded-lg border"
                          />
                          <a
                            href={chunk.content}
                            download={`image-${Date.now()}.png`}
                            className="text-sm text-primary hover:underline"
                          >
                            Download Image
                          </a>
                        </div>
                      );
                    }
                    return null;
                  })
                ) : (
                  // Loading or Empty State
                  isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>Waiting for response...</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      Response will appear here...
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stream Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Stream:</label>
          <div className="border rounded-lg p-4 bg-muted/50 min-h-[200px] max-h-[400px] overflow-y-auto">
            {streamChunks.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Stream chunks will appear here...
              </div>
            ) : (
              <div className="space-y-1.5">
                {streamChunks.map((chunk, index) => {
                  const dataSize = chunk.data 
                    ? new Blob([JSON.stringify(chunk.data)]).size 
                    : 0;
                  const formatSize = (bytes: number) => {
                    if (bytes < 1024) return `${bytes}B`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
                  };
                  
                  // Extract text preview for text_delta events (truncated for display)
                  const textPreview = chunk.dataType === 'text_delta' && chunk.data?.delta
                    ? chunk.data.delta
                    : null;
                  
                  // Truncate text preview to reasonable length (e.g., 100 chars)
                  const truncatedText = textPreview && textPreview.length > 100
                    ? textPreview.substring(0, 100) + '...'
                    : textPreview;
                  
                  // Extract full message content for output_item_added message events
                  const fullMessageContent = chunk.dataType === 'output_item_added' && chunk.data?.item?.type === 'message'
                    ? (() => {
                        const item = chunk.data.item;
                        if (item.content && Array.isArray(item.content)) {
                          return item.content
                            .filter((c: any) => c.type === 'output_text')
                            .map((c: any) => c.text)
                            .join('');
                        }
                        return null;
                      })()
                    : null;
                  
                  // Extract refusal content if present
                  const refusalContent = chunk.dataType === 'output_item_added' && chunk.data?.item?.type === 'message'
                    ? (() => {
                        const item = chunk.data.item;
                        if (item.content && Array.isArray(item.content)) {
                          const refusal = item.content.find((c: any) => c.type === 'refusal');
                          return refusal?.refusal || null;
                        }
                        return null;
                      })()
                    : null;
                  
                  // Extract completion event information (for debugging)
                  // Note: We now render completion events directly below, but keep this for reference
                  
                  // Extract raw event data for debugging
                  const rawEventData = chunk.dataType === 'raw_event' && chunk.data
                    ? chunk.data
                    : null;
                  
                  // Extract output_item_added details
                  const outputItemDetails = chunk.dataType === 'output_item_added' && chunk.data?.item
                    ? (() => {
                        const item = chunk.data.item;
                        const details: Record<string, any> = {
                          itemType: item.type,
                          outputIndex: chunk.data.outputIndex,
                          sequenceNumber: chunk.data.sequenceNumber,
                        };
                        
                        switch (item.type) {
                          case 'function_call':
                            details.functionName = item.name;
                            details.callId = item.call_id;
                            details.status = item.status;
                            try {
                              const args = JSON.parse(item.arguments);
                              details.arguments = Object.keys(args).length > 0 ? args : null;
                            } catch {
                              details.arguments = null;
                            }
                            break;
                          case 'web_search_call':
                            details.status = item.status;
                            break;
                          case 'reasoning':
                            // Reasoning content is typically not exposed, but show the ID
                            details.reasoningId = item.id;
                            break;
                          case 'code_interpreter_call':
                            details.containerId = item.container_id;
                            details.hasOutputs = item.outputs && item.outputs.length > 0;
                            details.outputCount = item.outputs?.length || 0;
                            break;
                          case 'file_search_call':
                            details.vectorStoreIds = item.vector_store_ids;
                            details.hasResults = item.results && item.results.length > 0;
                            details.resultCount = item.results?.length || 0;
                            break;
                          case 'image_output':
                            details.status = item.status;
                            details.hasText = !!item.text;
                            break;
                          case 'message':
                            details.status = item.status;
                            details.hasContent = item.content && item.content.length > 0;
                            break;
                        }
                        
                        return details;
                      })()
                    : null;
                  
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-1.5 text-xs font-mono border-b border-border/30 pb-1.5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground min-w-[40px]">
                          #{index + 1}
                        </span>
                        <span className="text-muted-foreground min-w-[100px]">
                          {new Date(chunk.timestamp).toLocaleTimeString()}
                        </span>
                        {/* Only show event badge if it's different from dataType, otherwise just show dataType */}
                        {chunk.event && chunk.event !== chunk.dataType ? (
                          <Badge variant="outline" className="text-xs min-w-[120px]">
                            {chunk.event}
                          </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-xs min-w-[80px]">
                          {chunk.dataType}
                        </Badge>
                        {outputItemDetails && (
                          <Badge variant="outline" className="text-xs">
                            {outputItemDetails.itemType}
                          </Badge>
                        )}
                        <span className="text-muted-foreground">
                          {formatSize(dataSize)}
                        </span>
                      </div>
                      {truncatedText && (
                        <div className="pl-0 text-xs break-words max-w-full overflow-hidden">
                          <span className="font-semibold text-muted-foreground">Text Delta: </span>
                          <span className="whitespace-pre-wrap text-muted-foreground">{truncatedText}</span>
                        </div>
                      )}
                      {fullMessageContent && (
                        <div className="pl-0 text-xs break-words max-w-full overflow-hidden">
                          <span className="font-semibold text-muted-foreground">Message Content: </span>
                          <span className="whitespace-pre-wrap text-muted-foreground">{fullMessageContent}</span>
                        </div>
                      )}
                      {refusalContent && (
                        <div className="pl-0 text-xs break-words max-w-full overflow-hidden">
                          <span className="font-semibold text-muted-foreground">Refusal: </span>
                          <span className="whitespace-pre-wrap text-muted-foreground">{refusalContent}</span>
                        </div>
                      )}
                      {chunk.dataType === 'completion' && (
                        <div className="pl-0 text-xs space-y-1 break-words max-w-full overflow-hidden">
                          {/* Always show completion event details */}
                          {chunk.data?.status ? (
                            <div className="mb-2">
                              <span className="font-semibold text-muted-foreground">Status: </span>
                              <Badge variant={chunk.data.status === 'failed' ? 'destructive' : 'default'} className="text-xs">
                                {chunk.data.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className="mb-2 text-muted-foreground italic">
                              Status: not provided
                            </div>
                          )}
                          {chunk.data?.error ? (
                            <div className="mb-2">
                              <span className="font-semibold text-destructive">Error: </span>
                              <span className="text-destructive whitespace-pre-wrap">{chunk.data.error}</span>
                            </div>
                          ) : null}
                          {chunk.data?.usage ? (
                            <div>
                              <div className="font-semibold text-muted-foreground mb-1">Token Usage:</div>
                              <div className="flex flex-wrap gap-3 text-muted-foreground">
                                {chunk.data.usage.totalTokens !== undefined && (
                                  <span>
                                    <span className="font-semibold">Total:</span> {chunk.data.usage.totalTokens.toLocaleString()}
                                  </span>
                                )}
                                {chunk.data.usage.inputTokens !== undefined && (
                                  <span>
                                    <span className="font-semibold">Input:</span> {chunk.data.usage.inputTokens.toLocaleString()}
                                  </span>
                                )}
                                {chunk.data.usage.outputTokens !== undefined && (
                                  <span>
                                    <span className="font-semibold">Output:</span> {chunk.data.usage.outputTokens.toLocaleString()}
                                  </span>
                                )}
                                {chunk.data.usage.reasoningTokens !== undefined && (
                                  <span>
                                    <span className="font-semibold">Reasoning:</span> {chunk.data.usage.reasoningTokens.toLocaleString()}
                                  </span>
                                )}
                                {chunk.data.usage.cachedTokens !== undefined && (
                                  <span>
                                    <span className="font-semibold">Cached:</span> {chunk.data.usage.cachedTokens.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                      {rawEventData && (
                        <div className="pl-0 text-xs break-words max-w-full overflow-hidden">
                          <div className="font-semibold text-muted-foreground mb-1">Raw Event Data:</div>
                          <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-96 font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(rawEventData.rawData, null, 2)}
                          </pre>
                        </div>
                      )}
                      {outputItemDetails && (
                        <div className="pl-0 text-xs space-y-1 break-words max-w-full overflow-hidden">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-muted-foreground">
                              <span className="font-semibold">Output Index:</span> {outputItemDetails.outputIndex}
                            </span>
                            <span className="text-muted-foreground">
                              <span className="font-semibold">Sequence:</span> {outputItemDetails.sequenceNumber}
                            </span>
                            {outputItemDetails.status && (
                              <span className="text-muted-foreground">
                                <span className="font-semibold">Status:</span> {outputItemDetails.status}
                              </span>
                            )}
                          </div>
                          {outputItemDetails.functionName && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Function:</span> {outputItemDetails.functionName}
                              {outputItemDetails.callId && (
                                <span className="ml-2">(ID: {outputItemDetails.callId})</span>
                              )}
                            </div>
                          )}
                          {outputItemDetails.arguments && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Arguments:</span>{' '}
                              <span className="font-mono text-xs">
                                {JSON.stringify(outputItemDetails.arguments, null, 2).substring(0, 200)}
                                {JSON.stringify(outputItemDetails.arguments).length > 200 ? '...' : ''}
                              </span>
                            </div>
                          )}
                          {outputItemDetails.containerId && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Container ID:</span> {outputItemDetails.containerId}
                            </div>
                          )}
                          {outputItemDetails.hasOutputs !== undefined && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Outputs:</span> {outputItemDetails.outputCount} item(s)
                            </div>
                          )}
                          {outputItemDetails.vectorStoreIds && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Vector Stores:</span> {outputItemDetails.vectorStoreIds.length} store(s)
                            </div>
                          )}
                          {outputItemDetails.hasResults !== undefined && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Results:</span> {outputItemDetails.resultCount} result(s)
                            </div>
                          )}
                          {outputItemDetails.hasText !== undefined && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Has Text:</span> {outputItemDetails.hasText ? 'Yes' : 'No'}
                            </div>
                          )}
                          {outputItemDetails.hasContent !== undefined && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Has Content:</span> {outputItemDetails.hasContent ? 'Yes' : 'No'}
                            </div>
                          )}
                          {outputItemDetails.reasoningId && (
                            <div className="text-muted-foreground">
                              <span className="font-semibold">Reasoning ID:</span> {outputItemDetails.reasoningId}
                              <span className="ml-2 text-xs italic">(Reasoning content is typically encrypted or not exposed)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

