import type { Meta, StoryObj } from "@storybook/react";
import { CurioButton } from "../curio-button";

const meta: Meta<typeof CurioButton> = {
  title: "Design System/CurioButton",
  component: CurioButton,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "ghost", "link"],
    },
    color: {
      control: "select",
      options: ["primary", "secondary"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "full", "icon"],
    },
    disabled: {
      control: "boolean",
    },
    onClick: { action: "clicked" },
  },
  args: {
    children: "Curio Button",
    variant: "default",
    color: "primary",
    size: "default",
  },
};

export default meta;
type Story = StoryObj<typeof CurioButton>;

export const Default: Story = {};

export const Outline: Story = {
  args: {
    variant: "outline",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    variant: "link",
    children: "Link Button",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Icon: Story = {
  args: {
    size: "icon",
    children: "⭐",
    "aria-label": "icon button",
  },
};

export const FullWidth: Story = {
  args: {
    size: "full",
    children: "Full Width Button with Centered Text",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
        <Story />
      </div>
    ),
  ],
};

export const Secondary: Story = {
  args: {
    color: "secondary",
  },
};

export const OutlineSecondary: Story = {
  args: {
    variant: "outline",
    color: "secondary",
  },
};

export const GhostSecondary: Story = {
  args: {
    variant: "ghost",
    color: "secondary",
  },
};
