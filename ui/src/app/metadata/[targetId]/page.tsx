'use client';

import { AdminGate } from "@/components/admin/admin-gate";
import { useMetadataByTargetApi } from "@/hooks/api/metadata/use-metadata-by-target.api";
import { useParams } from "next/navigation";

export default function MetadataPage() {
  const params = useParams();
  const targetUuid = params.targetId as string;
  const { metadata, isLoading, error } = useMetadataByTargetApi(targetUuid);

  return (
    <AdminGate>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Metadata</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Target UUID: <code className="bg-muted px-1 py-0.5 rounded">{targetUuid}</code>
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
            Error loading metadata: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Metadata UUID</th>
                <th className="px-4 py-2 text-left font-medium">Target Type</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Value</th>
                <th className="px-4 py-2 text-left font-medium">Created At</th>
                <th className="px-4 py-2 text-left font-medium">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Loading metadata...
                  </td>
                </tr>
              )}

              {!isLoading && metadata.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No metadata found for this target.
                  </td>
                </tr>
              )}

              {!isLoading && metadata.map((item) => (
                <tr key={item.metadataUuid} className="hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {item.metadataUuid}
                    </code>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {item.targetType}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2">
                    <div className="max-w-lg break-words" title={item.value}>
                      {item.value}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}

