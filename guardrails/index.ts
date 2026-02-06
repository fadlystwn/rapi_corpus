import { DomainGuardrails } from './domain_guardrails';
import { ValidationRules } from './validation_rules';
import { GuardrailResult } from './types';

export interface GuardrailConfig {
  enable_domain_checks: boolean;
  enable_safety_checks: boolean;
  enable_content_filters: boolean;
  enable_output_validation: boolean;
  strict_mode: boolean;
}

export class GuardrailsSystem {
  private domainGuardrails: DomainGuardrails;
  private validationRules: ValidationRules;
  private config: GuardrailConfig;

  constructor(config: Partial<GuardrailConfig> = {}) {
    this.config = {
      enable_domain_checks: true,
      enable_safety_checks: true,
      enable_content_filters: true,
      enable_output_validation: true,
      strict_mode: false,
      ...config
    };

    this.domainGuardrails = new DomainGuardrails();
    this.validationRules = new ValidationRules();
  }

  /**
   * Comprehensive input validation before processing
   */
  validateInput(input: string, detectedDomain?: string): GuardrailResult {
    const combinedResult: GuardrailResult = {
      passed: true,
      triggered_rules: [],
      warnings: []
    };

    // Safety checks (always enabled, highest priority)
    if (this.config.enable_safety_checks) {
      const safetyResult = this.validationRules.checkSafety(input);
      this.mergeResults(combinedResult, safetyResult);
      
      if (!safetyResult.passed) {
        return combinedResult; // Block immediately on safety violations
      }
    }

    // Content filters
    if (this.config.enable_content_filters) {
      const filterResult = this.validationRules.filterContent(input);
      this.mergeResults(combinedResult, filterResult);
      
      if (!filterResult.passed) {
        return combinedResult; // Block on content filter violations
      }
    }

    // Domain boundary checks
    if (this.config.enable_domain_checks && detectedDomain) {
      const domainResult = this.domainGuardrails.checkDomainBoundary(input, detectedDomain);
      this.mergeResults(combinedResult, domainResult);
      
      if (!domainResult.passed && this.config.strict_mode) {
        return combinedResult;
      }
    }

    return combinedResult;
  }

  /**
   * Validate generated output before sending to user
   */
  validateOutput(output: string): GuardrailResult {
    if (!this.config.enable_output_validation) {
      return {
        passed: true,
        triggered_rules: [],
        warnings: []
      };
    }

    return this.validationRules.validateOutput(output);
  }

  /**
   * Check if a topic is allowed for a specific domain
   */
  isTopicAllowed(domain: string, topic: string): boolean {
    return this.domainGuardrails.validateTopic('', domain, topic);
  }

  /**
   * Get allowed topics for a domain
   */
  getAllowedTopics(domain: string): string[] {
    return this.domainGuardrails.getAllowedTopics(domain);
  }

  /**
   * Get disallowed topics for a domain
   */
  getDisallowedTopics(domain: string): string[] {
    return this.domainGuardrails.getDisallowedTopics(domain);
  }

  /**
   * Get required context for a domain
   */
  getRequiredContext(domain: string): string[] {
    return this.domainGuardrails.getRequiredContext(domain);
  }

  /**
   * Get risk threshold for a domain
   */
  getRiskThreshold(domain: string): number {
    return this.domainGuardrails.getRiskThreshold(domain);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GuardrailConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): GuardrailConfig {
    return { ...this.config };
  }

