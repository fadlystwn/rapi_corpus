import { SafetyCheck, ContentFilter, OutputValidator, GuardrailResult } from './types';

export class ValidationRules {
  private safetyChecks: Map<string, SafetyCheck>;
  private contentFilters: Map<string, ContentFilter>;
  private outputValidators: Map<string, OutputValidator>;

  constructor() {
    this.safetyChecks = new Map();
    this.contentFilters = new Map();
    this.outputValidators = new Map();
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Safety Checks
    this.initializeSafetyChecks();
    
    // Content Filters
    this.initializeContentFilters();
    
    // Output Validators
    this.initializeOutputValidators();
  }

  private initializeSafetyChecks(): void {
    // Self-harm detection
    this.safetyChecks.set('self_harm', {
      check_type: 'self_harm',
      severity: 'critical',
      patterns: [
        /\b(kill|self.?harm|suicide|end.?my.?life)\b/i,
        /\b(hurt|injure|harm).?myself\b/i,
        /\b(want to|wanting to).?(die|disappear|vanish)\b/i
      ],
      action: 'escalate',
      message: 'If you\'re having thoughts of self-harm, please seek immediate help from crisis services.'
    });

    // Violence detection
    this.safetyChecks.set('violence', {
      check_type: 'violence',
      severity: 'high',
      patterns: [
        /\b(hurt|kill|harm|attack|violence).?(someone|person|coworker|boss)\b/i,
        /\b(weapon|gun|knife|weaponry)\b/i,
        /\b(revenge|retaliation|payback).?(violent|harmful)\b/i
      ],
      action: 'block',
      message: 'I cannot provide guidance on violent or harmful actions.'
    });

    // Illegal activities
    this.safetyChecks.set('illegal', {
      check_type: 'illegal',
      severity: 'high',
      patterns: [
        /\b(illegal|unlawful|criminal).?(activity|behavior|action)\b/i,
        /\b(fraud|theft|stealing|embezzlement)\b/i,
        /\b(hack|breach|unauthorized).?(access|data|system)\b/i
      ],
      action: 'block',
      message: 'I cannot provide guidance on illegal activities.'
    });

    // Harassment
    this.safetyChecks.set('harassment', {
      check_type: 'harassment',
      severity: 'high',
      patterns: [
        /\b(harass|bully|intimidate|threaten).?(coworker|colleague)\b/i,
        /\b(stalking|unwanted).?(attention|contact)\b/i,
        /\b(discriminate|bias).?(based on).?(race|gender|age|religion)\b/i
      ],
      action: 'redirect',
      message: 'For harassment concerns, please contact HR or use official reporting channels.'
    });

    // Privacy violations
    this.safetyChecks.set('privacy', {
      check_type: 'privacy',
      severity: 'medium',
      patterns: [
        /\b(access|share|leak).?(personal|private|confidential).?(data|information)\b/i,
        /\b(snoop|spy|monitor).?(coworker|colleague)\b/i,
        /\b(personal|private).?(email|messages|files)\b/i
      ],
      action: 'warn',
      message: 'Accessing others\' private information without authorization violates privacy policies.'
    });
  }

