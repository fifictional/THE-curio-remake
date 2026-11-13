import { OnboardingChat } from "../chat/onboarding-chat";

const messages = [
  {
    messageUuid: '1',
    content: 'Hello, how are you?',
    role: 'user' as const,
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    chatUuid: '1',
  },
  {
    messageUuid: '2',
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    chatUuid: '1',
    content: 'I am fine, thank you!',
    role: 'assistant' as const,
  },
  {
    messageUuid: '3',
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    chatUuid: '1',
    content: 'What is the capital of France?',
    role: 'user' as const,
  },
  {
    messageUuid: '4',
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    chatUuid: '1',
    content: 'The capital of France is Paris.',
    role: 'assistant' as const,
  },
];

export function OnboardingChatAsTab() {
  return <div className="h-full px-4">
    <OnboardingChat 
      messages={messages} 
    />
  </div>;
}