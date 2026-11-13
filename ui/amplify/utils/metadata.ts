import type { Schema } from "@database-schema";
import type { Client } from "aws-amplify/api";

/**
 * Metadata utility functions for accessing metadata from backend and lambda functions.
 * 
 * The metadata system allows attaching key-value pairs to any entity with an ID.
 * Use cases include:
 * - Stats: Get all tags by type in a time range
 * - Debug: Document xx scored yy because description
 */

type MetadataClient = Client<Schema>;

/**
 * Create a metadata entry
 */
export async function createMetadata(
  client: MetadataClient,
  params: {
    targetUuid: string;
    targetType: string;
    name: string;
    value: string;
  }
): Promise<{ metadataUuid: string }> {
  const now = new Date().toISOString();
  const metadataUuid = crypto.randomUUID();

  await client.models.Metadata.create({
    metadataUuid,
    targetUuid: params.targetUuid,
    targetType: params.targetType,
    name: params.name,
    value: params.value,
    createdAt: now,
    updatedAt: now,
  });

  return { metadataUuid };
}

/**
 * Get all metadata entries for a specific target (entity)
 */
export async function getMetadataByTarget(
  client: MetadataClient,
  targetUuid: string
): Promise<Array<{
  metadataUuid: string;
  targetUuid: string;
  targetType: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}>> {
  const response = await client.models.Metadata.list({
    filter: { targetUuid: { eq: targetUuid } },
    selectionSet: [
      'metadataUuid',
      'targetUuid',
      'targetType',
      'name',
      'value',
      'createdAt',
      'updatedAt',
    ],
  });

  return response.data || [];
}

/**
 * Get all metadata entries for a specific target and name
 * Useful when you want to get all values for a specific metadata key on a target
 */
export async function getMetadataByTargetAndName(
  client: MetadataClient,
  targetUuid: string,
  name: string
): Promise<Array<{
  metadataUuid: string;
  targetUuid: string;
  targetType: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}>> {
  const allMetadata = await getMetadataByTarget(client, targetUuid);
  return allMetadata.filter((m) => m.name === name);
}

/**
 * Get all metadata entries by target type, sorted by creation time
 * Useful for stats: "give all tags by type in time range"
 */
export async function getMetadataByType(
  client: MetadataClient,
  targetType: string,
  options?: {
    startTime?: string; // ISO datetime string
    endTime?: string; // ISO datetime string
    limit?: number;
  }
): Promise<Array<{
  metadataUuid: string;
  targetUuid: string;
  targetType: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}>> {
  const response = await client.models.Metadata.list({
    filter: { targetType: { eq: targetType } },
    selectionSet: [
      'metadataUuid',
      'targetUuid',
      'targetType',
      'name',
      'value',
      'createdAt',
      'updatedAt',
    ],
  });

  let results = response.data || [];

  // Filter by time range if provided
  if (options?.startTime || options?.endTime) {
    results = results.filter((item) => {
      const createdAt = item.createdAt;
      if (options.startTime && createdAt < options.startTime) {
        return false;
      }
      if (options.endTime && createdAt > options.endTime) {
        return false;
      }
      return true;
    });
  }

  // Limit results if provided
  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Update a metadata entry's value
 */
export async function updateMetadata(
  client: MetadataClient,
  metadataUuid: string,
  value: string
): Promise<void> {
  await client.models.Metadata.update({
    metadataUuid,
    value,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a metadata entry
 */
export async function deleteMetadata(
  client: MetadataClient,
  metadataUuid: string
): Promise<void> {
  await client.models.Metadata.delete({ metadataUuid });
}

/**
 * Delete all metadata entries for a specific target
 * Useful when deleting an entity and cleaning up its metadata
 */
export async function deleteMetadataByTarget(
  client: MetadataClient,
  targetUuid: string
): Promise<number> {
  const metadataEntries = await getMetadataByTarget(client, targetUuid);
  
  // Delete all entries
  await Promise.all(
    metadataEntries.map((entry) =>
      client.models.Metadata.delete({ metadataUuid: entry.metadataUuid })
    )
  );

  return metadataEntries.length;
}

/**
 * Helper to set metadata (create or update if exists)
 * If multiple entries with same name exist, updates the first one
 */
export async function setMetadata(
  client: MetadataClient,
  params: {
    targetUuid: string;
    targetType: string;
    name: string;
    value: string;
  }
): Promise<{ metadataUuid: string; created: boolean }> {
  // Check if metadata with same targetUuid and name exists
  const existing = await getMetadataByTargetAndName(
    client,
    params.targetUuid,
    params.name
  );

  if (existing.length > 0) {
    // Update the first one
    await updateMetadata(client, existing[0].metadataUuid, params.value);
    return { metadataUuid: existing[0].metadataUuid, created: false };
  } else {
    // Create new
    const { metadataUuid } = await createMetadata(client, params);
    return { metadataUuid, created: true };
  }
}


