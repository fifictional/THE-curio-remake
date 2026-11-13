import type { Meta, StoryObj } from "@storybook/react";
import { CurioUserInfo } from "../curio-user-info";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";

const meta: Meta<typeof CurioUserInfo> = {
  title: "Design System/CurioUserInfo",
  component: CurioUserInfo,
  tags: ["autodocs"],
  argTypes: {
    collapsed: {
      control: "boolean",
    },
    href: {
      control: "text",
    },
  },
  args: {
    name: "John Doe",
    href: "/profile",
  },
};

export default meta;
type Story = StoryObj<typeof CurioUserInfo>;

export const Default: Story = {
  args: {
    name: "John Doe",
    href: "/profile",
  },
};

export const WithRightButton: Story = {
  args: {
    name: "John Doe",
    href: "/profile",
    rightButton: (
      <LogOut 
        className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
        onClick={() => console.log("Sign out clicked")}
      />
    ),
  },
};

export const Collapsed: Story = {
  args: {
    name: "John Doe",
    href: "/profile",
    collapsed: true,
  },
};

export const CollapsedWithButton: Story = {
  args: {
    name: "John Doe",
    href: "/profile",
    collapsed: true,
    rightButton: (
      <LogOut 
        className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
        onClick={() => console.log("Sign out clicked")}
      />
    ),
  },
};

export const WithoutLink: Story = {
  args: {
    name: "John Doe",
    onNameClick: () => console.log("Name clicked"),
    rightButton: (
      <Settings 
        className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
        onClick={() => console.log("Settings clicked")}
      />
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="p-8 space-y-8">
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
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        <div className="border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">User Info Preview</h3>
          <CurioUserInfo
            name="John Doe"
            href="/profile"
            collapsed={collapsed}
            rightButton={
              !collapsed ? (
                <LogOut 
                  className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
                  onClick={() => console.log("Sign out clicked")}
                />
              ) : undefined
            }
            onNameClick={() => console.log("Profile clicked")}
          />
        </div>

        <div className="text-sm text-gray-600">
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
            <p className="text-sm text-gray-600 mb-2">Basic</p>
            <CurioUserInfo
              name="John Doe"
              href="/profile"
            />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">With Right Button</p>
            <CurioUserInfo
              name="Alice Brown"
              href="/profile"
              rightButton={
                <LogOut 
                  className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
                  onClick={() => console.log("Sign out clicked")}
                />
              }
            />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Without Link</p>
            <CurioUserInfo
              name="Charlie Smith"
              onNameClick={() => console.log("Clicked")}
              rightButton={
                <Settings 
                  className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
                  onClick={() => console.log("Settings clicked")}
                />
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Collapsed</h2>
        <div className="flex flex-col gap-6 border-2 border-gray-200 rounded-lg p-8 bg-gray-50">
          <div>
            <p className="text-sm text-gray-600 mb-2">Basic</p>
            <CurioUserInfo
              name="John Doe"
              href="/profile"
              collapsed
            />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">With Right Button (hidden when collapsed)</p>
            <CurioUserInfo
              name="Alice Brown"
              href="/profile"
              collapsed
              rightButton={
                <LogOut 
                  className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors" 
                  onClick={() => console.log("Sign out clicked")}
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  ),
};
