'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

type BaseSelectProps = Omit<SelectPrimitive.SelectProps, 'value' | 'onValueChange'> & {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export const Select = forwardRef<HTMLButtonElement, BaseSelectProps>(
  ({ children, className, value, onValueChange, placeholder, ...props }, ref) => {
    return (
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={`inline-flex items-center justify-between rounded-md px-4 py-2 gap-2 bg-white border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none data-[placeholder]:text-gray-500 ${className || ''}`}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200">
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default" />
            <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-500 cursor-default" />
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

export const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <SelectPrimitive.Item
    value={value}
    className="relative flex items-center px-8 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none select-none data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
      <Check className="h-4 w-4" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
);