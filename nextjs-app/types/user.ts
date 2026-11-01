export type UserRole = "student" | "admin";
export type SubscriptionTier = "free" | "paid";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  daily_solve_count: number;
  daily_solve_count_date: string;
  birth_year: number | null;
  created_at: string;
  updated_at: string;
}