  private initializeContentFilters(): void {
    // Medical advice filter
    this.contentFilters.set('medical_advice', {
      category: 'medical_advice',
      enabled: true,
      keywords: [
        'diagnosis', 'treatment', 'medication', 'therapy', 'symptoms',
        'medical condition', 'health advice', 'prescription', 'cure'
      ],
      patterns: [
        /\b(diagnose|treat|cure|prescribe).?\b/i,
        /\b(should i|should you).?(take|use|try).?(medication|medicine|drug)\b/i
      ],
      action: 'block',
      message: 'I cannot provide medical advice. Please consult a healthcare professional.'
    });

    // Legal advice filter
    this.contentFilters.set('legal_advice', {
      category: 'legal_advice',
      enabled: true,
      keywords: [
        'legal advice', 'lawsuit', 'attorney', 'lawyer', 'legal rights',
        'sue', 'legal action', 'court', 'legal document', 'contract review'
      ],
      patterns: [
        /\b(should i|can i).?(sue|take legal action|file lawsuit)\b/i,
        /\b(legal advice|legal opinion|legal guidance)\b/i
      ],
      action: 'block',
      message: 'I cannot provide legal advice. Please consult with a qualified attorney.'
    });

    // Financial advice filter
    this.contentFilters.set('financial_advice', {
      category: 'financial_advice',
      enabled: true,
      keywords: [
        'investment', 'financial advice', 'stock', 'portfolio', 'retirement',
        'financial planning', 'tax advice', 'investment strategy'
      ],
      patterns: [
        /\b(invest|buy|sell).?(stock|bond|investment)\b/i,
        /\b(financial advice|investment recommendation)\b/i
      ],
      action: 'block',
      message: 'I cannot provide financial advice. Please consult a qualified financial advisor.'
    });

    // Emotional manipulation filter
    this.contentFilters.set('emotional_manipulation', {
      category: 'emotional_manipulation',
      enabled: true,
      keywords: [
        'manipulate', 'gaslight', 'emotional blackmail', 'guilt trip',
        'play mind games', 'psychological manipulation'
      ],
      patterns: [
        /\b(how to|ways to).?(manipulate|gaslight|control).?\b/i,
        /\b(emotional).?(blackmail|manipulation|control)\b/i
      ],
      action: 'block',
      message: 'I cannot provide guidance on emotional manipulation or harmful psychological tactics.'
    });
  }

  private initializeOutputValidators(): void {
    // Tone validator
    this.outputValidators.set('tone_validator', {
      name: 'RAPI Tone Validator',
      description: 'Ensures output maintains professional, supportive tone',
      validation_type: 'tone',
      rules: [
        {
          pattern: /\b(you should|you must|you have to)\b/i,
          required: false,
          message: 'Avoid prescriptive language. Use "consider" or "options include" instead.'
        },
        {
          pattern: /\b(always|never|everyone|nobody)\b/i,
          required: false,
          message: 'Avoid absolute statements. Use qualifiers instead.'
        },
        {
          pattern: /\b(obviously|clearly|simply|just)\b/i,
          required: false,
          message: 'Avoid condescending language.'
        }
      ],
      action: 'modify'
    });

    // Structure validator
    this.outputValidators.set('structure_validator', {
      name: 'RAPI Structure Validator',
      description: 'Ensures output follows RAPI response structure',
      validation_type: 'structure',
      rules: [
        {
          pattern: /\b(risk|consequence|downside)\b/i,
          required: true,
          message: 'Response must include risk assessment.'
        },
        {
          pattern: /\b(option|choice|alternative)\b/i,
          required: true,
          message: 'Response must provide multiple options.'
        },
        {
          pattern: /\b(safe|conservative|low.?risk)\b/i,
          required: true,
          message: 'Response must include safe option.'
        }
      ],
      action: 'reject'
    });

    // Content validator
    this.outputValidators.set('content_validator', {
      name: 'RAPI Content Validator',
      description: 'Ensures content stays within workplace decision scope',
      validation_type: 'content',
      rules: [
        {
          pattern: /\b(legal|medical|financial).?(advice|guidance|recommendation)\b/i,
          required: false,
          message: 'Response should not provide professional advice outside scope.'
        },
        {
          pattern: /\b(therapy|counseling|psychological).?(treatment|help)\b/i,
          required: false,
          message: 'Response should not provide therapeutic advice.'
        }
      ],
      action: 'warn'
    });
  }

