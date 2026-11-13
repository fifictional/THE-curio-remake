import * as React from "react";
import {
    CurioListMenuActionButton,
} from "./curio-list-menu-action-button";
import { LucideIcon } from "lucide-react";


export interface CurioListMenuActionItem {
    id: string;
    label: string;
    icon: LucideIcon;

    /** Optional behaviors */
    onSelect?: (id: string) => void;
    href?: string;
    disabled?: boolean;
}

interface CurioListMenuActionProps {
    items: CurioListMenuActionItem[];
    value?: string;
    defaultValue?: string;
    onChange?: (id: string) => void;
}

export const CurioListMenuAction = ({
    items,
    value,
    defaultValue,
    onChange,
}: CurioListMenuActionProps) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const activeValue = value ?? internalValue;

    const handleSelect = (item: CurioListMenuActionItem) => {
        if (item.disabled) return;

        if (value === undefined) {
            setInternalValue(item.id);
        }

        item.onSelect?.(item.id);
        onChange?.(item.id);
    };

    return (
        <div className="inline-flex items-center gap-3 md:gap-2 bg-white rounded-full shadow-lg border border-gray-200 px-2 py-2 md:px-3">
            {items.map((item) => (
                <CurioListMenuActionButton
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    href={item.href}
                    disabled={item.disabled}
                    active={item.id === activeValue}
                    onClick={() => handleSelect(item)}
                />
            ))}
        </div>
    );
};
