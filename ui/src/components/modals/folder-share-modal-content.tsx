'use client';

import { Input } from '@/components/ui/input';
import { CurioButton } from '@/design-system/curio-button';
import { CurioDropdown } from '@/design-system/curio-dropdown';
import { CurioDropdownContentListItem } from '@/design-system/curio-dropdown-content-list-item';
import { CurioDeleteButtonIcon } from '@/design-system/curio-delete-button-icon';
import { 
  CurioTable, 
  CurioTableHeaderRow, 
  CurioTableRow, 
  CurioTableRowActionColumn,
  CurioTableBody 
} from '@/design-system/curio-table';

export interface Member {
  uuid: string;
  name: string;
  email: string;
  role: 'Owner' | 'Editor' | 'Viewer';
}

export interface FolderShareModalContentProps {
  emailInput: string;
  members: Member[];
  invitesLeft: number;
  currentUserIsOwner: boolean;
  spaceOwnerUuid: string | null;
  currentUserUuid: string | null;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (memberUuid: string) => void;
  onChangePermission: (memberUuid: string, newRole: 'Owner' | 'Editor' | 'Viewer') => void;
}

export function FolderShareModalContent({
  emailInput,
  members,
  invitesLeft,
  currentUserIsOwner,
  spaceOwnerUuid,
  currentUserUuid,
  onInputChange,
  onAdd,
  onRemove,
  onChangePermission,
}: FolderShareModalContentProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim()) {
      e.preventDefault();
      onAdd();
    }
  };

  // Count owners to determine if remove should be disabled
  const ownerCount = members.filter(m => m.role === 'Owner').length;

  const roles: ('Owner' | 'Editor' | 'Viewer')[] = ['Owner', 'Editor', 'Viewer'];

  return (
    <div className="flex flex-col gap-6">
      {/* Input Box */}
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Add people by email"
          value={emailInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <CurioButton
          color="primary"
          size="sm"
          onClick={onAdd}
          disabled={!emailInput.trim()}
        >
          Invite
        </CurioButton>
      </div>

      {/* Current Members Section */}
      <div className="flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Current Members ({members.length})
          </h3>
          <span className="text-sm text-muted-foreground">
            Invites left {invitesLeft}
          </span>
        </div>

        {/* Members Table */}
        <CurioTable>
          <thead>
            <CurioTableHeaderRow headings={['Name', 'Email', 'Role', '']} />
          </thead>
          <CurioTableBody>
            {members.map((member, index) => (
              <CurioTableRow
                key={member.uuid}
                cells={[
                  member.name,
                  <span className="text-muted-foreground" key="email">{member.email}</span>,
                  currentUserIsOwner && member.uuid !== spaceOwnerUuid && member.uuid !== currentUserUuid ? (
                    <CurioDropdown
                      showChevron
                      align="start"
                    >
                      {member.role}
                      {roles
                        .filter(role => role !== member.role)
                        .map((role) => (
                          <CurioDropdownContentListItem
                            key={role}
                            onClick={() => onChangePermission(member.uuid, role)}
                          >
                            {role}
                          </CurioDropdownContentListItem>
                        ))}
                    </CurioDropdown>
                  ) : (
                    member.role
                  ),
                  <CurioTableRowActionColumn key="actions">
                    <CurioDeleteButtonIcon
                      onConfirm={() => onRemove(member.uuid)}
                      disabled={member.role === 'Owner' && ownerCount === 1}
                      testId={`remove-member-${member.uuid}`}
                    />
                  </CurioTableRowActionColumn>
                ]}
                isLast={index === members.length - 1}
              />
            ))}
          </CurioTableBody>
        </CurioTable>
      </div>
    </div>
  );
}
