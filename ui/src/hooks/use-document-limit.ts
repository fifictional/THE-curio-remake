import { useState, useEffect } from 'react';
import { useSessionContext } from '@/providers';
import { useUserActionLog } from './api/user-action-log/useUserActionLog.api';

const FREE_LIMIT = Number(process.env.NEXT_PUBLIC_TOTAL_FREE_DPD_LIMIT) || 2;
const SUPER_LIMIT = Number(process.env.NEXT_PUBLIC_TOTAL_SUPER_DPD_LIMIT) || 5;
const ULTRA_LIMIT = Number(process.env.NEXT_PUBLIC_TOTAL_ULTRA_DPD_LIMIT) || 10;
const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_DPD_LIMIT) || 0;

const DAILY_LIMIT_MESSAGE = `🎓 **You've reached your daily limit for document analysis!**

You can come back tomorrow to analyze more documents, or upgrade to **Super Curio** for unlimited document analysis, quizzes, flashcards, practice tests, and more.

✨ [Upgrade to Super Curio](https://app.curio.to/exam-bundles?utm_source=upload_modal&utm_medium=upload_modal&utm_campaign=document_analysis_limit_reached)

Your limit will reset tomorrow at midnight.`;

function getStorageLimitMessage(
  subscription: 'none' | 'super' | 'ultra',
  totalDocuments: number,
  limit: number
): string {
  const documentsToDelete = (totalDocuments - limit) + 1;
  const upgradeTier = subscription === 'none' ? 'Super Curio' : 'Ultra Curio';
  const upgradeLink = 'https://app.curio.to/exam-bundles?utm_source=upload_modal&utm_medium=upload_modal&utm_campaign=document_analysis_limit_reached';

  if (subscription === 'ultra') {
    return `🎓 **You've reached your storage limit for documents! (${limit} documents)**

Please delete ${documentsToDelete} existing document${documentsToDelete > 1 ? 's' : ''} to upload new documents.`;
  }

  return `🎓 **You've reached your storage limit for documents! (${limit} documents)**

Please delete ${documentsToDelete} existing document${documentsToDelete > 1 ? 's' : ''}, or ✨ [Upgrade to ${upgradeTier}](${upgradeLink}).`;
}

export function useDocumentLimit() {
  const { userActionLogs } = useUserActionLog('analyzing_document', true);
  const { getUserSubscriptionLevel, isUserSubscribed, totalDocuments } = useSessionContext();

  const [hasLimitExceed, setHasLimitExceed] = useState(false);
  const [hasDailyLimitExceed, setHasDailyLimitExceed] = useState(false);
  const [message, setMessage] = useState(DAILY_LIMIT_MESSAGE);

  useEffect(() => {
    const subscription = getUserSubscriptionLevel();

    // Check total document storage limit exceeded
    let storageLimitExceeded = false;
    let storageLimitMessage = '';

    if (subscription === 'none' && totalDocuments >= FREE_LIMIT) {
      storageLimitExceeded = true;
      storageLimitMessage = getStorageLimitMessage('none', totalDocuments, FREE_LIMIT);
    } else if (subscription === 'super' && totalDocuments >= SUPER_LIMIT) {
      storageLimitExceeded = true;
      storageLimitMessage = getStorageLimitMessage('super', totalDocuments, SUPER_LIMIT);
    } else if (subscription === 'ultra' && totalDocuments >= ULTRA_LIMIT) {
      storageLimitExceeded = true;
      storageLimitMessage = getStorageLimitMessage('ultra', totalDocuments, ULTRA_LIMIT);
    }

    setHasLimitExceed(storageLimitExceeded);

    // Check daily limit exceeded (only for non-subscribed users)
    const dailyLimitExceeded = !isUserSubscribed && userActionLogs.length >= DAILY_LIMIT;
    setHasDailyLimitExceed(dailyLimitExceeded);

    // Set message: prioritize storage limit over daily limit
    if (storageLimitExceeded) {
      setMessage(storageLimitMessage);
    } else if (dailyLimitExceeded) {
      setMessage(DAILY_LIMIT_MESSAGE);
    } else {
      setMessage(DAILY_LIMIT_MESSAGE);
    }
  }, [
    userActionLogs.length,
    getUserSubscriptionLevel,
    isUserSubscribed,
    totalDocuments,
  ]);

  return {
    hasLimitExceed,
    hasDailyLimitExceed,
    message,
  };
}
