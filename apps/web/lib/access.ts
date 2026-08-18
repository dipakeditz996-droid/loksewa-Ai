/**
 * Utility functions for checking subscription-based feature access
 */

export interface UserSubscription {
  status: string;
  expiry_date: string;
  plan_details: {
    features: string[];
  };
}

/**
 * Checks if the user has access to a specific premium feature
 * @param subscription The user's active subscription object
 * @param featureKey The key of the feature to check (e.g., 'ai_tutor', 'premium_materials')
 * @returns boolean True if user has access, false otherwise
 */
export function hasFeature(subscription: UserSubscription | null | undefined, featureKey: string): boolean {
  if (!subscription) return false;
  
  if (subscription.status !== 'ACTIVE') return false;
  
  const expiryDate = new Date(subscription.expiry_date);
  const now = new Date();
  
  if (expiryDate <= now) return false;
  
  // If the plan has features array, check if it includes the requested feature
  if (subscription.plan_details?.features) {
    // If the plan has '*' feature, it unlocks everything
    if (subscription.plan_details.features.includes('*')) return true;
    
    return subscription.plan_details.features.includes(featureKey);
  }
  
  return false;
}

/**
 * Common feature keys used in the system
 */
export const FEATURES = {
  AI_TUTOR: 'ai_tutor',
  PREMIUM_MATERIALS: 'premium_materials',
  ADVANCED_MOCK_EXAM: 'advanced_mock_exam',
  ANALYTICS: 'analytics',
};
