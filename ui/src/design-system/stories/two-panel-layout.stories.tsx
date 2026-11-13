import type { Meta, StoryObj } from "@storybook/react";
import { TwoPanelLayout } from "../two-panel-layout";
import { SelectMenu } from "@/components/ui/select-menu";
import { GraduationCap, School, Building2, User, BookOpen, ShieldCheck } from "lucide-react";
import Image from "next/image";

const meta: Meta<typeof TwoPanelLayout> = {
  title: "Design System/TwoPanelLayout",
  component: TwoPanelLayout,
  tags: ["autodocs"],
  argTypes: {
    ghostPanel: {
      control: "select",
      options: ["left", "right", "none"],
    },
    leftPanelScrollable: {
      control: "boolean",
    },
    rightPanelScrollable: {
      control: "boolean",
    },
  },
  args: {
    ghostPanel: "none",
    leftPanelScrollable: false,
    rightPanelScrollable: false,
  },
};

export default meta;
type Story = StoryObj<typeof TwoPanelLayout>;

export const Default: Story = {
  args: {
    leftPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Left Panel</h2>
        <p>This is the left panel content</p>
      </div>
    ),
    rightPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Right Panel</h2>
        <p>This is the right panel content</p>
      </div>
    ),
  },
};

export const RightPanelGhost: Story = {
  args: {
    ghostPanel: "right",
    leftPanel: (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hey Nik 👋 Welcome to Curio!</h1>
          <p className="text-sm text-gray-600 mt-2">
            Set up your classroom by answering a few questions about you and your goals.
          </p>
        </div>
        <SelectMenu
          title="What best describes you? (Select one)"
          options={[
            { value: "high-school", label: "High School Student", icon: <School className="h-5 w-5" /> },
            { value: "college", label: "College / Undergraduate", icon: <GraduationCap className="h-5 w-5" /> },
            { value: "graduate", label: "Graduate / Phd", icon: <Building2 className="h-5 w-5" /> },
            { value: "teacher", label: "Teacher", icon: <User className="h-5 w-5" /> },
            { value: "professional", label: "Lifelong Learner / Professional", icon: <BookOpen className="h-5 w-5" /> },
            { value: "other", label: "Something Else", icon: <ShieldCheck className="h-5 w-5" /> },
          ]}
        />
      </div>
    ),
    rightPanel: (
      <div 
        className="w-full h-full z-10 pointer-events-none relative"
        style={{
          backgroundImage: `url(curio/curio-with-tie.png)`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
        }}
      />
    ),
  },
};

export const LeftPanelGhost: Story = {
  args: {
    ghostPanel: "left",
    leftPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Left Panel (Ghost)</h2>
        <p>This left panel has no background</p>
      </div>
    ),
    rightPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Right Panel</h2>
        <p>This right panel has a white background</p>
      </div>
    ),
  },
};

export const ScrollableLeftPanel: Story = {
  args: {
    leftPanelScrollable: true,
    leftPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Scrollable Left Panel</h2>
        {Array.from({ length: 30 }, (_, i) => (
          <p key={i} className="text-sm">
            Line {i + 1}: This content will scroll when it exceeds the panel height
          </p>
        ))}
      </div>
    ),
    rightPanel: (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Right Panel</h2>
        <p>This panel is not scrollable</p>
      </div>
    ),
  },
};
