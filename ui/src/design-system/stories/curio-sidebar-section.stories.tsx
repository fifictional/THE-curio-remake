import type { Meta, StoryObj } from "@storybook/react";
import { Folder } from "lucide-react";
import { CurioSidebarSection } from "../curio-sidebar-section";
import { CurioListMenuItem } from "../curio-list-menu-item";

const meta: Meta<typeof CurioSidebarSection> = {
  title: "Design System/CurioSidebarSection",
  component: CurioSidebarSection,
};
export default meta;

type Story = StoryObj<typeof CurioSidebarSection>;

export const WithItems: Story = {
  args: {
    title: "Your Library",
    isSidebarOpen: true,
    rightLink: {
      label: "...see all",
      href: "/library",
    },
    children: (
      <CurioListMenuItem
        icon={Folder}
        label="My Folder"
      />
    ),
  },
};

export const EmptyState: Story = {
  args: {
    title: "Your Library",
    isSidebarOpen: true,
    children: (
      <p className="text-sm text-gray-600 ml-3">
        No folders found.
      </p>
    ),
  },
};
