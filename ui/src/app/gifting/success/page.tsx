"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { GiftingImageSection } from "@/components/gifting/gifting-image-section";

export default function GiftingCheckoutSuccessPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateAccount = () => {
    // Redirect to signup
    router.push('/signup');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex w-full min-h-screen text-gray-700">
      {/* Left side - Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-1/2 min-h-screen p-6 md:p-10">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600">
              Your gift has been sent! The recipient will receive an email with instructions to claim their subscription.
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button
              onClick={handleCreateAccount}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg"
            >
              Create Your Account
            </Button>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-gray-500 pt-4">
            Already have an account?{" "}
            <button
              onClick={() => router.push('/signin')}
              className="text-blue-600 hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Right side - Image with Quote */}
      <GiftingImageSection />
    </div>
  );
}

