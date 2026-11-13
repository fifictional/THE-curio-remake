"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bundle, BundleFormType, BundleSkuPair } from "@/lib/types/bundle";
import { Button } from "@/components/ui/button";
import { useExamModulesApi } from "@/hooks/api/exam-modules/use-exam-modules.api";

interface BundleFormProps {
  value: (Bundle & { skuDefault?: string; skuAdditionalPairs?: BundleSkuPair[] }) | null;
  existingNames: string[];
  onSubmit: (payload: BundleFormType) => Promise<void>;
  onCancel: () => void;
}

export function BundleForm({ value, existingNames, onSubmit, onCancel }: BundleFormProps) {
  const [name, setName] = useState(value?.name ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [order, setOrder] = useState<number>(typeof value?.order === 'number' ? value!.order : 0);
  const [published, setPublished] = useState<boolean>(value?.published ?? false);
  const [skuDefault, setSkuDefault] = useState<string>(value?.skuDefault ?? "");
  const [skuAdditionalPairs, setSkuAdditionalPairs] = useState<BundleSkuPair[]>(value?.skuAdditionalPairs ?? []);
  const [modules, setModules] = useState<string[]>(value?.modules ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerInput, setProviderInput] = useState("");
  const [providerIdInput, setProviderIdInput] = useState("");
  const [error, setError] = useState<string>("");

  const { examModules } = useExamModulesApi();

  useEffect(() => {
    setError("");
  }, [name, skuDefault, skuAdditionalPairs, modules, published]);

  const duplicateName = useMemo(() => {
    const candidate = (name || '').trim().toLowerCase();
    return existingNames.map((n) => (n || '').trim().toLowerCase()).includes(candidate);
  }, [name, existingNames]);

  const addSkuPair = () => {
    const provider = (providerInput || '').trim().toLowerCase();
    const id = (providerIdInput || '').trim();
    if (!provider || !id) return;
    if (!/^[a-z]+$/.test(provider)) return;
    const next = [...skuAdditionalPairs, { provider, id }];
    setSkuAdditionalPairs(next);
    setProviderInput("");
    setProviderIdInput("");
  };

  const toggleModule = (id: string) => {
    setModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (published) {
      if (!skuDefault.trim()) {
        setError("SKU default is required to publish.");
        return;
      }
      if (modules.length === 0) {
        setError("At least one module is required to publish.");
        return;
      }
    }
    setIsSubmitting(true);
    await onSubmit({
      name,
      description: description?.trim() || undefined,
      order: Number.isFinite(order) ? order : 0,
      skuDefault: skuDefault.trim(),
      skuAdditional: skuAdditionalPairs,
      modules: Array.from(new Set(modules)),
      published,
    });
    setIsSubmitting(false);
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="text-lg font-semibold mb-2">{value ? 'Edit Bundle' : 'New Bundle'}</div>
      {value?.bundleUuid && (
        <div>
          <label className="block text-xs text-gray-600">Bundle ID</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-50" value={value.bundleUuid} readOnly />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600">Name</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
          {duplicateName && (
            <div className="mt-1 text-xs text-amber-600">A bundle with this name already exists.</div>
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-600">Sort Order</label>
          <input type="number" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={order} onChange={(e) => setOrder(parseInt(e.target.value || '0', 10))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600">Description</label>
        <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600">SKU Default</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={skuDefault} onChange={(e) => setSkuDefault(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">Published</label>
          <div className="mt-2 flex items-center gap-2">
            <input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <label htmlFor="published" className="text-sm">Published</label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600">SKU Additional</label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          <input placeholder="provider (lowercase)" className="rounded-md border px-3 py-2 text-sm" value={providerInput} onChange={(e) => setProviderInput(e.target.value)} />
          <input placeholder="id" className="rounded-md border px-3 py-2 text-sm" value={providerIdInput} onChange={(e) => setProviderIdInput(e.target.value)} />
          <Button type="button" onClick={addSkuPair}>Add</Button>
        </div>
        {skuAdditionalPairs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {skuAdditionalPairs.map((p, idx) => (
              <span key={`${p.provider}:${p.id}:${idx}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
                <span>{p.provider}:{p.id}</span>
                <button type="button" className="text-gray-500 hover:text-gray-800" onClick={() => setSkuAdditionalPairs(skuAdditionalPairs.filter((_, i) => i !== idx))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-600">Modules</label>
        <div className="mt-1 max-h-40 overflow-auto rounded-md border p-2">
          {(examModules || []).map((m: any) => (
            <label key={m.examModuleUuid} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={modules.includes(m.examModuleUuid)} onChange={() => toggleModule(m.examModuleUuid)} />
              <span>{m.moduleName}</span>
            </label>
          ))}
          {(!examModules || examModules.length === 0) && (
            <div className="text-xs text-gray-500">No modules available.</div>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}



