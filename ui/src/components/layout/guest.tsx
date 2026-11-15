import { Authenticator, Link, useAuthenticator } from "@aws-amplify/ui-react";
import Image from "next/image";
import { useAnalytics } from "@/providers/analytics-provider";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { confirmSignIn, ConfirmSignInInput, confirmSignUp, ConfirmSignUpInput, signIn, SignInInput, signUp, SignUpInput } from "aws-amplify/auth";
import { usePartnershipByCode } from "@/hooks/api/partnerships/use-partnerships.api";
import { getUrl } from "@/lib/local-storage";
import { PartnerImageSection } from "@/components/partner/partner-image-section";
import { useCommonContext } from "@/providers/common-provider";
import { TwoPanelLayout } from "@/design-system/two-panel-layout";

export function GuestLayout() {
  const { track } = useAnalytics();
  const router = useRouter();
  const pathname = usePathname();
  const [partnerCode, setPartnerCode] = useState<string | null>(null);
  const [partnerLogoUrl, setPartnerLogoUrl] = useState<string | null>(null);
  const { isMobile } = useCommonContext();
  const isSignInPage = pathname === '/signin';

  // Store redirect URL in sessionStorage on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      sessionStorage.setItem('auth_redirect_url', redirectUrl);
    }
  }, []);

  // Handle partner query parameter and store in state
  useEffect(() => {
    // Check for partner query parameter
    const searchParams = new URLSearchParams(window.location.search);
    let code = searchParams.get('partner');

    // If no query param, check localStorage
    if (!code) {
      code = localStorage.getItem('partner_code');
    } else {
      // Store in localStorage if found in query param
      localStorage.setItem('partner_code', code);
    }

    setPartnerCode(code);
  }, []);

  // Fetch partnership by code for mobile header logo
  const { data: partnership } = usePartnershipByCode(partnerCode);

  // Load logo URL for mobile header display
  useEffect(() => {
    const loadLogoUrl = async () => {
      if (!partnership?.logoS3Key) {
        setPartnerLogoUrl(null);
        return;
      }

      try {
        const url = await getUrl({ path: partnership.logoS3Key });
        setPartnerLogoUrl(url.url.toString());
      } catch (error) {
        console.error('Error loading partner logo:', error);
        setPartnerLogoUrl(null);
      }
    };

    loadLogoUrl();
  }, [partnership]);

  const goToSignUp = useCallback(() => {
    const buttons = document.querySelectorAll(".amplify-tabs__list button");
    (buttons[1] as HTMLButtonElement)?.click();
    track('sign-up-clicked');
    // Preserve redirect parameter
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect');
    router.push(redirectUrl ? `/signup?redirect=${redirectUrl}` : '/signup');
  }, [router]);

  const goToSignIn = useCallback(() => {
    const buttons = document.querySelectorAll(".amplify-tabs__list button");
    (buttons[0] as HTMLButtonElement)?.click();
    track('sign-in-clicked');
    // Preserve redirect parameter
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect');
    router.push(redirectUrl ? `/signin?redirect=${redirectUrl}` : '/signin');
  }, [router]);

  useEffect(() => {
    let intervalRef: NodeJS.Timeout | null = null;
    const redirectToSingUpPage = async () => {
      await new Promise(resolve => {
        intervalRef = setInterval(() => {
          const buttons = document.querySelectorAll(".amplify-tabs__list button");
          if (buttons[1] as HTMLButtonElement) {
            resolve(true);
            if (intervalRef) {
              clearInterval(intervalRef);
            }
          }
        }, 100);
      });
      const buttons = document.querySelectorAll(".amplify-tabs__list button");
      (buttons[1] as HTMLButtonElement)?.click();
    }

    if(window.location.pathname.includes('/signup')) {
      redirectToSingUpPage();
    }

    return () => {
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    }
  }, []);

  useEffect(() => {
    const trackGoogleSignIn = () => {
      track('google-sign-in-started');
      // Store redirect URL before OAuth flow
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        sessionStorage.setItem('auth_redirect_url', redirectUrl);
      }
    }
    // wait for google button to be rendered
    let googleButtonRef: HTMLButtonElement | null = null;
    const intervalRef = setInterval(() => {
      // this works only because we have only one google button
      googleButtonRef = document.querySelector(".federated-sign-in-button") as HTMLButtonElement;
      if (googleButtonRef) {
        clearInterval(intervalRef);
        googleButtonRef.addEventListener('click', trackGoogleSignIn);
      }
    }, 100);
    
    return () => {
      if (intervalRef) {
        clearInterval(intervalRef);
      }
      if (googleButtonRef) {
        googleButtonRef.removeEventListener('click', trackGoogleSignIn);
      }
    }
  }, []);

  const LegalText = ({ action }: { action: 'in' | 'up' }) => (
    <div className="text-base text-center">
      By signing {action}, you agree to our <Link href="https://curio.to/terms" target="_blank">Terms of Service</Link> and <Link href="https://curio.to/privacy" target="_blank">Privacy Policy</Link>.
      View our <Link href="https://curio.to/pricing" target="_blank">Pricing</Link> and <Link href="https://curio.to/refund-policy" target="_blank">Refund Policy</Link>.
    </div>
  );
  
  const component = {
    Header() {
      return (
        <>
          <div className="flex items-center justify-center px-4">
            {partnerLogoUrl && isMobile ? (
              <div className="flex flex-row items-center justify-center gap-4 bg-white rounded-md px-6 py-4">
                <Image src="/logo.svg" alt="Curio Logo" width={30} height={30} className="w-30 h-15" priority />
                <span className="text-3xl font-bold">x</span>
                <Image 
                  src={partnerLogoUrl}
                  alt="Partner logo"
                  width={100}
                  height={100}
                  className="w-auto h-auto"
                  />
              </div>
            ) : (
              <Image src="/logo.svg" alt="Curio Logo" width={30} height={30} className="w-30 h-15" priority />
            )}
          </div>
          <div className="flex items-center justify-center px-4">
            <div className="text-2xl font-bold text-primary">Ready for adventure?</div>
          </div>
          <div className="flex items-center justify-center px-4">
            <div className="text-base">It's learning time, superstar!</div>
          </div>
        </>
      )
    },
    SignIn: {
      Footer() {
        const { toForgotPassword } = useAuthenticator((context) => [context.toForgotPassword]);
        return (
          <>
            <div className="flex items-center justify-center px-4 mt-4">
                <LegalText action="in" />
            </div>
            <div className="flex items-center justify-center px-4 mt-4">
              <div className="text-base">Join the Super Curio crew! <Link onClick={goToSignUp}>Sign up</Link></div>
            </div>
            <div className="flex items-center justify-center px-4 mt-2">
              <div className="text-base">
                <Link onClick={toForgotPassword}>
                  Forgot your password?
                </Link>
              </div>
            </div>
          </>
          )
        }
      },
    SignUp: {
      Footer() {
        return (
          <>
            <div className="flex items-center justify-center px-4 mt-4">
              <LegalText action="up" />
            </div>
            <div className="flex items-center justify-center px-4 mt-4">
              <div className="text-base">Already have an account? <Link onClick={goToSignIn}>Sign in</Link></div>
            </div>
          </>
          )
        }
      },
    }

  const services = {
    handleSignIn: async (input: SignInInput) => {
      // Ensure redirect URL is stored before sign-in
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        sessionStorage.setItem('auth_redirect_url', redirectUrl);
      }
      
      track('sign-in-started', {
        email: input.username,
      });
      return signIn(input);
    },
    handleSignUp: async (input: SignUpInput) => {
      // Ensure redirect URL is stored before sign-up
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        sessionStorage.setItem('auth_redirect_url', redirectUrl);
      }
      
      track('sign-up-started', {
        email: input.username,
        familyName: input.options?.userAttributes?.family_name || null,
        givenName: input.options?.userAttributes?.given_name || null,
      });
      return signUp(input);
    },
    handleConfirmSignUp: async (input: ConfirmSignUpInput) => {
      track('confirm-sign-up-started', {
        email: input.username,
      });
      return confirmSignUp(input);
    },
    handleConfirmSignIn: async (input: ConfirmSignInInput) => {
      track('confirm-sign-in-started', {
        email: input.options?.userAttributes?.email || null,
      });
      return confirmSignIn(input);
    },
  }

  const formFields = {
    signIn: {
      username: {
        label: "Email",
        placeholder: "sherlock@bakerstreet.com",
        isRequired: true,
      },
      password: {
        label: "Password",
        placeholder: "********",
        isRequired: true,
        hideShowPassword: true,
      },
    },
    signUp: {
      email: {
        label: "Email",
        placeholder: "sherlock@bakerstreet.com",
        isRequired: true,
        order: 1,
      },
      password: {
        label: "Password",
        placeholder: "********",
        isRequired: true,
        hideShowPassword: true,
        order: 2,
      },
      confirm_password: {
        label: "Confirm Password",
        placeholder: "********",
        isRequired: true,
        hideShowPassword: true,
        order: 3,
      },
      given_name: {
        label: "First Name",
        placeholder: "Sherlock",
        isRequired: true,
        order: 4,
      },
      family_name: {
        label: "Last Name",
        placeholder: "Holmes",
        isRequired: true,
        order: 5,
      },
    }
  }

  const leftPanel = (
    <Authenticator components={component} services={services} formFields={formFields} socialProviders={['google']} />
  );

  const rightPanel = partnerCode ? (
    <PartnerImageSection partnerCode={partnerCode} />
  ) : (
    <div 
      className="w-full h-full z-10 pointer-events-none relative"
      style={{
        backgroundImage: `url(onboarding/cat_notes.png)`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}
    />
  );

  return (
    <TwoPanelLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      ghostPanel="right"
      leftPanelScrollable={true}
    />
  )
}