  /**
   * Export complete guardrails configuration
   */
  exportConfiguration(): Record<string, any> {
    return {
      config: this.config,
      domain_guardrails: this.domainGuardrails.exportConfiguration(),
      validation_rules: this.validationRules.exportConfiguration(),
      version: '1.0.0',
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Import guardrails configuration
   */
  importConfiguration(config: Record<string, any>): void {
    if (config.config) {
      this.updateConfig(config.config);
    }
    
    if (config.domain_guardrails) {
      this.domainGuardrails.importConfiguration(config.domain_guardrails);
    }
    
    if (config.validation_rules) {
      this.validationRules.importConfiguration(config.validation_rules);
    }
  }

  /**
   * Get domain guardrails instance for advanced usage
   */
  getDomainGuardrails(): DomainGuardrails {
    return this.domainGuardrails;
  }

  /**
   * Get validation rules instance for advanced usage
   */
  getValidationRules(): ValidationRules {
    return this.validationRules;
  }

  /**
   * Merge multiple guardrail results
   */
  private mergeResults(target: GuardrailResult, source: GuardrailResult): void {
    target.passed = target.passed && source.passed;
    target.triggered_rules.push(...source.triggered_rules);
    target.warnings.push(...source.warnings);
    
    if (source.modified_input && !target.modified_input) {
      target.modified_input = source.modified_input;
    }
    
    if (source.blocked_reason && !target.blocked_reason) {
      target.blocked_reason = source.blocked_reason;
    }
  }

  /**
   * Generate refusal response based on triggered rules
   */
  generateRefusalResponse(result: GuardrailResult): string {
    if (result.passed) {
      return '';
    }

    // Find the highest severity triggered rule
    const highestSeverityRule = result.triggered_rules.reduce((highest, current) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[current.severity as keyof typeof severityOrder] > 
             severityOrder[highest.severity as keyof typeof severityOrder] ? current : highest;
    }, result.triggered_rules[0]);

    // Generate appropriate refusal based on rule type
    if (highestSeverityRule.rule_id.includes('self_harm')) {
      return this.getSelfHarmResponse();
    } else if (highestSeverityRule.rule_id.includes('violence')) {
      return this.getViolenceResponse();
    } else if (highestSeverityRule.rule_id.includes('illegal')) {
      return this.getIllegalResponse();
    } else if (highestSeverityRule.rule_id.includes('medical_advice')) {
      return this.getMedicalAdviceResponse();
    } else if (highestSeverityRule.rule_id.includes('legal_advice')) {
      return this.getLegalAdviceResponse();
    } else if (highestSeverityRule.rule_id.includes('financial_advice')) {
      return this.getFinancialAdviceResponse();
    } else if (highestSeverityRule.rule_id.includes('harassment')) {
      return this.getHarassmentResponse();
    } else {
      return this.getDefaultRefusalResponse(highestSeverityRule.message || 'Request outside scope');
    }
  }

  private getSelfHarmResponse(): string {
    return `Saya mendengar Anda sedang melalui masa yang sulit. Jika Anda memiliki pikiran untuk menyakiti diri sendiri, tolong segera cari bantuan profesional.

📞 **Layanan Darurat:**
- Hotline Kesehatan Mental: 119
- Layanan Konseling: Cari "konseling mental" di area Anda

Anda tidak sendirian, dan ada bantuan tersedia. Silakan hubungi layanan profesional di atas.`;
  }

  private getViolenceResponse(): string {
    return `Saya tidak bisa memberikan panduan tentang tindakan yang berbahaya atau berpotensi melukai orang lain.

Jika Anda merasa tidak aman atau mengalami ancaman, silakan hubungi:
- HR perusahaan Anda
- Layanan keamanan kantor
- Pihak berwenang jika diperlukan

Keselamatan Anda adalah prioritas utama.`;
  }

  private getIllegalResponse(): string {
    return `Saya tidak bisa memberikan panduan tentang aktivitas ilegal.

Jika Anda menyadari aktivitas ilegal di tempat kerja:
1. Laporkan melalui saluran whistleblowing resmi
2. Hubungi compliance department
3. Konsultasi dengan hukum jika diperlukan

Etika dan kepatuhan adalah tanggung jawab bersama.`;
  }

  private getMedicalAdviceResponse(): string {
    return `Saya tidak bisa memberikan nasihat medis. Untuk masalah kesehatan, silakan berkonsultasi dengan profesional kesehatan yang berkualifikasi seperti dokter atau perawat.

Jika Anda mencari bantuan untuk komunikasi terkait kondisi kesehatan di tempat kerja (misalnya: bagaimana berbicara dengan atasan tentang kebutuhan medis), saya bisa membantu aspek komunikasinya.`;
  }

  private getLegalAdviceResponse(): string {
    return `Saya tidak bisa memberikan nasihat hukum. Untuk masalah hukum, silakan berkonsultasi dengan pengacara atau ahli hukum yang berlisensi.

Jika Anda mencari bantuan untuk komunikasi terkait isu hukum di tempat kerja (misalnya: bagaimana mendokumentasikan percakapan), saya bisa membantu aspek komunikasinya.`;
  }

  private getFinancialAdviceResponse(): string {
    return `Saya tidak bisa memberikan nasihat finansial. Untuk masalah keuangan, silakan berkonsultasi dengan penasihat keuangan yang berkualifikasi.

Jika Anda mencari bantuan untuk negosiasi gaji atau diskusi kompensasi dengan pendekatan komunikasi profesional, saya bisa membantu aspek tersebut.`;
  }

  private getHarassmentResponse(): string {
    return `Untuk masalah pelecehan atau diskriminasi, saya sarankan menggunakan saluran resmi perusahaan Anda:

📋 **Langkah yang Direkomendasikan:**
1. Hubungi HR department
2. Gunakan sistem pelaporan internal perusahaan
3. Konsultasi dengan employee assistance program (EAP)
4. Jika perlu, hubungi komisi kerja setempat

Jika Anda mencari bantuan untuk mendokumentasikan insiden atau berkomunikasi secara profesional tentang isu ini, saya bisa membantu aspek komunikasinya.`;
  }

  private getDefaultRefusalResponse(reason: string): string {
    return `Saya tidak bisa memberikan bantuan untuk permintaan ini. ${reason}

Jika ini terkait situasi kerja dan Anda membutuhkan bantuan komunikasi profesional, silakan jelaskan konteks workplace-nya dan saya akan mencoba membantu dalam batas kemampuan saya.`;
  }
}

// Default configuration
export const defaultGuardrailConfig: GuardrailConfig = {
  enable_domain_checks: true,
  enable_safety_checks: true,
  enable_content_filters: true,
  enable_output_validation: true,
  strict_mode: false
};
