// Unified Subscription Service - Uses Direct Imports for Browser
// For server-side usage, use MCP registry pattern

import * as subscriptionTools from '../servers/subscription/index';
import type { SubscriptionTier, SubscriptionStatus, PlatformSubscription } from '../servers/subscription/index';

// Re-export types
export type { SubscriptionTier, SubscriptionStatus, PlatformSubscription };

export interface ToolLimits {
  tool_id: string;
  tier: SubscriptionTier;
  limit_type: string;
  limit_value: number | null;
}

export class UnifiedSubscriptionService {
  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<{ subscription: PlatformSubscription | null; error: Error | null }> {
    try {
      const result = await subscriptionTools.getSubscription(userId);
      return { subscription: result.subscription as PlatformSubscription | null, error: null };
    } catch (error) {
      return { subscription: null, error: error as Error };
    }
  }

  /**
   * Get user's current tier
   */
  async getTier(userId: string): Promise<SubscriptionTier> {
    try {
      const result = await subscriptionTools.getTier(userId);
      return result as SubscriptionTier;
    } catch (error) {
      return 'free';
    }
  }

  /**
   * Check if user can perform action
   */
  async canPerformAction(
    userId: string,
    toolId: string,
    action: string
  ): Promise<{ allowed: boolean; remaining: number | null; limit: number | null }> {
    try {
      const result = await subscriptionTools.canPerformAction(userId, toolId, action);
      return result;
    } catch (error) {
      return { allowed: false, remaining: 0, limit: 0 };
    }
  }

  /**
   * Track tool usage
   */
  async trackUsage(
    userId: string,
    toolId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<{ error: Error | null }> {
    try {
      await subscriptionTools.trackUsage(userId, toolId, action, metadata);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    paypalSubscriptionId?: string,
    expiresAt?: string
  ): Promise<{ subscription: PlatformSubscription | null; error: Error | null }> {
    try {
      const result = await subscriptionTools.createSubscription(userId, tier, paypalSubscriptionId, expiresAt);
      return { subscription: result.subscription as PlatformSubscription, error: null };
    } catch (error) {
      return { subscription: null, error: error as Error };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<{ error: Error | null }> {
    try {
      await subscriptionTools.cancelSubscription(userId);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get subscription pricing
   */
  getPricing(): Record<SubscriptionTier, { monthly: number; yearly: number }> {
    return subscriptionTools.getPricing();
  }
}

// Export singleton instance
export const subscriptionService = new UnifiedSubscriptionService();

