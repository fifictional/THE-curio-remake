'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Lifestage = 'high-school' | 'college' | 'graduate' | 'teacher' | 'professional' | 'other';

export interface VariantBState {
  lifestage?: Lifestage;
  course?: string;
  userIntents: string[];
  userExam?: string;
  userExamDate?: string;
  userTopics?: string;
}

interface VariantBContextValue {
  state: VariantBState;
  updateLifestage: (lifestage: Lifestage) => void;
  updateCourse: (course: string) => void;
  updateIntents: (intents: string[]) => void;
  updateExam: (exam: string, examDate: string) => void;
  updateTopics: (topics: string) => void;
  resetState: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const defaultState: VariantBState = {
  userIntents: [],
};

const VariantBContext = createContext<VariantBContextValue | null>(null);

const STORAGE_KEY = 'onboarding_variant_b_state';

export function VariantBProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VariantBState>(defaultState);

  const updateLifestage = useCallback((lifestage: Lifestage) => {
    setState(prev => ({ ...prev, lifestage }));
  }, []);

  const updateCourse = useCallback((course: string) => {
    setState(prev => ({ ...prev, course }));
  }, []);

  const updateIntents = useCallback((userIntents: string[]) => {
    setState(prev => ({ ...prev, userIntents }));
  }, []);

  const updateExam = useCallback((userExam: string, userExamDate: string) => {
    setState(prev => ({ ...prev, userExam, userExamDate }));
  }, []);

  const updateTopics = useCallback((userTopics: string) => {
    setState(prev => ({ ...prev, userTopics }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const loadFromLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setState(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load VariantB state from localStorage', e);
        }
      }
    }
  }, []);

  return (
    <VariantBContext.Provider
      value={{
        state,
        updateLifestage,
        updateCourse,
        updateIntents,
        updateExam,
        updateTopics,
        resetState,
        saveToLocalStorage,
        loadFromLocalStorage,
      }}
    >
      {children}
    </VariantBContext.Provider>
  );
}

export function useVariantB(): VariantBContextValue {
  const ctx = useContext(VariantBContext);
  if (!ctx) {
    throw new Error('useVariantB must be used within VariantBProvider');
  }
  return ctx;
}
