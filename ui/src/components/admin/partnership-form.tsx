'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { uploadData } from '@aws-amplify/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Partnership, PartnershipFormData } from "@/hooks/api/partnerships/use-partnerships.api";
import { getUrl } from "@/lib/local-storage";

interface PartnershipFormProps {
  value: Partnership | null;
  onCancel: () => void;
  onSubmit: (data: PartnershipFormData) => Promise<void>;
}

export function PartnershipForm({ value, onCancel, onSubmit }: PartnershipFormProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [priceRecordOverrides, setPriceRecordOverrides] = useState('');
  const [priceRecordOverridesError, setPriceRecordOverridesError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (value) {
      setPartnerName(value.partnerName || '');
      setPartnerCode(value.partnerCode || '');
      setPriceRecordOverrides(value.priceRecordOverrides || '');
      if (value.logoS3Key) {
        // Load existing logo preview
        getUrl({ path: value.logoS3Key })
          .then((url) => {
            setLogoPreview(url.url.toString());
          })
          .catch((error) => {
            console.error('Error loading logo preview:', error);
          });
      }
    } else {
      setPartnerName('');
      setPartnerCode('');
      setPriceRecordOverrides('');
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const validateJson = (jsonString: string): boolean => {
    if (!jsonString.trim()) {
      return true; // Empty is valid
    }
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  const handlePriceRecordOverridesChange = (value: string) => {
    setPriceRecordOverrides(value);
    if (value.trim() && !validateJson(value)) {
      setPriceRecordOverridesError('Invalid JSON format');
    } else {
      setPriceRecordOverridesError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partnerName.trim()) {
      alert('Please enter a partner name');
      return;
    }

    if (!partnerCode.trim()) {
      alert('Please enter a partner code');
      return;
    }

    // Validate JSON before submitting
    if (priceRecordOverrides.trim() && !validateJson(priceRecordOverrides)) {
      setPriceRecordOverridesError('Invalid JSON format. Please fix before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      let logoS3Key: string | undefined = value?.logoS3Key || undefined;

      // Upload new logo if selected
      if (logoFile) {
        setIsUploading(true);
        try {
          const fileExtension = logoFile.name.split('.').pop();
          const s3Key = `partnerships/logos/${uuidv4()}.${fileExtension}`;
          
          await uploadData({
            data: logoFile,
            path: s3Key,
            options: {
              contentType: logoFile.type,
            },
          }).result;

          logoS3Key = s3Key;
        } catch (error) {
          console.error('Error uploading logo:', error);
          alert('Failed to upload logo. Please try again.');
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      await onSubmit({
        partnerName: partnerName.trim(),
        partnerCode: partnerCode.trim(),
        logoS3Key,
        priceRecordOverrides: priceRecordOverrides.trim() || undefined,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to save partner. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {value ? 'Edit Partner' : 'New Partner'}
        </h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerName">Partner Name *</Label>
        <Input
          id="partnerName"
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          placeholder="Enter partner name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerCode">Partner Code *</Label>
        <Input
          id="partnerCode"
          value={partnerCode}
          onChange={(e) => setPartnerCode(e.target.value)}
          placeholder="Enter partner code (e.g., ACME)"
          required
        />
        <p className="text-xs text-muted-foreground">
          Unique identifier code for this partner (used as string ID)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceRecordOverrides">Price Record Overrides</Label>
        <Textarea
          id="priceRecordOverrides"
          value={priceRecordOverrides}
          onChange={(e) => handlePriceRecordOverridesChange(e.target.value)}
          placeholder='{"example": "json"}'
          className={`font-mono text-sm ${priceRecordOverridesError ? 'border-red-500' : ''}`}
          rows={6}
        />
        {priceRecordOverridesError && (
          <p className="text-xs text-red-600">{priceRecordOverridesError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          JSON string for price record overrides. Leave empty if not needed.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="space-y-2">
          {logoPreview ? (
            <div className="relative inline-block">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-32 h-32 object-contain border rounded"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="logo-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-600">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isUploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting || isUploading ? 'Saving...' : value ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

