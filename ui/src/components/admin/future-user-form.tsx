'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import type { FutureUser, FutureUserFormData } from "@/hooks/api/partnerships/use-future-users.api";
import type { Partnership } from "@/hooks/api/partnerships/use-partnerships.api";

interface FutureUserFormProps {
  value: FutureUser | null;
  partnerships: Partnership[];
  onCancel: () => void;
  onSubmit: (data: FutureUserFormData) => Promise<void>;
}

export function FutureUserForm({ value, partnerships, onCancel, onSubmit }: FutureUserFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [partnershipUuid, setPartnershipUuid] = useState<string>('');
  const [subStartDate, setSubStartDate] = useState('');
  const [subEndDate, setSubEndDate] = useState('');
  const [provider, setProvider] = useState<'paddle' | 'stripe' | 'apple' | 'google' | 'manual' | 'partnership'>('partnership');
  const [tier, setTier] = useState<'super' | 'ultra' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (value) {
      setEmail(value.email || '');
      setFirstName(value.firstName || '');
      setLastName(value.lastName || '');
      setPartnershipUuid(value.partnershipUuid || '');
      setSubStartDate(value.subStartDate ? new Date(value.subStartDate).toISOString().split('T')[0] : '');
      setSubEndDate(value.subEndDate ? new Date(value.subEndDate).toISOString().split('T')[0] : '');
      setProvider(value.provider || 'partnership');
      setTier(value.tier || '');
    } else {
      setEmail('');
      setFirstName('');
      setLastName('');
      setPartnershipUuid('');
      setSubStartDate('');
      setSubEndDate('');
      setProvider('partnership');
      setTier('');
    }
  }, [value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      alert('Please enter an email');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        partnershipUuid: partnershipUuid || undefined,
        // format dates to ISO string
        subStartDate: subStartDate ? new Date(subStartDate).toISOString() : undefined,
        subEndDate: subEndDate ? new Date(subEndDate).toISOString() : undefined,
        provider,
        tier: tier || undefined,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {value ? 'Edit Partnership User' : 'New Partnership User'}
        </h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnership">Partner</Label>
        <Select 
          value={partnershipUuid || 'none'} 
          onValueChange={(value) => setPartnershipUuid(value === 'none' ? '' : value)} 
          placeholder="Select a partner"
        >
          <SelectItem value="none">No Partner</SelectItem>
          {partnerships.map((partnership) => (
            <SelectItem key={partnership.partnershipUuid} value={partnership.partnershipUuid}>
              {partnership.partnerName}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subStartDate">Subscription Start Date</Label>
          <Input
            id="subStartDate"
            type="date"
            value={subStartDate}
            onChange={(e) => setSubStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subEndDate">Subscription End Date</Label>
          <Input
            id="subEndDate"
            type="date"
            value={subEndDate}
            onChange={(e) => setSubEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={(value) => setProvider(value as any)} placeholder="Select provider">
            <SelectItem value="partnership">Partnership</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="paddle">Paddle</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="google">Google</SelectItem>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tier">Tier</Label>
          <Select value={tier || 'none'} onValueChange={(value) => setTier(value === 'none' ? '' : value as 'super' | 'ultra')} placeholder="Select tier">
            <SelectItem value="none">No Tier</SelectItem>
            <SelectItem value="super">Super Curio</SelectItem>
            <SelectItem value="ultra">Ultra Curio</SelectItem>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : value ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

