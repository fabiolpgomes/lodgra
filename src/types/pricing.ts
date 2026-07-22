/**
 * Story 36.11: Dynamic Pricing Types
 */

export type RuleConditionType =
  | 'occupancy'
  | 'booking_pace'
  | 'season'
  | 'day_of_week'
  | 'days_until_checkin';

export type RuleActionType = 'increase_percent' | 'decrease_percent' | 'set_price';

export interface PricingRule {
  id: string;
  property_id: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: RuleCondition;
  action: RuleAction;
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  type: RuleConditionType;
  operator: '>=' | '<=' | '=' | 'in';
  value: string | number | string[];
}

export interface RuleAction {
  type: RuleActionType;
  value: number;
}

export interface PriceGuardrails {
  property_id: string;
  min_price: number;
  max_price: number;
}

export interface PricingAuditEntry {
  id: string;
  property_id: string;
  date: string;
  old_price: number;
  new_price: number;
  triggered_by: string;
  reason: string;
  created_at: string;
}

export interface DryRunResult {
  date: string;
  current_price: number;
  simulated_price: number;
  difference_eur: number;
  difference_percent: number;
}
