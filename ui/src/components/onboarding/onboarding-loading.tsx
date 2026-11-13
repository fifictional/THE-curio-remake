'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export function OnboardingLoading() {
  return (
    <div className="w-full max-w-96 flex flex-col justify-center items-center gap-6">
      <Image src="/onboarding/cat_construction_laptop.png" alt="Loading" width={300} height={300} className="w-auto h-auto object-contain" />
      <p className="text-lg text-gray-600">Setting up your account...</p>
    </div>
  );
}
