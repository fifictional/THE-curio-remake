import type { Meta, StoryObj } from "@storybook/react";
import { CurioDropdown } from "../curio-dropdown";
import { CurioDropdownContentListItem } from "../curio-dropdown-content-list-item";
import { CurioDropdownContentDeleteListItem } from "../curio-dropdown-content-delete-list-item";
import { MoreVertical, ArrowRight, Pencil, Copy, Share2, Settings } from "lucide-react";

const meta: Meta<typeof CurioDropdown> = {
  title: "Design System/CurioDropdown",
  component: CurioDropdown,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CurioDropdown>;

export const Default: Story = {
  render: () => (
    <CurioDropdown icon={<MoreVertical className="h-5 w-5" />}>
      <CurioDropdownContentListItem 
        icon={<ArrowRight className="h-4 w-4" />}
        onClick={() => console.log('Move clicked')}
      >
        Move...
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Pencil className="h-4 w-4" />}
        onClick={() => console.log('Rename clicked')}
      >
        Rename
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Copy className="h-4 w-4" />}
        onClick={() => console.log('Duplicate clicked')}
      >
        Duplicate
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Share2 className="h-4 w-4" />}
        onClick={() => console.log('Share clicked')}
      >
        Share
      </CurioDropdownContentListItem>
      <CurioDropdownContentDeleteListItem
        onDelete={() => console.log('Delete confirmed')}
      />
    </CurioDropdown>
  ),
};

export const WithTextButton: Story = {
  render: () => (
    <CurioDropdown 
      icon={<Settings className="h-4 w-4" />} 
      showChevron
    >
      Actions
      <CurioDropdownContentListItem 
        icon={<ArrowRight className="h-4 w-4" />}
        onClick={() => console.log('Move clicked')}
      >
        Move...
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Pencil className="h-4 w-4" />}
        onClick={() => console.log('Rename clicked')}
      >
        Rename
      </CurioDropdownContentListItem>
      <CurioDropdownContentDeleteListItem
        onDelete={() => console.log('Delete confirmed')}
      />
    </CurioDropdown>
  ),
};

export const WithDisabledItems: Story = {
  render: () => (
    <CurioDropdown icon={<MoreVertical className="h-5 w-5" />}>
      <CurioDropdownContentListItem 
        icon={<ArrowRight className="h-4 w-4" />}
        onClick={() => console.log('Move clicked')}
      >
        Move...
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Pencil className="h-4 w-4" />}
        onClick={() => console.log('Rename clicked')}
        disabled
      >
        Rename (Disabled)
      </CurioDropdownContentListItem>
      <CurioDropdownContentListItem 
        icon={<Copy className="h-4 w-4" />}
        onClick={() => console.log('Duplicate clicked')}
      >
        Duplicate
      </CurioDropdownContentListItem>
      <CurioDropdownContentDeleteListItem
        onDelete={() => console.log('Delete confirmed')}
        disabled
      />
    </CurioDropdown>
  ),
};
