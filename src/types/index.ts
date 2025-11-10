/**
 * Type Definitions
 * Centralized TypeScript types and interfaces
 */

// User Types
export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

// Auth Types
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: User;
}

export type SubscriptionTier = 'free' | 'premium' | 'pro';

// Subscription Types
export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: 'active' | 'cancelled' | 'expired';
  paypal_subscription_id?: string;
  started_at: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolLimit {
  id: string;
  tool_id: string;
  tier: SubscriptionTier;
  limit_type: string;
  limit_value: number | null;
  created_at: string;
}

export interface ToolUsage {
  id: string;
  user_id: string;
  tool_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Tool Types
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  path: string;
  category?: string;
  requiresAuth?: boolean;
  requiresTier?: SubscriptionTier;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: Error | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  validation?: (value: any) => string | null;
}

export interface FormErrors {
  [key: string]: string | null;
}

// Toast Types (re-exported from Toast component)
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Component Props Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface PageProps {
  className?: string;
}

