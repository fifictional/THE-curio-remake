'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";

interface GrantSubscriptionDialogProps {
  onGrant: (payload: { months: number; tier: 'super' | 'ultra'; status: 'active' | 'trialing' }) => Promise<void>;
  disabled: boolean;
}

export function GrantSubscriptionDialog({
  onGrant,
  disabled,
}: GrantSubscriptionDialogProps) {
  const [months, setMonths] = useState('1');
  const [tier, setTier] = useState<'super' | 'ultra'>('super');
  const [status, setStatus] = useState<'active' | 'trialing'>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const monthsNum = parseInt(months);
    if (!monthsNum || monthsNum < 1 || monthsNum > 120) {
      setError('Enter a valid number of months (1-120).');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onGrant({ months: monthsNum, tier, status });
      setMonths('1');
      setTier('super');
      setStatus('active');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Input
        type="number"
        min="1"
        max="120"
        value={months}
        onChange={(e) => setMonths(e.target.value)}
        placeholder="Months"
        disabled={disabled}
        className="sm:w-24"
      />
      <Select 
        value={tier} 
        onValueChange={(val) => setTier(val as 'super' | 'ultra')}
        disabled={disabled}
        className="sm:w-32"
      >
        <SelectItem value="super">Super Curio</SelectItem>
        <SelectItem value="ultra">Ultra Curio</SelectItem>
      </Select>
      <Select 
        value={status} 
        onValueChange={(val) => setStatus(val as 'active' | 'trialing')}
        disabled={disabled}
        className="sm:w-32"
      >
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="trialing">Trial</SelectItem>
      </Select>
      <Button onClick={handleSubmit} disabled={disabled || isSubmitting}>
        {isSubmitting ? 'Granting…' : 'Grant Subscription'}
      </Button>
      {error && <p className="text-xs text-red-600 self-center">{error}</p>}
    </div>
  );
}

