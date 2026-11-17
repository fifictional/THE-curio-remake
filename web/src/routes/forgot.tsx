import { createFileRoute } from '@tanstack/react-router';

import { ForgotPassword } from '../components/password';

export const Route = createFileRoute('/forgot')({
  component: ForgotPassword,
});
