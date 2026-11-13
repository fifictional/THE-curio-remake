import type { Meta, StoryObj } from "@storybook/react";
import { Home, Upload, Folder } from "lucide-react";
import { CurioListMenuAction, CurioListMenuActionItem } from "../curio-list-menu-action";

const items: CurioListMenuActionItem[] = [
    {
        id: "home",
        label: "Home",
        icon: Home,
        href: "/home",
    },
    {
        id: "upload",
        label: "Upload",
        icon: Upload,
        onSelect: () => console.log("Upload clicked"),
    },
    {
        id: "library",
        label: "Library",
        icon: Folder,
        disabled: true,
    },
];

const meta: Meta<typeof CurioListMenuAction> = {
    title: "Design System/CurioListMenuAction/Menu",
    component: CurioListMenuAction,
    args: {
        items,
    },
};

export default meta;
type Story = StoryObj<typeof CurioListMenuAction>;

export const Default: Story = {
    args: {
        defaultValue: "upload",
    },
};

export const Controlled: Story = {
    args: {
        value: "home",
    },
};

export const WithDisabledItem: Story = {
    args: {
        defaultValue: "home",
    },
};

export const AllEnabled: Story = {
    args: {
        items: items.map((item) => ({ ...item, disabled: false })),
    },
};
