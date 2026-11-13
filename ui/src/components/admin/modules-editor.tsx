'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Play, RefreshCw } from 'lucide-react';

interface Module {
  moduleNumber: number;
  moduleName: string;
  startPage: number;
  endPage: number;
  questionCount: number;
}

interface ModulesEditorProps {
  modulesJson: string;
  onStartExtraction: (modules: Module[]) => void;
  onReExtractModules: () => void;
  isStarting?: boolean;
  isReExtracting?: boolean;
}

export function ModulesEditor({ modulesJson, onStartExtraction, onReExtractModules, isStarting, isReExtracting }: ModulesEditorProps) {
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(modulesJson);
      setModules(parsed);
    } catch (error) {
      console.error('Error parsing modules JSON:', error);
      setModules([]);
    }
  }, [modulesJson]);

  const handleModuleChange = (index: number, field: keyof Module, value: string | number) => {
    const newModules = [...modules];
    newModules[index] = {
      ...newModules[index],
      [field]: typeof value === 'string' && field !== 'moduleName' ? parseInt(value) || 0 : value,
    };
    setModules(newModules);
  };

  const handleStartExtraction = () => {
    onStartExtraction(modules);
  };

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No modules identified yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <CardTitle>Identified Modules</CardTitle>
          </div>
          <Badge variant="outline">{modules.length} modules</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Review and edit the identified modules before starting question extraction.
        </p>

        {modules.map((module, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Module {module.moduleNumber}</h3>
              <Badge variant="secondary">{module.questionCount} questions</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`module-name-${index}`}>Module Name</Label>
                <Input
                  id={`module-name-${index}`}
                  value={module.moduleName}
                  onChange={(e) => handleModuleChange(index, 'moduleName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`question-count-${index}`}>Question Count</Label>
                <Input
                  id={`question-count-${index}`}
                  type="number"
                  min="1"
                  value={module.questionCount}
                  onChange={(e) => handleModuleChange(index, 'questionCount', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`start-page-${index}`}>Start Page</Label>
                <Input
                  id={`start-page-${index}`}
                  type="number"
                  min="1"
                  value={module.startPage}
                  onChange={(e) => handleModuleChange(index, 'startPage', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`end-page-${index}`}>End Page</Label>
                <Input
                  id={`end-page-${index}`}
                  type="number"
                  min="1"
                  value={module.endPage}
                  onChange={(e) => handleModuleChange(index, 'endPage', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center">
          <Button
            onClick={onReExtractModules}
            disabled={isReExtracting}
            variant="outline"
            size="lg"
          >
            {isReExtracting ? (
              <>Re-extracting...</>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-extract Modules
              </>
            )}
          </Button>

          <Button
            onClick={handleStartExtraction}
            disabled={isStarting}
            size="lg"
          >
            {isStarting ? (
              <>Processing...</>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Question Extraction
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

