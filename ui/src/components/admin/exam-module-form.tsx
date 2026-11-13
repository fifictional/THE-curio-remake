"use client";

import { useState } from "react";
import type { ExamModuleFormType } from "@/lib/types/exam-module";
import { Button } from "@/components/ui/button";

interface ExamModuleFormProps {
  value: ExamModuleFormType | null;
  onSubmit: (payload: ExamModuleFormType) => Promise<void>;
  onCancel: () => void;
}

export function ExamModuleForm({ value, onSubmit, onCancel }: ExamModuleFormProps) {
  const [moduleName, setModuleName] = useState(value?.moduleName ?? "");
  const [price, setPrice] = useState<string>(value?.price?.toString() ?? "0");
  const [retired, setRetired] = useState<boolean>(value?.retired ?? false);
  const [questionKeys, setQuestionKeys] = useState<string>((value?.questionKeys || []).join(","));
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit({
          moduleName,
          price: parseFloat(price),
          retired,
          questionKeys: questionKeys.split(",").map((s) => s.trim()).filter(Boolean),
        } as any);
        setIsSubmitting(false);
      }}
    >
      <div className="text-lg font-semibold mb-2">{value ? 'Edit Module' : 'New Module'}</div>
      <div>
        <label className="block text-xs text-gray-600">Module name</label>
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={moduleName} onChange={(e) => setModuleName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600">Price</label>
          <input type="number" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <input id="retired" type="checkbox" checked={retired} onChange={(e) => setRetired(e.target.checked)} />
          <label htmlFor="retired" className="text-sm">Retired</label>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600">Question Keys (comma-separated)</label>
        <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm" rows={3} value={questionKeys} onChange={(e) => setQuestionKeys(e.target.value)} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}


