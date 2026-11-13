"use client";

import { useMockDocumentsApi } from "@/hooks/api/mock-documents/use-mock-documents.api";
import { MockDocForm } from "../../../components/admin/mock-doc-form";

export default function MockDocsPage() {
  const { mockDocuments, isLoading } = useMockDocumentsApi();

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mock Documents</h1>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-600">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Document UUID</th>
                <th className="px-4 py-3">YouTube</th>
                <th className="px-4 py-3">Thumbnail Key</th>
                <th className="px-4 py-3">Content Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mockDocuments?.map((d) => (
                <tr key={d.mockDocumentUuid} className="text-sm">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
                  <td className="px-4 py-3 text-gray-700">{d.description}</td>
                  <td className="px-4 py-3 text-gray-700">{d.documentUuid}</td>
                  <td className="px-4 py-3 text-gray-700">{d.youtube ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-gray-700">{d.thumbnailKey}</td>
                  <td className="px-4 py-3 text-gray-700">{d.contentKey}</td>
                </tr>
              ))}
              {!mockDocuments?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-600">No mock documents yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <MockDocForm />
      </div>
    </div>
  );
}