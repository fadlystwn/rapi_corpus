export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  category: 'domain' | 'safety' | 'content' | 'output';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  conditions: GuardrailCondition[];
  actions: GuardrailAction[];
}

export interface GuardrailCondition {
  type: 'keyword' | 'pattern' | 'domain' | 'intent' | 'risk_level';
  operator: 'contains' | 'matches' | 'equals' | 'greater_than' | 'less_than';
  value: string | number | RegExp;
  case_sensitive?: boolean;
}

export interface GuardrailAction {
  type: 'block' | 'warn' | 'redirect' | 'modify' | 'log';
  parameters?: Record<string, any>;
  message?: string;
}

export interface GuardrailResult {
  passed: boolean;
  triggered_rules: Array<{
    rule_id: string;
    rule_name: string;
    severity: string;
    action: string;
    message?: string;
  }>;
  modified_input?: string;
  blocked_reason?: string;
  warnings: string[];
}

export interface DomainGuardrail {
  domain: string;
  allowed_topics: string[];
  disallowed_topics: string[];
  required_context: string[];
  risk_threshold: number;
}

export interface SafetyCheck {
  check_type: 'self_harm' | 'violence' | 'illegal' | 'harassment' | 'privacy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patterns: RegExp[];
  action: 'block' | 'escalate' | 'warn' | 'redirect';
  message: string;
}

export interface ContentFilter {
  category: 'medical_advice' | 'legal_advice' | 'financial_advice' | 'emotional_manipulation';
  enabled: boolean;
  keywords: string[];
  patterns: RegExp[];
  action: 'block' | 'modify' | 'warn';
  replacement_text?: string;
  message?: string;
}

export interface OutputValidator {
  name: string;
  description: string;
  validation_type: 'tone' | 'structure' | 'content' | 'format';
  rules: Array<{
    pattern: RegExp;
    required: boolean;
    message: string;
  }>;
  action: 'reject' | 'modify' | 'warn';
}
