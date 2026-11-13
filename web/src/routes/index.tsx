import { createFileRoute } from '@tanstack/react-router';
import App from '../components/chat-app';

/**
 * `ssr: false` for now: the page reads your session cookie and calls the API
 * from the browser. Server-side data loading (loaders) is the next step — it
 * needs cookie forwarding, which is its own decision.
 */
export const Route = createFileRoute('/')({
  ssr: false,
  component: App,
});
