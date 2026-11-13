import type { Meta, StoryObj } from "@storybook/react";
import { CurioSelectMenuItem } from "../curio-select-menu-item";
import { GraduationCap, School, Building2, User, BookOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";

const meta: Meta<typeof CurioSelectMenuItem> = {
  title: "Design System/CurioSelectMenuItem",
  component: CurioSelectMenuItem,
  tags: ["autodocs"],
  argTypes: {
    selected: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    onClick: { action: "clicked" },
  },
  args: {
    children: "Option Label",
    selected: false,
  },
};

export default meta;
type Story = StoryObj<typeof CurioSelectMenuItem>;

export const Default: Story = {
  args: {
    icon: <School className="h-5 w-5" />,
  },
};

export const Selected: Story = {
  args: {
    icon: <School className="h-5 w-5" />,
    selected: true,
  },
};

export const WithoutIcon: Story = {
  args: {
    children: "Option without icon",
  },
};

export const ExampleOptions: Story = {
  render: () => (
    <div className="space-y-2 w-full max-w-md">
      <CurioSelectMenuItem icon={<School className="h-5 w-5" />} selected>
        High School Student
      </CurioSelectMenuItem>
      <CurioSelectMenuItem icon={<GraduationCap className="h-5 w-5" />}>
        College / Undergraduate
      </CurioSelectMenuItem>
      <CurioSelectMenuItem icon={<Building2 className="h-5 w-5" />}>
        Graduate / Phd
      </CurioSelectMenuItem>
      <CurioSelectMenuItem icon={<User className="h-5 w-5" />}>
        Teacher
      </CurioSelectMenuItem>
      <CurioSelectMenuItem icon={<BookOpen className="h-5 w-5" />}>
        Lifelong Learner / Professional
      </CurioSelectMenuItem>
      <CurioSelectMenuItem icon={<ShieldCheck className="h-5 w-5" />}>
        Something Else
      </CurioSelectMenuItem>
    </div>
  ),
};

export const Interactive: Story = {
  render: (args) => {
    const [selectedValue, setSelectedValue] = useState<string | null>(null);
    
    const options = [
      { value: "high-school", label: "High School Student", icon: <School className="h-5 w-5" /> },
      { value: "college", label: "College / Undergraduate", icon: <GraduationCap className="h-5 w-5" /> },
      { value: "graduate", label: "Graduate / Phd", icon: <Building2 className="h-5 w-5" /> },
      { value: "teacher", label: "Teacher", icon: <User className="h-5 w-5" /> },
      { value: "professional", label: "Lifelong Learner / Professional", icon: <BookOpen className="h-5 w-5" /> },
      { value: "other", label: "Something Else", icon: <ShieldCheck className="h-5 w-5" /> },
    ];

    return (
      <div className="space-y-4 w-full max-w-md">
        <div className="space-y-2">
          {options.map((option) => (
            <CurioSelectMenuItem
              key={option.value}
              icon={option.icon}
              selected={selectedValue === option.value}
              onClick={(e) => {
                // This will trigger the action in Storybook's Actions panel
                args.onClick?.(e);
                setSelectedValue(option.value);
              }}
            >
              {option.label}
            </CurioSelectMenuItem>
          ))}
        </div>
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Selected:</strong> {selectedValue || "None"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click any option above and check the <strong>Actions</strong> panel below to see onClick events logged
          </p>
        </div>
      </div>
    );
  },
};
