import { defineAuth, secret } from "@aws-amplify/backend";
import { postConfirmation } from "./post-confirmation/resource";
import { postAuthentication } from "./post-authentication/resource";
import { preSignUp } from "./pre-signup/resource";
import { customMessage } from "./custom-message/resource";
import { buildAuthName } from "../utils/generic";
import { AuthCfnResources } from "@aws-amplify/plugin-types";
import { verificationEmailTemplate } from "./verification-template";
import { passwordResetEmailTemplate } from "./password-reset-template";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        attributeMapping: {
          email: 'email',
          familyName: 'family_name',
          givenName: 'given_name',
        },
        scopes: [
          'email',
          'profile',
        ]
      },
      callbackUrls: [
        'http://localhost:3000/login',
        'https://curio.to/login',
        'https://app.curio.to/login',
        'https://dev.curio.to/login',
        'https://openchat.curio.to/login',
      ],
      logoutUrls: [
        'http://localhost:3000',
        'https://curio.to',
        'https://app.curio.to',
        'https://dev.curio.to',
        'https://openchat.curio.to',
      ]
    },
  },
  userAttributes: {
    familyName: {
      mutable: true,
      required: true,
    },
    givenName: {
      mutable: true,
      required: true,
    },
  },
  groups: ['admin', 'student'],
  triggers: {
    postConfirmation,
    postAuthentication,
    preSignUp,
    customMessage,
  },
  senders: {
    email: {
      // configure using the email registered and verified in Amazon SES
      fromEmail: "curio@flylane.com",
      fromName: "Curio",
    },
  },
  name: buildAuthName(),
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
    allow.resource(postAuthentication).to(["addUserToGroup"]),
  ]
});


export const overrideCognitoDefaultSettings = (auth: AuthCfnResources) => {
  // extract L1 CfnUserPool resources
  const { cfnUserPool } = auth;
  // modify cfnUserPool policies directly
  cfnUserPool.policies = {
    passwordPolicy: {
      minimumLength: 8,
      requireLowercase: false,
      requireNumbers: true,
      requireSymbols: false,
      requireUppercase: false,
    },
  };

  // Account recovery is handled via CustomMessage Lambda trigger (custom-message/handler.ts)
  // which formats both verification and password reset emails with custom HTML templates
  cfnUserPool.accountRecoverySetting = {
    recoveryMechanisms: [
      { name: 'verified_email', priority: 1 }
    ]
  };
};