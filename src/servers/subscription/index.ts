/**
 * Unified Subscription MCP Code API
 * 
 * Provides subscription management for the unified platform.
 * Can be used via MCP registry or directly.
 */

import { supabase } from '../../lib/supabase';
import { isAdmin, isAdminEmail } from '../../utils/admin';

export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

/**
 * Get user's subscription
 */
export async function getSubscription(userId: string) {
  try {
    // Ensure we have a session before querying
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      // No session - return null (user not authenticated)
      return { subscription: null };
    }

    const { data, error } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null instead of error when no rows

    // Handle various error codes
    if (error) {
      const errorMsg = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      const errorStatus = (error as any).status || (error as any).statusCode;
      
      // Handle 403/406 errors gracefully - table might not exist or RLS blocking
      if (
        errorStatus === 403 ||
        errorStatus === 406 ||
        errorCode === '42P01' ||
        errorCode === 'PGRST116' ||
        errorCode === '42501' ||
        errorMsg.includes('403') ||
        errorMsg.includes('406') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('not acceptable') ||
        errorMsg.includes('relation') ||
        errorMsg.includes('policy') ||
        errorMsg.includes('forbidden')
      ) {
        // Silently return null - this is expected if tables don't exist yet
        return { subscription: null };
      }
      
      // Log other errors only in dev mode
      if (import.meta.env.DEV) {
        console.warn('Subscription query error:', {
          code: error.code,
          message: error.message,
        });
      }
      
      // For any other error, return null to prevent app crash
      return { subscription: null };
    }

    return { subscription: data || null };
  } catch (error: any) {
    // Catch network errors, 406, etc.
    const errorMsg = (error?.message || '').toLowerCase();
    if (
      errorMsg.includes('406') || 
      errorMsg.includes('403') ||
      errorMsg.includes('not acceptable') ||
      error?.status === 406 ||
      error?.status === 403 ||
      error?.statusCode === 406 ||
      error?.statusCode === 403
    ) {
      // Silently return null - RLS blocking or table not exposed (expected)
      return { subscription: null };
    }
    if (import.meta.env.DEV) {
      console.warn('Error fetching subscription:', error);
    }
    return { subscription: null };
  }
}

/**
 * Get user's tier
 */
export async function getTier(userId: string): Promise<SubscriptionTier> {
  const { subscription } = await getSubscription(userId);
  
  if (!subscription) {
    return 'free';
  }

  // Check if expired
  if (subscription.expires_at) {
    const expiresAt = new Date(subscription.expires_at);
    if (expiresAt < new Date()) {
      return 'free';
    }
  }

  return subscription.tier as SubscriptionTier;
}

/**
 * Check if user can perform action
 */
export async function canPerformAction(
  userId: string,
  toolId: string,
  action: string
) {
  try {
    // Check if user is admin - admins bypass all limits
    const adminStatus = await isAdmin();
    if (adminStatus) {
      return {
        allowed: true,
        remaining: null, // Infinity
        limit: null, // Unlimited
      };
    }

    // Also check by email if we have user data
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isAdminEmail(user.email || '')) {
        return {
          allowed: true,
          remaining: null,
          limit: null,
        };
      }
    } catch (emailCheckError) {
      // Continue with normal limit check if email check fails
    }

    const tier = await getTier(userId);
    const limits = await getToolLimits(toolId, tier);
    
    // Find limit for this action
    const actionLimit = limits?.find(
      l => l.limit_type === `${action}_limit` || l.limit_type === 'daily_limit'
    );
    
    // If no limit or unlimited (null), allow
    if (!actionLimit || actionLimit.limit_value === null) {
      return {
        allowed: true,
        remaining: null,
        limit: null,
      };
    }

    // Check current usage
    const usage = await getDailyUsage(userId, toolId, action);
    const remaining = Math.max(0, actionLimit.limit_value - usage);

    return {
      allowed: usage < actionLimit.limit_value,
      remaining,
      limit: actionLimit.limit_value,
    };
  } catch (error) {
    console.warn('Error checking action permission:', error);
    // Default to allowing if there's an error
    return {
      allowed: true,
      remaining: null,
      limit: null,
    };
  }
}

/**
 * Get tool limits for a tier
 */
