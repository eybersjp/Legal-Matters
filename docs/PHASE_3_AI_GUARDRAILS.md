# Phase 3 AI Operational Guardrails & Compliance Policy

This document defines the strict, non-negotiable guardrails, compliance gates, and data containment boundaries governing all artificial intelligence features inside **Legal Matters**. All AI workflows must be designed and reviewed against these principles before development begins.

---

## 1. Compliance Core Principles

### 1.1 Human-in-the-Loop Validation (Required)
- **Rule**: AI-generated content (summaries, extracted fields, lists of missing files, or briefs) is strictly advisory and **Draft** state.
- **Action Restriction**: No AI outputs may trigger automated external actions, such as emailing clients, filing pleadings, creating bank payment files, or closing matters.
- **Approval Gate**: Practitioners must review and click an **Approve** button on any AI output card before the status transitions from `pending` to `approved`.
- **Display Isolation**: Unapproved AI content must display a prominent warning banner: *"Warning: This content is draft AI analysis and has not been verified by a practitioner."*

### 1.2 Multi-Tenant Data Containment
- **System Isolation**: All LLM processing context (prompts, embeddings, system headers) must be dynamically filtered and partitioned by `firm_id`.
- **Zero Cross-Tenant Leakage**: LLM templates must never compile parameters across firms. When populating Vector stores or running similarity searches, the queries must strictly enforce namespace or metadata filtering on `firm_id`.
- **System Prompt Bounds**: Every LLM system prompt must contain strict boundary directives:
  - *"You are an assistant for [Firm Name] only. You are strictly forbidden from referencing data or documents outside the matter context for [Matter ID]."*

### 1.3 POPIA Compliance & Processing Gating
- **PII Exclusion Flag**: A document-level flag `is_ai_excluded` (defaulting to `false`) will allow practitioners to exclude highly sensitive documents (e.g. medical certificates or personal financial accounts) from LLM parsing entirely.
- **Practitioner Consent**: Processing any client files requires checking the client's `data_retention_confirmed` field or showing a POPIA notice warning before ingestion.

---

## 2. Source-Citations & Provenance Requirements

Any structured AI response must include verified sources. Every summary or key-value pair generated must map to the original document reference:

```json
{
  "summary": "The plaintiff is claiming damages for medical negligence...",
  "citations": [
    {
      "quote": "The Plaintiff claims damages in the sum of R500,000.00",
      "document_id": "00000000-0000-0000-0000-000000000001",
      "version_number": 1,
      "page_number": 3,
      "confidence": 0.985
    }
  ]
}
```

### Citation Rules
1. **Verification Match**: If the LLM returns a source citation, the system must parse the quoted string and verify it exists within the extracted raw text of the document before storing it.
2. **Confidence Metric**: The LLM must output a self-rated confidence level. If the confidence falls below `0.70`, the interface must highlight the citation with a low-confidence warning.

---

## 3. Prohibited AI Behaviors
The following activities are strictly **prohibited**:
- **Automated Client Comms**: AI must never send email or SMS alerts directly to clients.
- **Automated Pleading Filings**: AI must not generate or submit draft pleadings to the court registrar automatically.
- **Automated Case Closure**: AI may suggest the readiness score is high, but the actual closure action remains locked behind the practitioner manual wizard.
- **Auto-Approval**: The system must never auto-approve summaries, even for highly confident outputs.
- **Global Model Fine-Tuning**: Tenant documents must never be used to fine-tune global, public models.

---

## 4. Auditing & Tracing Rules

Every AI action writes a detailed audit footprint in the `public.audit_logs` table:

| Field | Value |
| :--- | :--- |
| **Action** | `ai_generation_request` / `ai_approval` / `ai_rejection` |
| **Details** | Includes model ID, token usage, processed document IDs, and execution times. |
| **Tenant** | Scoped to the active `firm_id`. |
| **Actor** | Logged under the Clerk ID of the practitioner executing the request. |
