'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Trash2Icon, Plus, Image as ImageIcon } from "lucide-react";
import { usePartnershipsApi, type Partnership } from "@/hooks/api/partnerships/use-partnerships.api";
import { PartnershipForm } from "@/components/admin/partnership-form";
import { getUrl } from "@/lib/local-storage";

export function PartnersList() {
  const { partnerships, isLoading, createPartnership, updatePartnership, deletePartnership } = usePartnershipsApi();
  const [editing, setEditing] = useState<Partnership | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const onCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const onEdit = (partnership: Partnership) => {
    setEditing(partnership);
    setIsOpen(true);
  };

  const onDelete = async (partnershipUuid: string) => {
    await deletePartnership(partnershipUuid);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Partners</h2>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Partner
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Partner Name</th>
                <th className="px-4 py-3">Partner Code</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {partnerships.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No partners found. Click "New Partner" to add one.
                  </td>
                </tr>
              ) : (
                partnerships.map((partnership) => (
                  <tr
                    key={partnership.partnershipUuid}
                    className="text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => onEdit(partnership)}
                  >
                    <td className="px-4 py-3">
                      {partnership.logoS3Key ? (
                        <LogoImage logoS3Key={partnership.logoS3Key} />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {partnership.partnerName}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-sm">
                      {partnership.partnerCode}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(partnership.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div
                        className="w-full flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ConfirmPopover
                          confirmLabel="Delete this partner?"
                          label="Delete"
                          onConfirm={async () => {
                            await onDelete(partnership.partnershipUuid);
                          }}
                        >
                          <button
                            aria-label="Delete partner"
                            className="h-8 w-8 inline-flex items-center justify-center rounded text-red-600 hover:text-white hover:bg-red-600"
                            title="Delete"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </ConfirmPopover>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg">
            <PartnershipForm
              value={editing}
              onCancel={() => setIsOpen(false)}
              onSubmit={async (payload) => {
                if (editing) {
                  await updatePartnership({
                    partnershipUuid: editing.partnershipUuid,
                    formData: payload,
                  });
                } else {
                  await createPartnership(payload);
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

function LogoImage({ logoS3Key }: { logoS3Key: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUrl({ path: logoS3Key })
      .then((url) => {
        setLogoUrl(url.url.toString());
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading logo:', error);
        setIsLoading(false);
      });
  }, [logoS3Key]);

  if (isLoading) {
    return (
      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!logoUrl) {
    return (
      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="Partner logo"
      className="w-12 h-12 rounded object-cover"
      onError={() => setLogoUrl(null)}
    />
  );
}

