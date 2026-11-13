'use client';

import { useSessionContext } from "@/providers/session-provider";
import { useOwnedBundlesApi } from "@/hooks/api/bundles/use-purchased-bundles.api";
import { useSubscriptionsApi } from "@/hooks/api/subscriptions";
import { Loader2, Trash2, User, CreditCard, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import { CountrySelect } from "@/components/ui/country-select";
import { useAmplifyApiClient, useAmplifyUserApiClient, useAnalytics } from "@/providers";
import { useQueryClient } from "@tanstack/react-query";
import { CancelSubscriptionModal } from "@/components/core/cancel-subscription-modal";
import { DeleteAccountModal } from "@/components/core/delete-account-modal";
import { signOut } from "@/lib/local-auth";
import { PersonalizedProfileSection } from "@/components/settings/personalized-profile-section";

export default function ProfilePage() {
  const { userAttributes, userProfile } = useSessionContext();
  const { ownedModules, isLoading: isLoadingModules } = useOwnedBundlesApi();
  const { activeSubscriptions, isLoading: isLoadingSubscriptions } = useSubscriptionsApi(userAttributes?.userUuid || null);
  const apiClient = useAmplifyApiClient();
  const userApiClient = useAmplifyUserApiClient();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Get the active subscription (assuming user only has one active subscription)
  const activeSubscription = activeSubscriptions[0];

  // Calculate billing period (monthly vs annual)
  const getBillingPeriod = () => {
    if (!activeSubscription?.currentPeriodStart || !activeSubscription?.currentPeriodEnd) {
      return 'N/A';
    }
    const start = new Date(activeSubscription.currentPeriodStart);
    const end = new Date(activeSubscription.currentPeriodEnd);
    const diffInMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (diffInMonths >= 11 && diffInMonths <= 13) {
      return 'Annual';
    } else if (diffInMonths >= 0.9 && diffInMonths <= 1.1) {
      return 'Monthly';
    }
    return `${Math.round(diffInMonths)} month(s)`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  const handleDeleteAccount = useCallback(async (reason: string) => {
    if (!userAttributes?.userUuid) {
      throw new Error('User UUID not found');
    }

    try {
      track('account_deletion_requested', { reason });
      
      const response = await userApiClient.mutations.deleteUser({
        userUuid: userAttributes.userUuid,
      });

      if (response.errors) {
        throw new Error(response.errors[0].message || 'Failed to delete account');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to delete account');
      }

      // Track successful deletion
      track('account_deleted', { reason });
      
      // Sign out and redirect to home page
      // The user will be automatically signed out when Cognito user is deleted
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      track('account_deletion_failed', { 
        reason,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [userAttributes?.userUuid, userApiClient, track]);

  const handleCountryChange = useCallback(async (countryCode: string | null) => {
    if (userAttributes?.userUuid) {
      track('onboarding_user_country_updated', { country: countryCode || "Other" });
      await apiClient.models.UserProfile.update({
        userUuid: userAttributes.userUuid,
        country: countryCode
      });
      // Invalidate the query to refetch the updated profile
      queryClient.invalidateQueries({ queryKey: ['user-profile', userAttributes.userUuid] });
    }
  }, [userAttributes?.userUuid, apiClient, track, queryClient]);

  const handleCopyUserId = useCallback(async () => {
    if (userAttributes?.userUuid) {
      await navigator.clipboard.writeText(userAttributes.userUuid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [userAttributes?.userUuid]);

  const setCancelEventToMix = useCallback((reason: string) => {
    track('cancel_subscription', { reason });
  }, [track]);

  if (!userAttributes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        <p className="mt-2 text-sm">
          <a href="/settings" className="text-primary underline underline-offset-2">
            Data &amp; Memory
          </a>
        </p>
      </div>

      {/* Personal Information Section */}
      <section className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Personal Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">First Name</label>
            <p className="text-base">{userAttributes.givenName || 'Not set'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Last Name</label>
            <p className="text-base">{userAttributes.familyName || 'Not set'}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-base">{userAttributes.email}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-muted-foreground truncate flex-1" title={userAttributes.userUuid}>
                {userAttributes.userUuid}
              </p>
              <button
                onClick={handleCopyUserId}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Country</label>
            <CountrySelect
              value={userProfile?.country}
              onChange={handleCountryChange}
              placeholder="Not set"
            />
          </div>

        </div>
      </section>

      <PersonalizedProfileSection userProfile={userProfile} />

      {/* Subscription Section */}
      <section className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">My Subscription</h2>
        </div>

        {isLoadingSubscriptions ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading subscription...</span>
          </div>
        ) : activeSubscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${activeSubscription.status === 'active' ? 'bg-green-500' :
                    activeSubscription.status === 'trialing' ? 'bg-blue-500' :
                      activeSubscription.status === 'paused' ? 'bg-yellow-500' :
                        'bg-gray-500'
                    }`} />
                  <p className="text-base capitalize">{activeSubscription.status}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Tier</label>
                <p className="text-base">
                  {activeSubscription.tier ? (
                    activeSubscription.tier === 'super' ? 'Super Curio' : 'Ultra Curio'
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Billing Period</label>
                <p className="text-base">{getBillingPeriod()}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Next Payment Due</label>
                <p className="text-base">{formatDate(activeSubscription.nextBillingDate)}</p>
              </div>

              {activeSubscription.cancelledAt && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Cancelled On</label>
                  <p className="text-base text-destructive">{formatDate(activeSubscription.cancelledAt)}</p>
                </div>
              )}
            </div>

            {activeSubscription.provider === 'paddle' && activeSubscription.providerCustomerId && (
              <div className="pt-4 border-t flex gap-8">
                {/* <Link
                  href={`/api/paddle/customer-portal/${activeSubscription.providerCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Manage subscription on Paddle
                  </>
                </Link> */}
                <CancelSubscriptionModal
                  trigger={
                    <button className="text-red-600 hover:cursor-pointer inline-flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Cancel Subscription
                    </button>
                  }
                  onConfirm={(reason?: string) => {
                    if (reason) {
                      setCancelEventToMix(reason)
                    }
                    window.open(`/api/paddle/customer-portal/${activeSubscription?.providerCustomerId}`, "blank")
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You don't have an active subscription. Visit the{' '}
            <a href="/exam-bundles" className="text-primary underline underline-offset-4">
              pricing page
            </a>{' '}
            to subscribe.
          </p>
        )}
      </section>


      {/* Delete Account Section */}
      <section className="border border-destructive/50 rounded-lg p-6 space-y-4 bg-destructive/5">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Once you delete your account, there is no going back. This action will permanently delete your account and remove all of your data from our servers.
          </p>

          <DeleteAccountModal
            trigger={
              <Button
                variant="outline"
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            }
            onConfirm={handleDeleteAccount}
          />
        </div>
      </section>
    </div>
  );
}

