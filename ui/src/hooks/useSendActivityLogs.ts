'use client';

import { useState, useCallback } from 'react';
import { useSendToLoops } from './useSendToLoops';
import { useSendToCio } from './useSendToCio';

interface Payload {
    [key: string]: any;
}

interface Response {
    success?: boolean;
    [key: string]: any;
}

export enum ActivityType {
    'LOOP' = 'loop',
    'CUSTOMERIO' = 'customerio'
}

export const useSendActivityLogs = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<Response[] | null>(null);
    const { sendToLoops } = useSendToLoops();
    const { sendToCio } = useSendToCio();

    const sendActivity = useCallback(async (props: Payload, type?: ActivityType) => {
        try {
            setLoading(true);
            setError(null);
            let activities: any[] = [];
            if (type) {
                switch (type) {
                    case ActivityType.CUSTOMERIO:
                        activities.push(sendToCio(props));
                        break;
                    case ActivityType.LOOP:
                        activities.push(sendToLoops(props));
                        break;
                }
            } else {
                activities = [sendToCio(props), sendToLoops(props)]
            }
            const response = await Promise.all(activities);

            if (!response) {
                throw new Error('Failed to send data to Loops');
            }

            setData(response);
            return response;
        } catch (err: any) {
            setError(err.message || 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        sendActivity,
        loading,
        error,
        data,
    };
};