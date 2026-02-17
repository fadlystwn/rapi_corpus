import { DomainGuardrail, GuardrailResult, GuardrailRule } from './types';

export class DomainGuardrails {
  private domains: Map<string, DomainGuardrail>;
  private rules: Map<string, GuardrailRule>;

  constructor() {
    this.domains = new Map();
    this.rules = new Map();
    this.initializeDefaultGuardrails();
  }

  private initializeDefaultGuardrails(): void {
    // Career Domain Guardrails
    this.domains.set('career', {
      domain: 'career',
      allowed_topics: [
        'career_advancement',
        'performance_review',
        'skill_development',
        'workplace_positioning',
        'job_transition_considerations',
        'professional_growth',
        'career_planning'
      ],
      disallowed_topics: [
        'legal_employment_advice',
        // 'salary_negotiation_tactics', // Moved to guided refusal
        'contract_interpretation',
        'discrimination_claims',
        'union_legal_strategies',
        // 'compensation_legal_review' // Moved to guided refusal
      ],
      required_context: ['current_role', 'career_goals', 'industry_context'],
      risk_threshold: 0.7
    });

    // Communication Domain Guardrails
    this.domains.set('communication', {
      domain: 'communication',
      allowed_topics: [
        'professional_messaging',
        'meeting_communication',
        'conflict_resolution',
        'upward_communication',
        'peer_communication',
        'cross_functional_coordination',
        'presentation_skills',
        'digital_etiquette'
      ],
      disallowed_topics: [
        'harassment_reporting',
        'legal_complaint_filing',
        'hr_grievance_procedures',
        'therapy_counseling',
        'relationship_advice',
        'manipulative_tactics'
      ],
      required_context: ['audience', 'channel', 'power_gap'],
      risk_threshold: 0.6
    });

    // Engineering Domain Guardrails
    this.domains.set('engineering', {
      domain: 'engineering',
      allowed_topics: [
        'team_collaboration',
        'technical_communication',
        'cross_function_coordination',
        'engineering_leadership',
        'stakeholder_management',
        'project_communication',
        'technical_decision_communication'
      ],
      disallowed_topics: [
        'technical_implementation',
        'architecture_design',
        'code_review_procedures',
        'technology_selection',
        'security_implementation',
        'devops_procedures'
      ],
      required_context: ['technical_complexity', 'stakeholder_level', 'business_impact'],
      risk_threshold: 0.5
    });

    // Initialize rules
    this.initializeRules();
  }

  private initializeRules(): void {
    // Domain boundary rules
    this.addRule({
      id: 'domain_boundary_career',
      name: 'Career Domain Boundary',
      description: 'Ensures career advice stays within allowed topics',
      category: 'domain',
      severity: 'high',
      enabled: true,
      conditions: [
        {
          type: 'domain',
          operator: 'equals',
          value: 'career'
        }
      ],
      actions: [
        {
          type: 'warn',
          message: 'This topic may require professional legal or HR guidance'
        }
      ]
    });

    this.addRule({
      id: 'domain_boundary_communication',
      name: 'Communication Domain Boundary',
      description: 'Ensures communication advice stays within professional boundaries',
      category: 'domain',
      severity: 'high',
      enabled: true,
      conditions: [
        {
          type: 'domain',
          operator: 'equals',
          value: 'communication'
        }
      ],
      actions: [
        {
          type: 'warn',
          message: 'For HR or legal issues, please consult appropriate channels'
        }
      ]
    });

    this.addRule({
      id: 'domain_boundary_engineering',
      name: 'Engineering Domain Boundary',
      description: 'Ensures engineering advice focuses on workplace dynamics, not technical implementation',
      category: 'domain',
      severity: 'medium',
      enabled: true,
      conditions: [
        {
          type: 'domain',
          operator: 'equals',
          value: 'engineering'
        }
      ],
      actions: [
        {
          type: 'redirect',
          message: 'I can help with workplace communication aspects, but technical implementation requires specialized expertise'
        }
      ]
    });
  }

