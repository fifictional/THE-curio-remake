import { useCallback, useState, useMemo, useEffect } from 'react';
import { useCommonContext } from '@/providers/common-provider';
import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { v5 as uuidv5 } from 'uuid';

// Namespace UUID for SAT question chats (generated once for this purpose)
const SAT_QUESTION_CHAT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function useSATQuestionChat(examLogUuid?: string) {
  const { currentQuestion } = useCommonContext();
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [chatUuid, setChatUuid] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [isCheckingExistingChat, setIsCheckingExistingChat] = useState(false);

  // Format question data for reference
  const questionReference = useMemo(() => {
    if (!currentQuestion) return null;
    return JSON.stringify({
      questionContent: currentQuestion.questionContent,
      options: currentQuestion.options,
      concept: currentQuestion.concept,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      // Note: We intentionally don't include correctAnswer to avoid giving away the answer
    }, null, 2);
  }, [currentQuestion]);

  const referenceData = useMemo(() => {
    if (!questionReference) return undefined;
    return [
      {
        type: 'text' as const,
        name: 'Current SAT Question',
        content: questionReference,
      }
    ];
  }, [questionReference]);

  // Generate deterministic chat UUID based on exam log and question
  const deterministicChatUuid = useMemo(() => {
    if (!examLogUuid || !currentQuestion?.questionId) return null;
    
    // Create a deterministic UUID using v5 (name-based UUID with SHA-1)
    // Format: "examLogUuid:questionId"
    const name = `${examLogUuid}:${currentQuestion.questionId}`;
    return uuidv5(name, SAT_QUESTION_CHAT_NAMESPACE);
  }, [examLogUuid, currentQuestion?.questionId]);

  // Check if chat already exists when question changes
  useEffect(() => {
    if (!deterministicChatUuid || !userAttributes) {
      setChatUuid(null);
      return;
    }

    const checkExistingChat = async () => {
      setIsCheckingExistingChat(true);
      try {
        const existingChat = await client.models.Chat.get({ chatUuid: deterministicChatUuid });
        
        if (existingChat.data) {
          // Chat exists, use it
          setChatUuid(deterministicChatUuid);
          setInitialMessage(null); // No initial message needed, chat already exists
        } else {
          // Chat doesn't exist yet, but we have the UUID ready for creation
          setChatUuid(null);
        }
      } catch (error) {
        console.error('Error checking existing chat:', error);
        setChatUuid(null);
      } finally {
        setIsCheckingExistingChat(false);
      }
    };

    checkExistingChat();
  }, [deterministicChatUuid, userAttributes, client]);

  const startChatWithQuestion = useCallback(async (message: string) => {
    if (!questionReference || !userAttributes || !deterministicChatUuid) return;

    setIsCreatingChat(true);
    try {
      // Use the deterministic UUID
      const chat = await client.models.Chat.create({
        userUuid: userAttributes.userUuid,
        chatUuid: deterministicChatUuid,
        name: `Q: ${message.length > 20 ? message.slice(0, 20) + '...' : message}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hideInRecent: true,
        spaceUuid: null,
      });

      if (chat.data) {
        setChatUuid(deterministicChatUuid);
        setInitialMessage(message);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  }, [questionReference, userAttributes, deterministicChatUuid, client]);

  const resetChat = useCallback(() => {
    setChatUuid(null);
    setInitialMessage(null);
  }, []);

  return {
    currentQuestion,
    startChatWithQuestion,
    isCreatingChat: isCreatingChat || isCheckingExistingChat,
    chatUuid,
    initialMessage,
    referenceData,
    resetChat,
  };
}

