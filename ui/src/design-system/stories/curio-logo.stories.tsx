import type { Meta, StoryObj } from "@storybook/react";
import { CurioLogo, SubscriptionLevel } from "../curio-logo";
import { useState } from "react";

const meta: Meta<typeof CurioLogo> = {
  title: "Design System/CurioLogo",
  component: CurioLogo,
  tags: ["autodocs"],
  argTypes: {
    subscriptionLevel: {
      control: "select",
      options: ["none", "super", "ultra"],
    },
    collapsed: {
      control: "boolean",
    },
    showLink: {
      control: "boolean",
    },
  },
  args: {
    subscriptionLevel: "none",
    collapsed: false,
    showLink: true,
  },
};

export default meta;
type Story = StoryObj<typeof CurioLogo>;

export const Default: Story = {
  args: {
    subscriptionLevel: "none",
  },
};

export const Super: Story = {
  args: {
    subscriptionLevel: "super",
  },
};

export const Ultra: Story = {
  args: {
    subscriptionLevel: "ultra",
  },
};

export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

export const CollapsedSuper: Story = {
  args: {
    subscriptionLevel: "super",
    collapsed: true,
  },
};

export const CollapsedUltra: Story = {
  args: {
    subscriptionLevel: "ultra",
    collapsed: true,
  },
};

export const SubscriptionTransitions: Story = {
  render: () => {
    const [subscriptionLevel, setSubscriptionLevel] = useState<SubscriptionLevel>("none");
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="p-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Subscription Level</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setSubscriptionLevel("none")}
              className={`px-4 py-2 rounded-md ${
                subscriptionLevel === "none" 
                  ? "bg-gray-800 text-white" 
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              None
            </button>
            <button
              onClick={() => setSubscriptionLevel("super")}
              className={`px-4 py-2 rounded-md ${
                subscriptionLevel === "super" 
                  ? "bg-gray-800 text-white" 
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              Super
            </button>
            <button
              onClick={() => setSubscriptionLevel("ultra")}
              className={`px-4 py-2 rounded-md ${
                subscriptionLevel === "ultra" 
                  ? "bg-gray-800 text-white" 
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              Ultra
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Collapsed State</h2>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`px-4 py-2 rounded-md ${
              collapsed 
                ? "bg-gray-800 text-white" 
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {collapsed ? "Expanded" : "Collapsed"}
          </button>
        </div>

        <div className="border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Logo Preview</h3>
          <CurioLogo
            subscriptionLevel={subscriptionLevel}
            collapsed={collapsed}
            onLogoClick={() => console.log("Logo clicked")}
            showLink={false}
          />
        </div>

        <div className="text-sm text-gray-600">
          <p>Current subscription: <strong>{subscriptionLevel}</strong></p>
          <p>Collapsed: <strong>{collapsed ? "Yes" : "No"}</strong></p>
        </div>
      </div>
    );
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="p-8 space-y-12">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Expanded</h2>
        <div className="flex flex-col gap-6 border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
          <div>
            <p className="text-sm text-gray-600 mb-2">None</p>
            <CurioLogo subscriptionLevel="none" showLink={false} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Super</p>
            <CurioLogo subscriptionLevel="super" showLink={false} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Ultra</p>
            <CurioLogo subscriptionLevel="ultra" showLink={false} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Collapsed</h2>
        <div className="flex flex-col gap-6 border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
          <div>
            <p className="text-sm text-gray-600 mb-2">None</p>
            <CurioLogo subscriptionLevel="none" collapsed showLink={false} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Super</p>
            <CurioLogo subscriptionLevel="super" collapsed showLink={false} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Ultra</p>
            <CurioLogo subscriptionLevel="ultra" collapsed showLink={false} />
          </div>
        </div>
      </div>
    </div>
  ),
};
