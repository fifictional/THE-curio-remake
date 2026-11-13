import fetch from 'node-fetch';

const mutation = `
  mutation UpdateTask($input: UpdateTaskInput!) {
    updateTask(input: $input) {
      taskUuid
      userUuid
      documentUuid
      type
      progress
      error
      result
      status
      createdAt
      updatedAt
    }
  }
`;

export const updateTask = async (taskUuid: string, status: string) => {
  if (!process.env.APPSYNC_URL || !process.env.APPSYNC_API_KEY) {
    throw new Error('APPSYNC_URL or APPSYNC_API_KEY is not set');
  }

  const response = await fetch(process.env.APPSYNC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.APPSYNC_API_KEY!,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          taskUuid: taskUuid,
          status: status,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update task');
  }

  console.log(`Task ${taskUuid} updated to ${status}`);
};
