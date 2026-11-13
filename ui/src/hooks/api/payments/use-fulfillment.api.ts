import { useCallback } from "react";
import { useAmplifyApiClient } from "@/providers";

type FulfillArgs = {
    userId: string;
    bundleUuid: string;
    provider: "manual" | "stripe" | "paddle" | "google" | "apple" | "other";
    receiptPayload?: string | null;
};

/**
 * Hook for fulfilling purchases
 * 
 * NOTE: This now uses the fulfillPurchase Lambda function which has
 * resource-level authorization to create Purchase/Receipt records.
 * This is more secure than using publicApiKey to write directly.
 */
export const useFulfillmentApi = () => {
    const client = useAmplifyApiClient();

    const registerPurchase = useCallback(async (props: FulfillArgs) => {
        const { userId, bundleUuid, provider, receiptPayload } = props;

        if (!userId || !bundleUuid) {
            throw new Error('Missing userId or bundleUuid');
        }

        // Look up the bundle's SKU (need it for the Lambda function)
        const bundleResponse = await client.models.Bundle.get(
            { bundleUuid },
            { selectionSet: ['bundleUuid', 'defaultSku'] }
        );

        if (bundleResponse.errors || !bundleResponse.data) {
            throw new Error('Bundle not found');
        }

        const sku = bundleResponse.data.defaultSku;
        if (!sku) {
            throw new Error('Bundle has no SKU');
        }

        // Call the fulfillPurchase Lambda function
        const result = await client.queries.fulfillPurchase({
            sku,
            userId,
            provider,
            receiptPayload,
        });

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        if (!result.data) {
            throw new Error('Fulfillment failed: No data returned');
        }

        if (result.data.warning) {
            console.warn('[use-fulfillment] Receipt creation warning:', result.data.warning);
        }

        return { success: result.data.success };
    }, [client]);

    return { registerPurchase };
}
