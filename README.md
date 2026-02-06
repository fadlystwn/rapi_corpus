# RAPI Knowledge Corpus

Canonical knowledge corpus for the RAPI workplace decision assistant.

## Purpose

This corpus is the **single source of truth** used by RAPI’s Retrieval-Augmented Generation (RAG) system.

Its purpose is to:
- Ground AI responses in **curated, controlled knowledge**
- Prevent generic or motivational output
- Ensure decisions are framed with **risk, context, and consequence awareness**

This corpus contains **knowledge**, not opinions, and does not perform reasoning by itself.

---

## Scope & Boundaries

Included:
- Workplace scenarios with political and social nuance
- Communication patterns and response strategies
- Risk patterns and trade-off analysis
- Organizational and company-culture dynamics
- System and architectural constraints relevant to AI behavior

Explicitly excluded:
- Motivational or emotional support content
- Legal, medical, or HR policy advice
- Generic career “tips” without situational context

## Structure

```text
rapi_ai_corpus/
├── corpus/                              # Canonical knowledge sources
│   ├── communication_patterns.md
│   ├── decisions_principles.md
│   ├── domain_guardrails.md
│   ├── pain_points.md
│   ├── response_output_standard.md
│   ├── domains/
│   ├── glossaries/
│   ├── scenarios/
│   └── metadata.json
├── knowledge/                           # Technical architecture documentation
│   ├── backend_architecture.md
│   └── rag_architecture.md
├── processed/                           # RAG-ready artifacts (generated)
│   ├── chunks/                          # Text units sent to embedding
│   │   ├── domain_guardrails.json
│   │   ├── response_output_standard.json
│   │   ├── communication_patterns.json
│   │   ├── pain_points.json
│   │   ├── risk_pattern_matrix.json
│   │   └── decisions_principles.json
│   ├── embeddings/                      # Vector data only
│   │   ├── domain_guardrails.vec.json
│   │   ├── response_output_standard.vec.json
│   │   ├── communication_patterns.vec.json
│   │   ├── pain_points.vec.json
│   │   ├── risk_pattern_matrix.vec.json
│   │   └── decisions_principles.vec.json
│   ├── metadata/                        # Retrieval control & traceability
│   │   ├── domain_guardrails.meta.json
│   │   ├── response_output_standard.meta.json
│   │   ├── communication_patterns.meta.json
│   │   ├── pain_points.meta.json
│   │   ├── risk_pattern_matrix.meta.json
│   │   ├── decisions_principles.meta.json
│   │   └── corpus_index.json
│   ├── retrieval_rules.json             # Retrieval orchestration rules
│   └── prompt_contract.json             # Prompt assembly contract
├── control_governance_framework.md       # Update rules & ownership
└── README.md                            # Corpus definition & usage
```

---

## Usage

### Document Processing Pipeline

1. **Source Documents** (`/corpus`) - Manually curated and versioned knowledge
2. **Chunk Processing** - Documents are processed into semantic chunks with metadata
3. **Embedding Generation** - Chunks are converted to vector representations
4. **Retrieval Rules** - Deterministic selection logic based on `retrieval_rules.json`
5. **Prompt Assembly** - Chunks assembled according to `prompt_contract.json`

### Retrieval System

The backend retrieves content deterministically based on:
- User context and intent
- Risk profile and safety constraints
- Communication channel and visibility
- Domain boundaries and guardrails

### Key Configuration Files

- **`retrieval_rules.json`** - Governs chunk selection, ordering, and injection rules
- **`prompt_contract.json`** - Defines prompt assembly structure and integrity checks
- **`corpus_index.json`** - Master index of all processed documents and metadata

The LLM **never accesses raw documents or vector stores directly**. All knowledge injection is controlled through the deterministic retrieval and assembly pipeline.

---

## Governance & Management

- This repository is **private**
- Changes require review and version bumps
- Every document must have:
  - Clear intent
  - Defined scope
  - No overlap with prohibited domains

### Processing Rules

- **Chunk Generation**: Documents are processed into semantic chunks with unique IDs
- **Embedding Creation**: Vector representations generated using consistent model
- **Metadata Management**: Complete traceability from source to chunk to embedding
- **Version Control**: All artifacts are versioned and immutable

### Safety & Compliance

- Guardrails are always included in retrieval (critical priority)
- Response standards enforce consistent tone and structure
- Risk patterns only included when explicitly triggered
- All content validated against domain boundaries

This corpus defines **what RAPI is allowed to know and reference**.

> Knowledge clarity → Controlled retrieval → Predictable AI behavior

---

## File Summary

**Total Processed Artifacts**: 65 chunks, 65 embeddings, 7 metadata files
**Chunk Types**: guardrails (10), response_standards (10), communication_patterns (10), pain_points (14), risk_matrix (10), decision_principles (11)
**Configuration**: retrieval_rules.json, prompt_contract.json
**Status**: Ready for RAG system integration
