'use client';

import { Select, SelectItem, SelectOption } from '@/components/ui/select';
import { useCallback, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { uploadData, getProperties, downloadData } from '@aws-amplify/storage';
import { Save } from 'lucide-react';

const promptOptions: SelectOption[] = [
  {
    label: "Chat",
    value: "chat",
  },
  {
    label: "Context Flashcard",
    value: "context-flashcard",
  },
  {
    label: "Context Explain",
    value: "context-explain",
  },
  {
    label: "Quiz Explain",
    value: "quiz-explain",
  },
  {
    label: "Quiz Hint",
    value: "quiz-hint",
  },
  {
    label: "Document Analysis Generate Summary",
    value: "document-summary",
  }
];

export default function PromptEditorPage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>(promptOptions[0].value);
  const [editorContent, setEditorContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [canSave, setCanSave] = useState<boolean>(false);

  const handlePromptChange = useCallback(async (value: string) => {
    setIsLoading(true);
    try {
      const properties = await getProperties({
        options: {
          bucket: 'ai-tutor-prompt-storage',
        },
        path: `prompts/${value}.txt`,
      });
      
      const content = await downloadData({
        options: {
          bucket: 'ai-tutor-prompt-storage',
        },
        path: `prompts/${value}.txt`,
      }).result;
      setEditorContent(await content.body.text());
    } catch (error: any) {
      if (error.message !== 'NotFound') {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }

    setSelectedPrompt(value);
  }, [setSelectedPrompt]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value) {
      setEditorContent(value);
      setCanSave(true);
    }
  }, [setEditorContent, setCanSave]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setIsLoading(true);
    try {
      await uploadData({
        options: {
          bucket: 'ai-tutor-prompt-storage',
          contentType: 'text/plain',
        },
        path: `prompts/${selectedPrompt}.txt`,
        data: editorContent,
      });
      setCanSave(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canSave, editorContent, selectedPrompt]);

  useEffect(() => {
    handlePromptChange(selectedPrompt);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="pl-8 container flex items-center gap-4 h-16 border-b border-gray-200">
        <Select
          value={selectedPrompt}
          onValueChange={handlePromptChange}
        >
          {promptOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>

        <button
          onClick={handleSave}
          disabled={!canSave || isLoading}
          className={`
            ml-auto flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
            ${canSave 
              ? 'bg-primary text-white hover:bg-primary/90' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 container">
        <div className="h-[calc(100%-6rem)] rounded-md">
          <Editor
            height="100%"
            defaultLanguage="text"
            value={editorContent}
            onChange={handleEditorChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              formatOnPaste: true,
              formatOnType: true,
              tabSize: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
