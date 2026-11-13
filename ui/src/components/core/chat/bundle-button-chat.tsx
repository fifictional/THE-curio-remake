import { Button } from "@/components/ui/button";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Package } from "lucide-react";

export function BundleButtonChat({ modules }: { modules: string[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-11 h-11 relative shrink-0 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 ring-0 focus:ring-0"
          aria-label="Owned bundles"
        >
          <Package className="h-5 w-5 text-gray-700" />
          <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full border border-white">
            {modules.length}
          </span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] bg-white rounded-md shadow-lg border border-gray-200 p-2 z-50"
          sideOffset={6}
          align="start"
        >
          <div className="px-1 py-1 text-xs font-medium text-gray-500">Owned bundles</div>
          <div className="max-h-60 overflow-auto">
            {modules.map((m) => (
              <div key={m} className="px-2 py-1 text-sm text-gray-800 rounded hover:bg-gray-50 cursor-default">
                {m}
              </div>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}