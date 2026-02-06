# RAPI Guardrails Module

**Version:** 1.0
**Status:** Active
**Type:** Safety & Scope Control
**Owner:** RAPI Product
**Last Updated:** 2026-01-31

---

## Purpose

The Guardrails module provides comprehensive safety and scope control for the RAPI system, ensuring:

- **Domain boundary enforcement** - Keeps responses within approved workplace domains
- **Safety protection** - Prevents harmful or dangerous content
- **Content filtering** - Blocks professional advice outside scope
- **Output validation** - Ensures responses meet RAPI standards

---

## Architecture

```
guardrails/
├── types.ts                    # Core type definitions
├── domain_guardrails.ts        # Domain boundary enforcement
├── validation_rules.ts         # Safety checks and content filters
├── refusal_patterns.md         # Standardized refusal responses
├── index.ts                    # Main guardrails system
└── README.md                   # This documentation
```

---

## Core Components

### 1. Domain Guardrails (`domain_guardrails.ts`)

Enforces topic boundaries for each domain:

- **Career Domain**: Career advancement, performance reviews, professional growth
- **Communication Domain**: Professional messaging, conflict resolution, workplace dynamics  
- **Engineering Domain**: Team collaboration, technical communication, stakeholder management

**Features:**
- Allowed/disallowed topic lists per domain
- Required context validation
- Risk threshold enforcement
- Configurable boundary rules

### 2. Validation Rules (`validation_rules.ts`)

Comprehensive safety and content filtering:

**Safety Checks:**
- Self-harm detection (critical priority)
- Violence/harm prevention
- Illegal activity blocking
- Harassment reporting redirection
- Privacy violation warnings

**Content Filters:**
- Medical advice blocking
- Legal advice blocking
- Financial advice blocking
- Emotional manipulation prevention

**Output Validators:**
- Tone enforcement (professional, supportive)
- Structure validation (risk assessment, multiple options)
- Content scope verification

### 3. Refusal Patterns (`refusal_patterns.md`)

Standardized responses for boundary violations:

- Professional advice boundaries (medical, legal, financial)
- Safety and harm prevention
- Workplace policy violations
- Technical implementation boundaries

---

## Usage Examples

### Basic Guardrails Setup

```typescript
import { GuardrailsSystem, defaultGuardrailConfig } from './guardrails';

const guardrails = new GuardrailsSystem(defaultGuardrailConfig);

// Validate user input
const input = "How should I handle a legal dispute with my employer?";
const result = guardrails.validateInput(input, 'communication');

if (!result.passed) {
  const refusal = guardrails.generateRefusalResponse(result);
  console.log(refusal);
}
```

### Domain-Specific Validation

```typescript
// Check if topic is allowed in career domain
const isAllowed = guardrails.isTopicAllowed('career', 'legal_employment_advice');
// Returns: false

// Get allowed topics for communication domain
const allowedTopics = guardrails.getAllowedTopics('communication');
// Returns: ['professional_messaging', 'conflict_resolution', ...]
```

### Output Validation

```typescript
const output = "You should definitely confront your boss about this issue.";
const validationResult = guardrails.validateOutput(output);

if (!validationResult.passed) {
  console.log('Output validation failed:', validationResult.triggered_rules);
}
```

---

## Configuration

### GuardrailConfig Options

```typescript
interface GuardrailConfig {
  enable_domain_checks: boolean;      // Enable domain boundary enforcement
  enable_safety_checks: boolean;      // Enable safety protection
  enable_content_filters: boolean;    // Enable content filtering
  enable_output_validation: boolean;  // Enable output validation
  strict_mode: boolean;               // Block on all violations
}
```

### Domain Configuration

Each domain can be configured with:

- **Allowed Topics**: Approved discussion topics
- **Disallowed Topics**: Explicitly forbidden topics
- **Required Context**: Context needed for valid responses
- **Risk Threshold**: Maximum acceptable risk level

---

## Integration with RAPI System

### Pre-Processing Integration

```typescript
// In your main RAPI system
function processUserInput(input: string) {
  const detectedDomain = detectDomain(input);
  const validationResult = guardrails.validateInput(input, detectedDomain);
  
  if (!validationResult.passed) {
    return {
      response: guardrails.generateRefusalResponse(validationResult),
      response_mode: 'blocked',
      metadata: validationResult
    };
  }
  
  // Continue with normal processing...
}
```

### Post-Processing Integration

```typescript
// After generating response
function finalizeResponse(response: string) {
  const outputValidation = guardrails.validateOutput(response);
  
  if (!outputValidation.passed) {
    // Modify or regenerate response
    return modifyResponseForCompliance(response);
  }
  
  return response;
}
```

---

## Testing and Validation

### Test Categories

1. **Safety Tests**
   - Self-harm triggers
   - Violence/harm scenarios
   - Illegal activity requests

2. **Boundary Tests**
   - Professional advice requests (medical, legal, financial)
   - Domain boundary violations
   - Technical implementation requests

3. **Output Tests**
   - Tone validation
   - Structure requirements
   - Content scope compliance

### Success Criteria

- **Zero harmful content** passes through
- **All professional advice** is redirected appropriately
- **Domain boundaries** are consistently enforced
- **Output quality** meets RAPI standards

---

## Monitoring and Maintenance

### Key Metrics

- **Guardrail trigger rate** by category
- **False positive rate** for content filters
- **Response modification rate** for output validation
- **User satisfaction** with refusal responses

### Regular Updates

- **Pattern updates** for emerging safety concerns
- **Domain boundary refinements** based on user feedback
- **Refusal pattern improvements** for better user experience
- **Compliance updates** for regulatory changes

---

## Emergency Procedures

### Critical Safety Triggers

1. **Self-harm content** → Immediate crisis resources
2. **Violence threats** → Safety-first response
3. **Illegal activities** → Compliance reporting

### Escalation Protocol

1. **Log critical violations** for review
2. **Notify safety team** of high-severity triggers
3. **Update patterns** based on new threat vectors
4. **Review user impact** and adjust responses

---

This guardrails system ensures RAPI remains a safe, professional, and valuable workplace decision assistant while maintaining clear boundaries and protecting users from harm.
