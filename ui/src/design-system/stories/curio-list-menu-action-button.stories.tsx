import type { Meta, StoryObj } from "@storybook/react";
import { Home, Upload } from "lucide-react";
import { CurioListMenuActionButton } from "../curio-list-menu-action-button";

const meta: Meta<typeof CurioListMenuActionButton> = {
    title: "Design System/CurioListMenuAction/Button",
    component: CurioListMenuActionButton,
    args: {
        label: "Home",
        icon: Home,
    },
};

export default meta;
type Story = StoryObj<typeof CurioListMenuActionButton>;

export const Default: Story = {};

export const Active: Story = {
    args: {
        active: true,
    },
};

export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

export const WithIconUpload: Story = {
    args: {
        label: "Upload",
        icon: Upload,
    },
};

export const AsLink: Story = {
    args: {
        href: "/home",
    },
};
