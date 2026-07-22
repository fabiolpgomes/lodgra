/**
 * Story 36.11: Rules Engine
 * Evaluates pricing rules and calculates final prices
 */

import {
  PricingRule,
  RuleCondition,
  RuleAction,
  PriceGuardrails,
} from '@/types/pricing';

interface RuleEvaluationContext {
  occupancy_rate: number;
  days_until_full: number;
  season: 'peak' | 'shoulder' | 'low';
  day_of_week: number;
  days_until_checkin: number;
  base_price: number;
}

export function evaluateRule(
  condition: RuleCondition,
  context: RuleEvaluationContext
): boolean {
  switch (condition.type) {
    case 'occupancy':
      return evaluateNumeric(
        context.occupancy_rate,
        condition.operator as any,
        condition.value as number
      );

    case 'booking_pace':
      return evaluateNumeric(
        context.days_until_full,
        condition.operator as any,
        condition.value as number
      );

    case 'season':
      return condition.value === context.season;

    case 'day_of_week':
      if (condition.operator === 'in' && Array.isArray(condition.value)) {
        const values = condition.value.map(v => typeof v === 'string' ? parseInt(v) : v);
        return values.includes(context.day_of_week);
      }
      return context.day_of_week === condition.value;

    case 'days_until_checkin':
      if (condition.operator === 'in' && Array.isArray(condition.value)) {
        return rangeMatch(context.days_until_checkin, condition.value);
      }
      return evaluateNumeric(
        context.days_until_checkin,
        condition.operator as any,
        condition.value as number
      );

    default:
      return false;
  }
}

function evaluateNumeric(
  value: number,
  operator: '>=' | '<=' | '=',
  threshold: number
): boolean {
  switch (operator) {
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '=':
      return value === threshold;
    default:
      return false;
  }
}

function rangeMatch(value: number, ranges: any[]): boolean {
  return ranges.some((range) => {
    if (typeof range === 'string' && range.includes('-')) {
      const [min, max] = range.split('-').map(Number);
      return value >= min && value <= max;
    }
    return value === range;
  });
}

export function applyRuleAction(
  basePrice: number,
  action: RuleAction
): number {
  switch (action.type) {
    case 'increase_percent':
      return basePrice * (1 + action.value / 100);

    case 'decrease_percent':
      return basePrice * (1 - action.value / 100);

    case 'set_price':
      return action.value;

    default:
      return basePrice;
  }
}

export function calculateFinalPrice(
  basePrice: number,
  rules: PricingRule[],
  context: RuleEvaluationContext,
  guardrails: PriceGuardrails
): number {
  let finalPrice = basePrice;

  const sortedRules = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(rule.condition, context)) {
      finalPrice = applyRuleAction(finalPrice, rule.action);
    }
  }

  return enforceGuardrails(finalPrice, guardrails);
}

export function enforceGuardrails(
  price: number,
  guardrails: PriceGuardrails
): number {
  if (price < guardrails.min_price) return guardrails.min_price;
  if (price > guardrails.max_price) return guardrails.max_price;
  return price;
}

export function validateRule(rule: PricingRule, guardrails?: PriceGuardrails): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!rule.name || rule.name.trim() === '') {
    errors.push('Rule name is required');
  }

  if (rule.priority < 0) {
    errors.push('Priority must be non-negative');
  }

  if (!rule.condition || !rule.action) {
    errors.push('Rule must have condition and action');
  }

  if (guardrails) {
    if (rule.action.type === 'set_price') {
      if (
        rule.action.value < guardrails.min_price ||
        rule.action.value > guardrails.max_price
      ) {
        errors.push(
          `Set price must be between €${guardrails.min_price} and €${guardrails.max_price}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
