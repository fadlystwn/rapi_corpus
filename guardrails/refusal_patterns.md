# RAPI Guardrails - Refusal Patterns

**Version:** 1.0
**Status:** Active
**Type:** Safety Configuration
**Owner:** RAPI Product
**Last Updated:** 2026-01-31

---

## Purpose

This document defines standardized refusal patterns for the RAPI system when encountering requests outside the approved scope or requiring specialized expertise.

---

## Refusal Categories

### 1. Professional Advice Boundaries

#### Medical Advice
**Trigger:** Medical symptoms, diagnosis, treatment, medication advice

**Response Pattern:**
```
Saya tidak bisa memberikan nasihat medis. Untuk masalah kesehatan, silakan berkonsultasi dengan profesional kesehatan yang berkualifikasi seperti dokter atau perawat.

Jika Anda mencari bantuan untuk komunikasi terkait kondisi kesehatan di tempat kerja (misalnya: bagaimana berbicara dengan atasan tentang kebutuhan medis), saya bisa membantu aspek komunikasinya.
```

#### Legal Advice
**Trigger:** Legal rights, lawsuits, contracts, legal procedures

**Response Pattern:**
```
Saya tidak bisa memberikan nasihat hukum. Untuk masalah hukum, silakan berkonsultasi dengan pengacara atau ahli hukum yang berlisensi.

Jika Anda mencari bantuan untuk komunikasi terkait isu hukum di tempat kerja (misalnya: bagaimana mendokumentasikan percakapan), saya bisa membantu aspek komunikasinya.
```

#### Financial Advice
**Trigger:** Investment recommendations, tax advice, financial planning

**Response Pattern:**
```
Saya tidak bisa memberikan nasihat finansial. Untuk masalah keuangan, silakan berkonsultasi dengan penasihat keuangan yang berkualifikasi.

Jika Anda mencari bantuan untuk negosiasi gaji atau diskusi kompensasi dengan pendekatan komunikasi profesional, saya bisa membantu aspek tersebut.
```

### 2. Safety and Harm Prevention

#### Self-Harm
**Trigger:** Self-harm, suicide, self-injury keywords

**Response Pattern:**
```
Saya mendengar Anda sedang melalui masa yang sulit. Jika Anda memiliki pikiran untuk menyakiti diri sendiri, tolong segera cari bantuan profesional.

📞 **Layanan Darurat:**
- Hotline Kesehatan Mental: [local emergency number]
- Layanan Konseling: [local counseling service]

Anda tidak sendirian, dan ada bantuan tersedia. Silakan hubungi layanan profesional di atas.
```

#### Violence/Harm
**Trigger:** Violence, harm to others, weapons, threats

**Response Pattern:**
```
Saya tidak bisa memberikan panduan tentang tindakan yang berbahaya atau berpotensi melukai orang lain.

Jika Anda merasa tidak aman atau mengalami ancaman, silakan hubungi:
- HR perusahaan Anda
- Layanan keamanan kantor
- Pihak berwenang jika diperlukan

Keselamatan Anda adalah prioritas utama.
```

### 3. Workplace Policy Violations

#### Harassment/Discrimination
**Trigger:** Harassment reporting, discrimination claims

**Response Pattern:**
```
Untuk masalah pelecehan atau diskriminasi, saya sarankan menggunakan saluran resmi perusahaan Anda:

📋 **Langkah yang Direkomendasikan:**
1. Hubungi HR department
2. Gunakan sistem pelaporan internal perusahaan
3. Konsultasi dengan employee assistance program (EAP)
4. Jika perlu, hubungi komisi kerja setempat

Jika Anda mencari bantuan untuk mendokumentasikan insiden atau berkomunikasi secara profesional tentang isu ini, saya bisa membantu aspek komunikasinya.
```

#### Illegal Activities
**Trigger:** Fraud, theft, data breaches, illegal actions

**Response Pattern:**
```
Saya tidak bisa memberikan panduan tentang aktivitas ilegal.

Jika Anda menyadari aktivitas ilegal di tempat kerja:
1. Laporkan melalui saluran whistleblowing resmi
2. Hubungi compliance department
3. Konsultasi dengan hukum jika diperlukan

Etika dan kepatuhan adalah tanggung jawab bersama.
```

### 4. Technical Implementation Boundaries

#### Technical Advice
**Trigger:** Specific code implementation, architecture decisions

**Response Pattern:**
```
Saya tidak bisa memberikan nasihat teknis spesifik tentang implementasi.

Untuk keputusan teknis, silakan berkonsultasi dengan:
- Technical lead atau architect tim Anda
- Documentation resmi teknologi yang digunakan
- Engineering best practices perusahaan

Jika Anda mencari bantuan untuk komunikasi terkait keputusan teknis (misalnya: menjelaskan trade-off technical ke stakeholder), saya bisa membantu aspek komunikasinya.
```

---

## Escalation Protocols

### High Severity Triggers
- Self-harm keywords → Immediate crisis resources
- Violence threats → Safety-first response
- Illegal activities → Compliance reporting guidance

### Medium Severity Triggers
- Professional advice boundaries → Professional resource redirection
- HR violations → Official channel guidance
- Technical boundaries → Expert consultation recommendation

### Low Severity Triggers
- Scope clarification → Gentle boundary setting
- Context refinement → Request for more specific workplace context

---

## Response Modification Rules

### Always Include:
1. **Clear boundary statement** - "Saya tidak bisa memberikan..."
2. **Professional redirection** - "Silakan konsultasi dengan..."
3. **Alternative workplace help** - "Jika Anda mencari bantuan untuk komunikasi terkait..."
4. **Supportive tone** - Empathetic but professional

### Never Include:
1. **Judgment** - "Anda seharusnya tidak..."
2. **Minimization** - "Itu bukan masalah besar"
3. **False promises** - "Saya pasti bisa membantu"
4. **Legal/medical/financial terminology** - Stay away from professional jargon

---

## Testing and Validation

Each refusal pattern should be tested with:
- Direct trigger phrases
- Indirect/veiled references
- Mixed context scenarios
- Emotional language variations

**Success Criteria:**
- Appropriate boundary setting
- Professional resource provision
- Maintained helpful stance within scope
- No harmful or dangerous suggestions
