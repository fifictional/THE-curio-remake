/**
 * Populate User Profile Job
 * 
 * Creator: Scans UserProfile table and emits userUuid for every entry missing userEmail, firstName, or lastName
 * Mutator: Fetches Cognito user attributes and updates UserProfile with email, firstName, and lastName
 */

export const JOB_NAME = "populate-user-profile";

export type PopulateUserProfileJob = {
  userUuid: string;
};
