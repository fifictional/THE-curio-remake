'use client';

import { createContext, useContext } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../amplify_outputs.json';
import type { Client } from 'aws-amplify/api';
import type { Schema } from '@amplify/data/resource';
import { createLocalClient } from '@/lib/local-data-client';

/**
 * Patched for the remake: instead of two Amplify clients pointed at AppSync,
 * one local client talks to the new API (`POST /db`). Auth mode is irrelevant
 * now — the session cookie decides, and Postgres RLS enforces it.
 */
// Amplify's own internals (UI package, auth event bus) expect a configured
// instance; the stub outputs keep that quiet. Real auth goes through the shim.
Amplify.configure(awsExports);

// The runtime is a Proxy over the new API; the TYPE stays Amplify's generated
// Client<Schema> so all 342 existing call sites keep their types.
const client = createLocalClient() as unknown as Client<Schema>;
const userClient = client;

type AmplifyContextType = {
  client: Client<Schema>;
  userClient: Client<Schema>;
};

const AmplifyContext = createContext<AmplifyContextType | undefined>(undefined);

export function useAmplifyApiClient() {
  const context = useContext(AmplifyContext);
  if (!context) throw new Error('useAmplifyClient must be used within an AmplifyProvider');
  return context.client;
}

export function useAmplifyUserApiClient() {
  const context = useContext(AmplifyContext);
  if (!context) throw new Error('useAmplifyClient must be used within an AmplifyProvider');
  return context.userClient;
}

export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  return (
    <AmplifyContext.Provider value={{ client, userClient }}>{children}</AmplifyContext.Provider>
  );
}
