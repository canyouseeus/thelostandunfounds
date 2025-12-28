/**
 * Client-side commission calculator for preview/estimation
 * Mirrors the server-side logic in calculate-commission.ts
 */

export interface CommissionBreakdown {
  original_profit: number;
  employee_discount: number;
  adjusted_profit: number;
  affiliate_commission: number;
  mlm_level1: number;
  mlm_level2: number;
  king_midas: number;
  secret_santa: number;
  company: number;
  reward_points: number;
}

export interface CalculateOptions {
  profit: number;
  isEmployeeDiscount?: boolean;
  hasReferrer?: boolean;
  hasLevel1?: boolean;
  hasLevel2?: boolean;
}

/**
 * Calculate commission breakdown (client-side preview)
 */
export function calculateCommissionPreview(options: CalculateOptions): CommissionBreakdown {
  const {
    profit,
    isEmployeeDiscount = false,
    hasReferrer = true,
    hasLevel1 = true,
    hasLevel2 = true
  } = options;

  let adjustedProfit = profit;
  const breakdown: CommissionBreakdown = {
    original_profit: profit,
    employee_discount: 0,
    adjusted_profit: profit,
    affiliate_commission: 0,
    mlm_level1: 0,
    mlm_level2: 0,
    king_midas: 0,
    secret_santa: 0,
    company: 0,
    reward_points: 0
  };

  // Step 1: Employee discount (if applicable)
  if (isEmployeeDiscount) {
    breakdown.employee_discount = profit * 0.42;
    adjustedProfit = profit - breakdown.employee_discount;
    breakdown.adjusted_profit = adjustedProfit;
  }

  // Step 2: Affiliate commission (42% of adjusted profit)
  if (hasReferrer) {
    breakdown.affiliate_commission = adjustedProfit * 0.42;
  }

  // Step 3: MLM bonuses
  if (hasReferrer) {
    if (hasLevel1) {
      breakdown.mlm_level1 = adjustedProfit * 0.02;
      
      if (hasLevel2) {
        breakdown.mlm_level2 = adjustedProfit * 0.01;
      }
    }
  }

  // Step 4: King Midas (8% of adjusted profit)
  breakdown.king_midas = adjustedProfit * 0.08;

  // Step 5: Secret Santa (ALWAYS 3% of adjusted profit)
  breakdown.secret_santa = adjustedProfit * 0.03;

  // Step 6: Company gets the rest
  breakdown.company = adjustedProfit - breakdown.affiliate_commission - breakdown.mlm_level1 - breakdown.mlm_level2 - breakdown.king_midas - breakdown.secret_santa;

  // Step 6: Reward points (1 per $10 of adjusted profit, floor division)
  breakdown.reward_points = Math.floor(adjustedProfit / 10);

  return breakdown;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

/**
 * Calculate what percentage of original profit goes where
 */
export function calculatePercentages(breakdown: CommissionBreakdown): Record<string, number> {
  const { original_profit } = breakdown;
  
  return {
    employee_discount: (breakdown.employee_discount / original_profit) * 100,
    affiliate_commission: (breakdown.affiliate_commission / original_profit) * 100,
    mlm_level1: (breakdown.mlm_level1 / original_profit) * 100,
    mlm_level2: (breakdown.mlm_level2 / original_profit) * 100,
    king_midas: (breakdown.king_midas / original_profit) * 100,
    secret_santa: (breakdown.secret_santa / original_profit) * 100,
    company: (breakdown.company / original_profit) * 100
  };
}

/**
 * Example calculations for documentation
 */
export const examples = {
  regularSale: calculateCommissionPreview({
    profit: 100,
    isEmployeeDiscount: false,
    hasReferrer: true,
    hasLevel1: true,
    hasLevel2: true
  }),
  
  employeeDiscount: calculateCommissionPreview({
    profit: 100,
    isEmployeeDiscount: true,
    hasReferrer: true,
    hasLevel1: true,
    hasLevel2: true
  }),
  
  noReferrer: calculateCommissionPreview({
    profit: 100,
    isEmployeeDiscount: false,
    hasReferrer: false,
    hasLevel1: false,
    hasLevel2: false
  }),
  
  onlyLevel1: calculateCommissionPreview({
    profit: 100,
    isEmployeeDiscount: false,
    hasReferrer: true,
    hasLevel1: true,
    hasLevel2: false
  })
};



