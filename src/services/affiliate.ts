/**
 * Affiliate Service
 * Handles affiliate program operations
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Affiliate {
  id: string;
  referral_code: string;
  status: 'active' | 'suspended' | 'inactive';
  commission_rate: number;
  total_earnings: number;
  total_paid: number;
  paypal_email?: string;
}

export interface AffiliateStats {
  total_referrals: number;
  conversions: number;
  conversion_rate: string;
  pending_commissions: number;
  pending_amount: string;
  total_earnings: number;
  total_paid: number;
  available_balance: string;
}

export interface Commission {
  id: string;
  revenue: number;
  costs: number;
  profit: number;
  commission_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  period_start: string;
  period_end: string;
}

export interface Referral {
  id: string;
  referred_user_id: string;
  referral_code: string;
  signup_date: string;
  converted: boolean;
  conversion_date?: string;
}

export interface MarketingMaterial {
  id: string;
  title: string;
  description?: string;
  material_type: 'banner' | 'email_template' | 'social_post' | 'landing_page' | 'other';
  content?: string;
  file_url?: string;
}

class AffiliateService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Register current user as an affiliate
   */
  async register(): Promise<{ affiliate: Affiliate | null; error: Error | null }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/affiliate/register`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        return { affiliate: null, error: new Error(error.error || 'Failed to register') };
      }

      const data = await response.json();
      return { affiliate: data.affiliate, error: null };
    } catch (error) {
      return { affiliate: null, error: error as Error };
    }
  }

  /**
   * Get affiliate dashboard data
   */
  async getDashboard(): Promise<{
    affiliate: Affiliate | null;
    stats: AffiliateStats | null;
    recent_commissions: Commission[];
    recent_referrals: Referral[];
    error: Error | null;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/affiliate/dashboard`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          affiliate: null,
          stats: null,
          recent_commissions: [],
          recent_referrals: [],
          error: new Error(error.error || 'Failed to fetch dashboard'),
        };
      }

      const data = await response.json();
      return {
        affiliate: data.affiliate,
        stats: data.stats,
        recent_commissions: data.recent_commissions || [],
        recent_referrals: data.recent_referrals || [],
        error: null,
      };
    } catch (error) {
      return {
        affiliate: null,
        stats: null,
        recent_commissions: [],
        recent_referrals: [],
        error: error as Error,
      };
    }
  }

  /**
   * Update PayPal email for payouts
   */
  async updatePayPalEmail(paypalEmail: string): Promise<{ error: Error | null }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/affiliate/update-paypal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ paypal_email: paypalEmail }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: new Error(error.error || 'Failed to update PayPal email') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Track a referral signup
   */
  async trackReferral(referralCode: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${API_BASE}/api/affiliate/track-referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referral_code: referralCode,
          user_id: userId,
        }),
      });

      // Don't throw error - referral tracking shouldn't block signup
      if (!response.ok) {
        return { error: null }; // Silently fail
      }

      return { error: null };
    } catch (error) {
      // Silently fail - don't block signup
      return { error: null };
    }
  }

  /**
   * Get marketing materials
   */
  async getMarketingMaterials(type?: string): Promise<{ materials: MarketingMaterial[]; error: Error | null }> {
    try {
      const url = type
        ? `${API_BASE}/api/affiliate/marketing-materials?type=${type}`
        : `${API_BASE}/api/affiliate/marketing-materials`;
      
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        return { materials: [], error: null }; // Return empty array on error
      }

      const data = await response.json();
      return { materials: data.materials || [], error: null };
    } catch (error) {
      return { materials: [], error: null }; // Return empty array on error
    }
  }

  /**
   * Generate affiliate link
   */
  generateAffiliateLink(referralCode: string, path: string = ''): string {
    const baseUrl = window.location.origin;
    const url = new URL(path || '/', baseUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  }

  /**
   * Get referral code from URL
   */
  getReferralCodeFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  }
}

export const affiliateService = new AffiliateService();
