'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Trash2Icon, Plus, Check, X } from "lucide-react";
import { useFutureUsersApi, type FutureUser } from "@/hooks/api/partnerships/use-future-users.api";
import { usePartnershipsApi } from "@/hooks/api/partnerships/use-partnerships.api";
import { FutureUserForm } from "@/components/admin/future-user-form";

interface FutureUsersListProps {
  partnershipUuid?: string | null;
}

export function FutureUsersList({ partnershipUuid }: FutureUsersListProps) {
  const { futureUsers, isLoading, createFutureUser, updateFutureUser, deleteFutureUser } = useFutureUsersApi(partnershipUuid);
  const { partnerships } = usePartnershipsApi();
  const [editing, setEditing] = useState<FutureUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const onCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };

  const onEdit = (futureUser: FutureUser) => {
    setEditing(futureUser);
    setIsOpen(true);
  };

  const onDelete = async (futureUserUuid: string) => {
    await deleteFutureUser(futureUserUuid);
  };

  const getPartnershipName = (partnershipUuid: string | null | undefined): string => {
    if (!partnershipUuid) return 'No Partner';
    const partnership = partnerships.find(p => p.partnershipUuid === partnershipUuid);
    return partnership?.partnerName || 'Unknown Partner';
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Partnership Users</h2>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New User
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Sub Start</th>
                <th className="px-4 py-3">Sub End</th>
                <th className="px-4 py-3 text-center">Granted</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {futureUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No partnership users found. Click "New User" to add one.
                  </td>
                </tr>
              ) : (
                futureUsers.map((futureUser) => (
                  <tr
                    key={futureUser.futureUserUuid}
                    className="text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => onEdit(futureUser)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {futureUser.email}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {futureUser.firstName || futureUser.lastName
                        ? `${futureUser.firstName || ''} ${futureUser.lastName || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getPartnershipName(futureUser.partnershipUuid)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {futureUser.tier === 'ultra' ? 'Ultra Curio' : futureUser.tier === 'super' ? 'Super Curio' : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(futureUser.subStartDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(futureUser.subEndDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-center">
                      {futureUser.subscriptionGranted ? (
                        <span title={`Granted: ${futureUser.subscriptionGrantedAt ? formatDate(futureUser.subscriptionGrantedAt) : 'Unknown'}`}>
                          <Check className="w-4 h-4 inline-block text-green-600" aria-label="Granted" />
                        </span>
                      ) : (
                        <span title="Not granted">
                          <X className="w-4 h-4 inline-block text-gray-400" aria-label="Not granted" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div
                        className="w-full flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ConfirmPopover
                          confirmLabel="Delete this user?"
                          label="Delete"
                          onConfirm={async () => {
                            await onDelete(futureUser.futureUserUuid);
                          }}
                        >
                          <button
                            aria-label="Delete user"
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
            <FutureUserForm
              value={editing}
              partnerships={partnerships}
              onCancel={() => setIsOpen(false)}
              onSubmit={async (payload) => {
                if (editing) {
                  await updateFutureUser({
                    futureUserUuid: editing.futureUserUuid,
                    formData: payload,
                  });
                } else {
                  await createFutureUser(payload);
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

