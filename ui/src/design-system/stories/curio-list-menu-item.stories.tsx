import type { Meta, StoryObj } from "@storybook/react";
import {
  Home,
  Folder,
  FileText,
} from "lucide-react";
import { CurioListMenuItem } from "../curio-list-menu-item";

const meta: Meta<typeof CurioListMenuItem> = {
  title: "Design System/CurioListMenuItem",
  component: CurioListMenuItem,
};
export default meta;

type Story = StoryObj<typeof CurioListMenuItem>;

export const Default: Story = {
  args: {
    icon: Home,
    label: "Home",
  },
};

export const WithLink: Story = {
  args: {
    icon: Folder,
    label: "Library",
    href: "/library",
  },
};

export const Active: Story = {
  args: {
    icon: FileText,
    label: "Active Document",
    active: true,
  },
};

export const Disabled: Story = {
  args: {
    icon: Folder,
    label: "Disabled Item",
    disabled: true,
  },
};

export const Hidden: Story = {
  args: {
    icon: Folder,
    label: "Hidden Item",
    hidden: true,
  },
};

export const WithOnClick: Story = {
  args: {
    icon: Home,
    label: "Clickable Item",
    onClick: () => {
      console.log("Menu item clicked");
    },
  },
};