export async function getToolLimits(toolId: string, tier: SubscriptionTier) {
  try {
    const { data, error } = await supabase
      .from('tool_limits')
      .select('*')
      .eq('tool_id', toolId)
      .eq('tier', tier);

    if (error) {
      // Table might not exist yet or RLS blocking
      const errorMsg = error.message?.toLowerCase() || '';
      if (
        error.code === '42P01' || 
        errorMsg.includes('does not exist') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('406') ||
        errorMsg.includes('not acceptable') ||
        errorMsg.includes('relation')
      ) {
        // Silently return empty array - table doesn't exist yet (expected)
        return [];
      }
      console.warn('Error fetching tool limits:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    const errorMsg = (error?.message || '').toLowerCase();
    if (
      errorMsg.includes('406') || 
      errorMsg.includes('not acceptable') ||
      error?.status === 406 ||
      error?.statusCode === 406
    ) {
      // Silently return empty array - table doesn't exist yet (expected)
      return [];
    }
    console.warn('Error fetching tool limits:', error);
    return [];
  }
}

/**
 * Get daily usage count
 */
export async function getDailyUsage(userId: string, toolId: string, action: string) {
  try {
    // Admins don't have usage tracked (unlimited access)
    const adminStatus = await isAdmin();
    if (adminStatus) {
      return 0; // Return 0 so remaining is always unlimited
    }

    // Also check by email if we have user data
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isAdminEmail(user.email || '')) {
        return 0;
      }
    } catch (emailCheckError) {
      // Continue with normal usage check if email check fails
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { count, error } = await supabase
      .from('tool_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tool_id', toolId)
      .eq('action', action)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    if (error) {
      // Table might not exist yet or RLS blocking
      const errorMsg = error.message?.toLowerCase() || '';
      if (
        error.code === '42P01' || 
        errorMsg.includes('does not exist') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('406') ||
        errorMsg.includes('not acceptable') ||
        errorMsg.includes('relation')
      ) {
        // Silently return 0 - table doesn't exist yet (expected)
        return 0;
      }
      console.warn('Error fetching daily usage:', error);
      return 0;
    }

    return count || 0;
  } catch (error: any) {
    const errorMsg = (error?.message || '').toLowerCase();
    if (
      errorMsg.includes('406') || 
      errorMsg.includes('not acceptable') ||
      error?.status === 406 ||
      error?.statusCode === 406
    ) {
      // Silently return 0 - table doesn't exist yet (expected)
      return 0;
    }
    console.warn('Error fetching daily usage:', error);
    return 0;
  }
}

/**
 * Track tool usage
 */
export async function trackUsage(
  userId: string,
  toolId: string,
  action: string,
  metadata?: Record<string, any>
) {
  try {
    // Don't track usage for admins (they have unlimited access)
    const adminStatus = await isAdmin();
    if (adminStatus) {
      return { success: true }; // Skip tracking for admins
    }

    // Also check by email if we have user data
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isAdminEmail(user.email || '')) {
        return { success: true }; // Skip tracking for admins
      }
    } catch (emailCheckError) {
      // Continue with normal tracking if email check fails
    }

    const { error } = await supabase
      .from('tool_usage')
      .insert({
        user_id: userId,
        tool_id: toolId,
        action,
        metadata: metadata || {},
      });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Tool usage table does not exist yet');
        return { success: true }; // Return success to not block user
      }
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.warn('Error tracking usage:', error);
    return { success: false };
  }
}

/**
 * Create subscription
 */
export async function createSubscription(
  userId: string,
  tier: SubscriptionTier,
  paypalSubscriptionId?: string,
  expiresAt?: string
) {
  try {
    // Cancel any existing active subscriptions
    await supabase
      .from('platform_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Create new subscription
    const { data, error } = await supabase
      .from('platform_subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: 'active',
        paypal_subscription_id: paypalSubscriptionId,
        expires_at: expiresAt,
      })
      .select()
      .maybeSingle(); // Use maybeSingle() instead of single()

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Subscription table does not exist yet');
        return { subscription: null };
      }
      throw new Error(error.message);
    }

    return { subscription: data };
  } catch (error) {
    console.warn('Error creating subscription:', error);
    return { subscription: null };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  try {
    const { error } = await supabase
      .from('platform_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Subscription table does not exist yet');
        return { success: true };
      }
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.warn('Error cancelling subscription:', error);
    return { success: false };
  }
}

/**
 * Get subscription pricing
 */
export function getPricing() {
  return {
    free: { monthly: 0, yearly: 0 },
    premium: { monthly: 9.99, yearly: 99.99 },
    pro: { monthly: 19.99, yearly: 199.99 },
  };
}

// Export PlatformSubscription type
export type PlatformSubscription = {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  paypal_subscription_id?: string;
  started_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
};

