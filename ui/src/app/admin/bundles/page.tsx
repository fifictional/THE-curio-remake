"use client";

import { useMemo, useState } from "react";
import { useBundlesApi } from "@/hooks/api/bundles/use-bundles.api";
import { useExamModulesApi } from "@/hooks/api/exam-modules/use-exam-modules.api";
import type { Bundle, BundleFormType } from "@/lib/types/bundle";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Trash2Icon, Check, X } from "lucide-react";
import { BundleForm } from "@/components/admin/bundle-form";

const DEFAULT_BUNDLES = [
  {
    name: 'SAT',
    description: 'Complete SAT preparation bundle',
    published: true,
    modules: [] as string[], // Will be populated with module UUIDs
  },
  {
    name: 'SAT Free',
    description: 'Free SAT practice questions',
    published: true,
    modules: [] as string[], // Will be populated with module UUIDs
  },
];

export default function BundlesAdminPage() {
  const { bundles, isLoading, createBundle, updateBundle, deleteBundle } = useBundlesApi();
  const { examModules } = useExamModulesApi();
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingDefaults, setIsAddingDefaults] = useState(false);

  const onCreate = () => { setEditing(null); setIsOpen(true); };
  const onEdit = (b: Bundle) => { setEditing(b); setIsOpen(true); };
  const onDelete = async (bundleUuid: string) => { await deleteBundle(bundleUuid); };

  const onAddDefaults = async () => {
    setIsAddingDefaults(true);
    try {
      // Get existing bundle names
      const existingNames = new Set((bundles || []).map(b => b.name));
      
      // Filter out bundles that already exist
      const bundlesToAdd = DEFAULT_BUNDLES.filter(
        bundle => !existingNames.has(bundle.name)
      );

      if (bundlesToAdd.length === 0) {
        alert('All default bundles already exist!');
        return;
      }

      // Get module UUIDs by name for auto-linking
      const modulesByName = new Map(
        (examModules || []).map(m => [m.moduleName, m.examModuleUuid])
      );

      // Create each bundle
      for (const bundle of bundlesToAdd) {
        // Auto-link modules based on bundle name
        let moduleUuids: string[] = [];
        
        if (bundle.name === 'SAT') {
          // Link SAT Math, SAT Reading & Writing, and SAT Onboarding
          const satMath = modulesByName.get('SAT Math');
          const satRW = modulesByName.get('SAT Reading & Writing');
          const satOnboarding = modulesByName.get('SAT Onboarding');
          moduleUuids = [satMath, satRW, satOnboarding].filter(Boolean) as string[];
        } else if (bundle.name === 'SAT Free') {
          // Link SAT Free module
          const satFree = modulesByName.get('SAT Free');
          if (satFree) moduleUuids = [satFree];
        }

        await createBundle({
          name: bundle.name,
          description: bundle.description,
          published: bundle.published,
          modules: moduleUuids,
        } as BundleFormType);
      }

      alert(`Successfully added ${bundlesToAdd.length} default bundle(s)!`);
    } catch (error) {
      console.error('Error adding default bundles:', error);
      alert('Failed to add default bundles. Check console for details.');
    } finally {
      setIsAddingDefaults(false);
    }
  };

  const existingNames = useMemo(() => (bundles || []).map((b) => b.name), [bundles]);

  const examModuleNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (examModules || []).forEach((m: any) => { map[m.examModuleUuid] = m.moduleName; });
    return map;
  }, [examModules]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bundles</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onAddDefaults}
            disabled={isAddingDefaults || isLoading}
          >
            {isAddingDefaults ? 'Adding...' : 'Add Defaults'}
          </Button>
          <Button onClick={onCreate}>New Bundle</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center w-30">Module #</th>
                <th className="px-4 py-3 text-center w-30">Published</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {(bundles || []).map((b) => (
                <tr key={b.bundleUuid} className="text-sm hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(b)}>
                  <td className="px-4 py-3 font-medium text-gray-900" title={`Created: ${b.createdAt}\nUpdated: ${b.updatedAt}${b.publishedAt ? `\nPublished: ${b.publishedAt}` : ''}${b.createdBy ? `\nCreated by: ${b.createdBy}` : ''}${b.updatedBy ? `\nUpdated by: ${b.updatedBy}` : ''}`}>
                    {b.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 truncate max-w-[480px]">{b.description || ''}</td>
                  <td className="px-4 py-3 text-gray-700 text-center">{b.modules?.length || 0}</td>
                  <td className="px-4 py-3 text-gray-700 text-center">
                    {b.published ? (
                      <span title="Published"><Check className="w-4 h-4 inline-block text-green-600" aria-label="Published" /></span>
                    ) : (
                      <span title="Unpublished"><X className="w-4 h-4 inline-block text-gray-500" aria-label="Unpublished" /></span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="w-full flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                      <ConfirmPopover
                        confirmLabel="Delete this bundle?"
                        label="Delete"
                        onConfirm={async () => { await onDelete(b.bundleUuid); }}
                      >
                        <button
                          aria-label="Delete bundle"
                          className="h-8 w-8 inline-flex items-center justify-center rounded text-red-600 hover:text-white hover:bg-red-600"
                          title="Delete"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </ConfirmPopover>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg">
            <BundleForm
              value={editing ? {
                ...editing,
                skuDefault: editing.defaultSku || undefined,
                skuAdditionalPairs: (editing.additionalSkus || []).map((s) => ({ provider: s.split(":")[0], id: s.split(":")[1] })),
              } : null}
              existingNames={(existingNames || []).filter((n) => !editing || n !== editing.name)}
              onCancel={() => setIsOpen(false)}
              onSubmit={async (payload: BundleFormType) => {
                if (editing) {
                  await updateBundle({ bundleUuid: editing.bundleUuid, form: { ...payload, publishedAt: editing.publishedAt } });
                } else {
                  await createBundle(payload);
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



