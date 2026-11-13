import type { CustomMessageTriggerHandler } from 'aws-lambda';
import { passwordResetEmailTemplate } from '../password-reset-template';
import { verificationEmailTemplate } from '../verification-template';

export const handler: CustomMessageTriggerHandler = async (event) => {
  const code = event.request.codeParameter;

  switch (event.triggerSource) {
    case 'CustomMessage_SignUp':
    case 'CustomMessage_ResendCode':
      event.response.emailSubject = 'Your Curio verification code';
      event.response.emailMessage = verificationEmailTemplate.replace('{####}', code);
      break;

    case 'CustomMessage_ForgotPassword':
      event.response.emailSubject = 'Your Curio password reset code';
      event.response.emailMessage = passwordResetEmailTemplate.replace('{####}', code);
      break;

    case 'CustomMessage_AdminCreateUser':
      event.response.emailSubject = 'Your Curio temporary password';
      event.response.emailMessage = verificationEmailTemplate.replace('{####}', code);
      break;

    default:
      break;
  }

  return event;
};
