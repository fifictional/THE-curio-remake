import { useCallback, useEffect, useRef } from "react";
import { Subscription } from "rxjs";

export type SubscriptionOptions<T> = {
  subscriptions: 'none' | 'create' | 'delete' | 'update' | 'all' | 'create-update' | 'create-delete' | 'update-delete';
  input: T;
  createFunc?: (input: T) => Subscription;
  updateFunc?: (input: T) => Subscription;
  deleteFunc?: (input: T) => Subscription;
  onValidate?: (input: T) => boolean;
}

export const useSubscription = <T>(options: SubscriptionOptions<T>) => {
  const { subscriptions, input, createFunc, updateFunc, deleteFunc, onValidate } = options || {};

  const onCreateRef = useRef<Subscription | null>(null);
  const onDeleteRef = useRef<Subscription | null>(null);
  const onUpdateRef = useRef<Subscription | null>(null);

  useEffect(() => {
    clearSubscriptions();

    if (!onValidate?.(input)) {
      return;
    }

    if (subscriptions === 'create' || subscriptions === 'all' || subscriptions === 'create-update' || subscriptions === 'create-delete') {
      onCreateRef.current = createFunc?.(input) || null;
    }
    if (subscriptions === 'update' || subscriptions === 'all' || subscriptions === 'create-update' || subscriptions === 'update-delete') {
      onUpdateRef.current = updateFunc?.(input) || null;
    }
    if (subscriptions === 'delete' || subscriptions === 'all' || subscriptions === 'create-delete' || subscriptions === 'update-delete') {
      onDeleteRef.current = deleteFunc?.(input) || null;
    }

    return clearSubscriptions;
  }, [createFunc, updateFunc, deleteFunc, input, subscriptions, onValidate]);

  const clearSubscriptions = useCallback(() => {
    if (onCreateRef.current) {
      onCreateRef.current.unsubscribe();
      onCreateRef.current = null;
    }
    if (onDeleteRef.current) {
      onDeleteRef.current.unsubscribe();
      onDeleteRef.current = null;
    }
    if (onUpdateRef.current) {
      onUpdateRef.current.unsubscribe();
      onUpdateRef.current = null;
    }
  }, []);
};