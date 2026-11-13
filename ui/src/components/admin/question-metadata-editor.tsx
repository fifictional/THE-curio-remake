'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExamModule {
  examModuleUuid: string;
  moduleName: string;
}

interface QuestionMetadataEditorProps {
  module: string;
  setModule: (value: string) => void;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | '';
  setDifficulty: (value: 'EASY' | 'MEDIUM' | 'HARD' | '') => void;
  examModuleUuid: string;
  setExamModuleUuid: (value: string) => void;
  topic: string;
  setTopic: (value: string) => void;
  subtopic: string;
  setSubtopic: (value: string) => void;
  concept: string;
  setConcept: (value: string) => void;
  examModules?: ExamModule[];
}

export function QuestionMetadataEditor({
  module,
  setModule,
  difficulty,
  setDifficulty,
  examModuleUuid,
  setExamModuleUuid,
  topic,
  setTopic,
  subtopic,
  setSubtopic,
  concept,
  setConcept,
  examModules,
}: QuestionMetadataEditorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div>
        <Label htmlFor="module" className="text-sm font-medium">
          Module
        </Label>
        <select
          id="module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="">Select module</option>
          <option value="Math">Math</option>
          <option value="Reading and Writing">Reading and Writing</option>
        </select>
      </div>
      <div>
        <Label htmlFor="difficulty" className="text-sm font-medium">
          Difficulty Level
        </Label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD' | '')}
          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="">Select difficulty...</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>
      <div className="col-span-2">
        <Label htmlFor="examModule" className="text-sm font-medium">
          Exam Module
        </Label>
        <select
          id="examModule"
          value={examModuleUuid}
          onChange={(e) => setExamModuleUuid(e.target.value)}
          className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
        >
          <option value="">Select exam module...</option>
          {examModules?.map((module) => (
            <option key={module.examModuleUuid} value={module.examModuleUuid}>
              {module.moduleName} ({module.examModuleUuid})
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="topic" className="text-sm font-medium">
          Topic
        </Label>
        <Input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1"
          placeholder="e.g., Algebra, Advanced Math"
        />
      </div>
      <div>
        <Label htmlFor="subtopic" className="text-sm font-medium">
          Subtopic
        </Label>
        <Input
          id="subtopic"
          value={subtopic}
          onChange={(e) => setSubtopic(e.target.value)}
          className="mt-1"
          placeholder="e.g., Linear equations"
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="concept" className="text-sm font-medium">
          Concept
        </Label>
        <Input
          id="concept"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="mt-1"
          placeholder="e.g., Solving for x"
        />
      </div>
    </div>
  );
}

