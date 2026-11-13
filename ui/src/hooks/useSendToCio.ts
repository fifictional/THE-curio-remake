'use client';

import { useState, useCallback } from 'react';

interface LoopsPayload {
  [key: string]: any;
}

interface LoopsResponse {
  success?: boolean;
  [key: string]: any;
}

export const useSendToCio = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoopsResponse | null>(null);

  const sendToCio = useCallback(async (props: LoopsPayload) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/send-cio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(props),
      });

      if (!response.ok) {
        throw new Error('Failed to send data to Loops');
      }

      const json = await response.json();
      setData(json);
      return json;
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendToCio,
    loading,
    error,
    data,
  };
};