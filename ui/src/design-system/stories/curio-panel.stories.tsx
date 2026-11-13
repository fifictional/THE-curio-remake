import type { Meta, StoryObj } from "@storybook/react";
import { CurioPanel } from "../curio-panel";
import { SelectMenu } from "@/components/ui/select-menu";
import { GraduationCap, School, Building2, User, BookOpen, ShieldCheck } from "lucide-react";

const meta: Meta<typeof CurioPanel> = {
  title: "Design System/CurioPanel",
  component: CurioPanel,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "ghost"],
    },
    padding: {
      control: "select",
      options: ["default", "sm", "md", "lg", "none"],
    },
    scrollable: {
      control: "boolean",
    },
  },
  args: {
    variant: "default",
    padding: "default",
    scrollable: false,
  },
};

export default meta;
type Story = StoryObj<typeof CurioPanel>;

export const Default: Story = {
  args: {
    children: "Panel content goes here",
  },
};

export const WithContent: Story = {
  render: () => {
    const options = [
      { value: "high-school", label: "High School Student", icon: <School className="h-5 w-5" /> },
      { value: "college", label: "College / Undergraduate", icon: <GraduationCap className="h-5 w-5" /> },
      { value: "graduate", label: "Graduate / Phd", icon: <Building2 className="h-5 w-5" /> },
      { value: "teacher", label: "Teacher", icon: <User className="h-5 w-5" /> },
      { value: "professional", label: "Lifelong Learner / Professional", icon: <BookOpen className="h-5 w-5" /> },
      { value: "other", label: "Something Else", icon: <ShieldCheck className="h-5 w-5" /> },
    ];

    return (
      <div className="bg-gray-100 min-h-screen p-6">
        <CurioPanel>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hey Nik 👋 Welcome to Curio!</h1>
              <p className="text-sm text-gray-600 mt-2">
                Set up your classroom by answering a few questions about you and your goals.
              </p>
            </div>
            <SelectMenu
              title="What best describes you? (Select one)"
              options={options}
            />
          </div>
        </CurioPanel>
      </div>
    );
  },
};

export const SmallPadding: Story = {
  args: {
    padding: "sm",
    children: "Panel with small padding",
  },
};

export const LargePadding: Story = {
  args: {
    padding: "lg",
    children: "Panel with large padding",
  },
};

export const WithParentSpacing: Story = {
  render: () => (
    <div className="bg-gray-100 p-6">
      <CurioPanel>
        Panel with spacing/6 from parent (handled by parent's p-6)
      </CurioPanel>
    </div>
  ),
};

export const Scrollable: Story = {
  args: {
    scrollable: true,
  },
  render: (args) => (
    <div className="bg-gray-100 p-6 h-[400px]">
      <CurioPanel {...args}>
        <div className="space-y-4">
          <p>This panel is scrollable (h-full and overflow-y-auto)</p>
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} className="text-sm">
              Line {i + 1}: Scrollable content that extends beyond the panel height
            </p>
          ))}
        </div>
      </CurioPanel>
    </div>
  ),
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost panel with no background",
  },
  render: (args) => (
    <div className="bg-gray-100 p-6">
      <CurioPanel {...args}>
        <div className="space-y-4">
          <p className="text-gray-900">This panel has no background (ghost variant)</p>
          <p className="text-gray-600 text-sm">Useful when you want the rounded corners and padding but no background color</p>
        </div>
      </CurioPanel>
    </div>
  ),
};