  addRule(rule: GuardrailRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  checkDomainBoundary(input: string, detectedDomain: string): GuardrailResult {
    const domainGuardrail = this.domains.get(detectedDomain);
    if (!domainGuardrail) {
      return {
        passed: true,
        triggered_rules: [],
        warnings: [`Unknown domain: ${detectedDomain}`]
      };
    }

    const result: GuardrailResult = {
      passed: true,
      triggered_rules: [],
      warnings: []
    };

    // Check for disallowed topics
    const lowerInput = input.toLowerCase();
    for (const disallowedTopic of domainGuardrail.disallowed_topics) {
      if (this.containsTopic(lowerInput, disallowedTopic)) {
        result.passed = false;
        result.triggered_rules.push({
          rule_id: `disallowed_${disallowedTopic}`,
          rule_name: `Disallowed Topic: ${disallowedTopic}`,
          severity: 'high',
          action: 'block',
          message: `This topic is outside the scope of workplace decision assistance`
        });
        result.blocked_reason = `Topic "${disallowedTopic}" is not allowed in domain "${detectedDomain}"`;
        break;
      }
    }

    // Check domain-specific rules
    const domainRules = Array.from(this.rules.values()).filter(
      rule => rule.category === 'domain' && rule.enabled
    );

    for (const rule of domainRules) {
      if (this.evaluateRule(rule, input, detectedDomain)) {
        result.triggered_rules.push({
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          action: rule.actions[0]?.type || 'warn',
          message: rule.actions[0]?.message
        });

        if (rule.actions[0]?.type === 'block') {
          result.passed = false;
          result.blocked_reason = rule.actions[0]?.message || 'Blocked by guardrail rule';
        }
      }
    }

    return result;
  }

  validateTopic(input: string, domain: string, topic: string): boolean {
    const domainGuardrail = this.domains.get(domain);
    if (!domainGuardrail) return false;

    return domainGuardrail.allowed_topics.includes(topic) &&
           !domainGuardrail.disallowed_topics.includes(topic);
  }

  getRequiredContext(domain: string): string[] {
    const domainGuardrail = this.domains.get(domain);
    return domainGuardrail?.required_context || [];
  }

  getRiskThreshold(domain: string): number {
    const domainGuardrail = this.domains.get(domain);
    return domainGuardrail?.risk_threshold || 0.5;
  }

  getAllowedTopics(domain: string): string[] {
    const domainGuardrail = this.domains.get(domain);
    return domainGuardrail?.allowed_topics || [];
  }

  getDisallowedTopics(domain: string): string[] {
    const domainGuardrail = this.domains.get(domain);
    return domainGuardrail?.disallowed_topics || [];
  }

  private containsTopic(input: string, topic: string): boolean {
    const keywords = topic.split('_');
    return keywords.every(keyword => input.includes(keyword));
  }

  private evaluateRule(rule: GuardrailRule, input: string, domain: string): boolean {
    return rule.conditions.every(condition => {
      switch (condition.type) {
        case 'domain':
          return condition.operator === 'equals' ? 
            domain === condition.value : 
            domain.includes(condition.value as string);
        
        case 'keyword':
          const searchText = condition.case_sensitive ? input : input.toLowerCase();
          const searchValue = condition.case_sensitive ? 
            condition.value as string : 
            (condition.value as string).toLowerCase();
          
          return condition.operator === 'contains' ? 
            searchText.includes(searchValue) : 
            searchText.match(searchValue) !== null;
        
        case 'pattern':
          const pattern = condition.value as RegExp;
          return pattern.test(input);
        
        default:
          return false;
      }
    });
  }

  exportConfiguration(): Record<string, any> {
    return {
      domains: Object.fromEntries(this.domains),
      rules: Object.fromEntries(this.rules),
      version: '1.0.0',
      exported_at: new Date().toISOString()
    };
  }

  importConfiguration(config: Record<string, any>): void {
    if (config.domains) {
      this.domains = new Map(Object.entries(config.domains));
    }
    
    if (config.rules) {
      this.rules = new Map(Object.entries(config.rules));
    }
  }
}
