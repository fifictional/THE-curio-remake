import type { Meta, StoryObj } from "@storybook/react";
import { CurioDeleteButtonIcon } from "../curio-delete-button-icon";

const meta: Meta<typeof CurioDeleteButtonIcon> = {
  title: "Design System/CurioDeleteButtonIcon",
  component: CurioDeleteButtonIcon,
  tags: ["autodocs"],
  argTypes: {
    onConfirm: { action: "confirmed" },
    disabled: {
      control: "boolean",
    },
    confirmText: {
      control: "text",
    },
  },
  args: {
    onConfirm: () => {
      console.log("confirmed");
    },
    disabled: false,
    confirmText: "Confirm?",
  },
};

export default meta;
type Story = StoryObj<typeof CurioDeleteButtonIcon>;

export const Default: Story = {
  args: {
    onConfirm: () => {
      console.log("confirmed");
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    onConfirm: () => {
      console.log("confirmed");
    },
  },
};

export const CustomConfirmText: Story = {
  args: {
    confirmText: "Are you sure?",
    onConfirm: () => {
      console.log("confirmed");
    },
  },
};

export const WithTestId: Story = {
  args: {
    testId: "delete-button-test",
    onConfirm: () => {
      console.log("confirmed");
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const handleConfirm = () => {
      console.log("confirmed");
    };

    return (
      <div className="flex items-center gap-4 p-8">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600">Click the delete button:</span>
          <CurioDeleteButtonIcon onConfirm={handleConfirm} />
        </div>
      </div>
    );
  },
};
