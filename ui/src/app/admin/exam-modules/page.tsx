"use client";

import { useState } from "react";
import { useExamModulesApi } from "@/hooks/api/exam-modules/use-exam-modules.api";
import type { ExamModuleFormType } from "@/lib/types/exam-module";
import { Button } from "@/components/ui/button";
import { ExamModuleForm } from "@/components/admin/exam-module-form";

const DEFAULT_MODULES = [
  { moduleName: 'SAT Math', price: 0, retired: false, questionKeys: [] },
  { moduleName: 'SAT Reading & Writing', price: 0, retired: false, questionKeys: [] },
  { moduleName: 'SAT Free', price: 0, retired: false, questionKeys: [] },
  { moduleName: 'SAT Onboarding', price: 0, retired: false, questionKeys: [] },
];

export default function ExamModulesPage() {
  const { examModules, isLoading, createExamModule, updateExamModule, deleteExamModule } = useExamModulesApi();
  const [editing, setEditing] = useState<ExamModuleFormType | null>(null);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingDefaults, setIsAddingDefaults] = useState(false);

  const onCreate = () => { setEditing(null); setIsOpen(true); };
  const onEdit = (examModuleUuid: string, em: ExamModuleFormType) => { 
    setEditing(em);
    setEditingUuid(examModuleUuid);
    setIsOpen(true);
  };
  const onDelete = async (em: string) => { await deleteExamModule(em); };

  const onAddDefaults = async () => {
    setIsAddingDefaults(true);
    try {
      // Get existing module names
      const existingNames = new Set((examModules || []).map(em => em.moduleName));
      
      // Filter out modules that already exist
      const modulesToAdd = DEFAULT_MODULES.filter(
        module => !existingNames.has(module.moduleName)
      );

      if (modulesToAdd.length === 0) {
        alert('All default modules already exist!');
        return;
      }

      // Create each module
      for (const module of modulesToAdd) {
        const uuid = crypto.randomUUID();
        await createExamModule({
          ...module,
          examModuleUuid: uuid,
        } as any);
      }

      alert(`Successfully added ${modulesToAdd.length} default module(s)!`);
    } catch (error) {
      console.error('Error adding default modules:', error);
      alert('Failed to add default modules. Check console for details.');
    } finally {
      setIsAddingDefaults(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exam Modules</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onAddDefaults}
            disabled={isAddingDefaults || isLoading}
          >
            {isAddingDefaults ? 'Adding...' : 'Add Defaults'}
          </Button>
          <Button onClick={onCreate}>New Module</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Retired</th>
                <th className="px-4 py-3">Question Keys</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(examModules || []).map((em) => (
                <tr key={em.examModuleUuid} className="text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{em.moduleName}</td>
                  <td className="px-4 py-3 text-gray-700 text-right">$ {em.price}</td>
                  <td className="px-4 py-3 text-gray-700">{em.retired ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-gray-700">{em.questionKeys?.join(", ")}</td>
                  <td className="px-4 py-3 text-gray-700 space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(em.examModuleUuid, {
                      moduleName: em.moduleName,
                      price: em.price,
                      retired: em.retired,
                      questionKeys: em.questionKeys || [],
                    })}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(em.examModuleUuid)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
            <ExamModuleForm
              value={editing}
              onCancel={() => setIsOpen(false)}
              onSubmit={async (payload: any) => {
                if (editing) {
                  await updateExamModule({ examModuleUuid: editingUuid, ...editing, ...payload } as any);
                } else {
                  const uuid = crypto.randomUUID();
                  await createExamModule({
                    ...payload,
                    examModuleUuid: uuid,
                  } as any);
                }
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