  checkSafety(input: string): GuardrailResult {
    const result: GuardrailResult = {
      passed: true,
      triggered_rules: [],
      warnings: []
    };

    for (const [checkId, safetyCheck] of this.safetyChecks) {
      for (const pattern of safetyCheck.patterns) {
        if (pattern.test(input)) {
          result.triggered_rules.push({
            rule_id: checkId,
            rule_name: `Safety Check: ${safetyCheck.check_type}`,
            severity: safetyCheck.severity,
            action: safetyCheck.action,
            message: safetyCheck.message
          });

          if (safetyCheck.action === 'block' || safetyCheck.action === 'escalate') {
            result.passed = false;
            result.blocked_reason = safetyCheck.message;
          }

          if (safetyCheck.action === 'warn') {
            result.warnings.push(safetyCheck.message);
          }

          break; // Only trigger once per check
        }
      }
    }

    return result;
  }

  filterContent(input: string): GuardrailResult {
    const result: GuardrailResult = {
      passed: true,
      triggered_rules: [],
      warnings: []
    };

    let modifiedInput = input;

    for (const [filterId, contentFilter] of this.contentFilters) {
      if (!contentFilter.enabled) continue;

      let triggered = false;

      // Check keywords
      for (const keyword of contentFilter.keywords) {
        if (input.toLowerCase().includes(keyword.toLowerCase())) {
          triggered = true;
          break;
        }
      }

      // Check patterns
      if (!triggered) {
        for (const pattern of contentFilter.patterns) {
          if (pattern.test(input)) {
            triggered = true;
            break;
          }
        }
      }

      if (triggered) {
        result.triggered_rules.push({
          rule_id: filterId,
          rule_name: `Content Filter: ${contentFilter.category}`,
          severity: 'high',
          action: contentFilter.action,
          message: contentFilter.message
        });

        if (contentFilter.action === 'block') {
          result.passed = false;
          result.blocked_reason = contentFilter.message;
        } else if (contentFilter.action === 'modify' && contentFilter.replacement_text) {
          modifiedInput = modifiedInput.replace(
            new RegExp(contentFilter.keywords.join('|'), 'gi'),
            contentFilter.replacement_text
          );
          result.modified_input = modifiedInput;
        }
      }
    }

    return result;
  }

  validateOutput(output: string): GuardrailResult {
    const result: GuardrailResult = {
      passed: true,
      triggered_rules: [],
      warnings: []
    };

    for (const [validatorId, validator] of this.outputValidators) {
      for (const rule of validator.rules) {
        const hasRequired = rule.pattern.test(output);
        
        if (rule.required && !hasRequired) {
          result.triggered_rules.push({
            rule_id: validatorId,
            rule_name: validator.name,
            severity: 'medium',
            action: validator.action,
            message: rule.message
          });

          if (validator.action === 'reject') {
            result.passed = false;
            result.blocked_reason = `Output validation failed: ${rule.message}`;
          }
        }

        if (!rule.required && hasRequired) {
          result.warnings.push(rule.message);
        }
      }
    }

    return result;
  }

  addSafetyCheck(checkId: string, safetyCheck: SafetyCheck): void {
    this.safetyChecks.set(checkId, safetyCheck);
  }

  addContentFilter(filterId: string, contentFilter: ContentFilter): void {
    this.contentFilters.set(filterId, contentFilter);
  }

  addOutputValidator(validatorId: string, outputValidator: OutputValidator): void {
    this.outputValidators.set(validatorId, outputValidator);
  }

  exportConfiguration(): Record<string, any> {
    return {
      safety_checks: Object.fromEntries(this.safetyChecks),
      content_filters: Object.fromEntries(this.contentFilters),
      output_validators: Object.fromEntries(this.outputValidators),
      version: '1.0.0',
      exported_at: new Date().toISOString()
    };
  }

  importConfiguration(config: Record<string, any>): void {
    if (config.safety_checks) {
      this.safetyChecks = new Map(Object.entries(config.safety_checks));
    }
    
    if (config.content_filters) {
      this.contentFilters = new Map(Object.entries(config.content_filters));
    }
    
    if (config.output_validators) {
      this.outputValidators = new Map(Object.entries(config.output_validators));
    }
  }
}
