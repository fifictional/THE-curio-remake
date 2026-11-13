'use client';

import { useEffect, useState } from "react";
import { getRandomQuote, type Quote } from "@/components/partner/partner-quotes";

export function GiftingImageSection() {
  const [quote, setQuote] = useState<Quote | null>(null);

  // Get random quote on mount
  useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  return (
    <div className="relative hidden md:block flex-1 w-1/2 min-h-screen">
      <div 
        className="w-full h-full z-10 pointer-events-none"
        style={{
          backgroundImage: `url(/gifting.png)`,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat',
          backgroundPosition: '0 0',
        }}
      >
        {quote && (
          // Quote Mode
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="border-4 border-primary bg-white rounded-md px-6 py-4 max-w-lg">
              <div className="flex flex-col justify-between space-y-6">
                {/* Center Quote */}
                <div className="flex-1 flex items-center justify-center px-4">
                  <p className="text-gray-800 italic text-lg md:text-xl leading-relaxed">
                    {quote.text}
                  </p>
                </div>

                {/* Bottom Right Attribution */}
                <div className="flex justify-end">
                  <p className="text-gray-800 font-semibold text-sm md:text-base">
                    {quote.attribution}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

