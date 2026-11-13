import type { Schema } from "@database-schema";
import { generateClient } from "aws-amplify/api";

/**
 * Update task status with granular step information
 */
export async function updateTaskStatus(
  client: ReturnType<typeof generateClient<Schema>>,
  taskUuid: string,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  progress?: number,
  error?: string
): Promise<void> {
  const updateData: Schema['Task']['updateType'] = {
    taskUuid,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (progress !== undefined) {
    updateData.progress = progress;
  }

  if (error) {
    updateData.error = error;
  }

  await client.models.Task.update(updateData);
}

