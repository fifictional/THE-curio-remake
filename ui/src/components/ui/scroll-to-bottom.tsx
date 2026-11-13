"use client";

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToBottomButtonProps {
    containerRef: React.RefObject<HTMLElement>;
}

export function ScrollToBottomButton({ containerRef }: ScrollToBottomButtonProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const checkVisibility = () => {
            const atBottom =
                Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5;
            const canScroll = el.scrollHeight > el.clientHeight + 2;

            // Show only when content overflows and not at the bottom
            setIsVisible(canScroll && !atBottom);
        };

        // Run initial check
        checkVisibility();

        // Attach scroll listener
        el.addEventListener("scroll", checkVisibility);

        // Observe content changes (e.g., new messages)
        const observer = new MutationObserver(checkVisibility);
        observer.observe(el, { childList: true, subtree: true });

        // Also handle window resize (mobile keyboard, etc)
        window.addEventListener("resize", checkVisibility);

        return () => {
            try {
                el.removeEventListener('scroll', checkVisibility);
                window.removeEventListener('resize', checkVisibility);
                observer.disconnect();
            } catch {
                // Ignore cleanup errors if el is detached
            }
        };
    }, [containerRef]);

    const handleScrollToBottom = () => {
        const el = containerRef.current;
        if (!el) return;

        el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
        });
    };

    if (!isVisible) return null;

    return (
        <Button
            onClick={handleScrollToBottom}
            variant="outline"
            size="icon"
            className="
                h-7 w-7
                absolute left-1/2 -translate-x-1/2 bottom-40 lg:right-60 lg:bottom-20  md:right-90 md:bottom-50
                z-50 rounded-full shadow-lg
                bg-background/80 backdrop-blur-sm
                hover:bg-background
                border border-gray-300
                transition-transform duration-200 hover:scale-105
            "
            aria-label="Scroll to bottom"
        >
            <ArrowDown className="h-5 w-5 text-gray-600" />
        </Button>
    );
}
