import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { Task } from "@/lib/types/task";

type RequestType = Schema['Task']['type'];

type SubscriptionInputType = {
  userUuid: string | null;
}

export function useProcessingTasksApi({ 
  userUuid,
}: {
  userUuid: string | null;
}) {
  const client = useAmplifyApiClient();

  const [processingTasks, setProcessingTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [failedTasks, setFailedTasks] = useState<Task[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Task.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: (data) => {
        if (data.status === "PROCESSING" && data.type === "DOCUMENT_PROCESSING") {
          setProcessingTasks((prev) => [data, ...prev]);
        } else if (data.status === "PENDING" && data.type === "DOCUMENT_PROCESSING") {
          setPendingTasks((prev) => [data, ...prev]);
        } else if (data.status === "FAILED" && data.type === "DOCUMENT_PROCESSING") {
          setFailedTasks((prev) => [data, ...prev]);
        }
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Task.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: (data) => {
        // delete the task from every list
        setProcessingTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));
        setPendingTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));
        setFailedTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));

        // add the task to the correct list
        if (data.status === "PROCESSING") {
          setProcessingTasks((prev) => [data, ...prev]);
        } else if (data.status === "PENDING") {
          setPendingTasks((prev) => [data, ...prev]);
        } else if (data.status === "FAILED") {
          setFailedTasks((prev) => [data, ...prev]);
        }
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Task.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
    }).subscribe({
      next: (data) => {
        setProcessingTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));
        setPendingTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));
        setFailedTasks((prev) => prev.filter((task) => task.taskUuid !== data.taskUuid));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userUuid;
  }, []);

  const subInput = useMemo(() => ({ userUuid }), [userUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'all',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const getTasks = useCallback(async (userUuid: string) => {
    const response = await client.models.Task.listTaskByUserUuidAndCreatedAt({
      userUuid,
    }, {
      filter: {
        type: { eq: "DOCUMENT_PROCESSING" },
      },
      limit: 100,
      sortDirection: "DESC",
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setProcessingTasks([...data.filter((task) => !!task.documentUuid && task.status === "PROCESSING" && task.type === "DOCUMENT_PROCESSING") as Task[]]);
    setPendingTasks([...data.filter((task) => !!task.documentUuid && task.status === "PENDING" && task.type === "DOCUMENT_PROCESSING") as Task[]]);
    setFailedTasks([...data.filter((task) => !!task.documentUuid && task.status === "FAILED" && task.type === "DOCUMENT_PROCESSING") as Task[]]);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['tasks', userUuid!, 'processing'],
    queryFn: () => getTasks(userUuid!),
    options: {
      enabled: !!userUuid,
      onData,
    },
  });

  // memoize the arrays to prevent infinite re-renders
  const processingDocumentsUuids = useMemo(() => processingTasks.map((task) => task.documentUuid!), [processingTasks]);
  const pendingDocumentsUuids = useMemo(() => pendingTasks.map((task) => task.documentUuid!), [pendingTasks]);
  const failedDocumentsUuids = useMemo(() => failedTasks.map((task) => task.documentUuid!), [failedTasks]);

  return {
    isLoading,
    processingTasks: processingTasks.length,
    processingDocumentsUuids,
    pendingDocumentsUuids,
    failedDocumentsUuids,
  };
}
