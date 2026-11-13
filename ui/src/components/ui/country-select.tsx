'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { COUNTRIES, getCountryName } from '@/lib/utils/countries';

interface CountrySelectProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({ value, onChange, placeholder = 'Select a country', className = '' }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (countryCode: string | null) => {
    onChange(countryCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayValue = value ? getCountryName(value) : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between w-full rounded-md px-4 py-2 gap-2 bg-white border border-gray-200 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${!value ? 'text-gray-500' : 'text-gray-900'} ${className}`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-[400px] flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* Countries list */}
          <div className="overflow-y-auto flex-1">
            {/* "Not set" option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="relative flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              <span className="flex-1 text-left">Not set</span>
              {!value && (
                <Check className="h-4 w-4 text-gray-900" />
              )}
            </button>

            {/* Country options */}
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country.code)}
                  className="relative flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <span className="flex-1 text-left">{country.name}</span>
                  {value === country.code && (
                    <Check className="h-4 w-4 text-gray-900" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

