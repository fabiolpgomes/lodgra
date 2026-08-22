# Product Requirements Document - Lodgra Property Intelligence

**Document Type:** product-requirements-document  
**Product:** Lodgra  
**Module:** Lodgra Property Intelligence  
**Version:** 0.1  
**Status:** Draft  
**Stage:** Discovery MVP  
**Date:** 2026-08-18  
**Language:** pt-PT  
**Product Owner:** Fabio Gomes  
**Pilot Organization:** Algarve Home Stay  
**Positioning:** first AI-native module of Lodgra  
**Primary Users:** professional property managers, commercial real estate management teams

## Source of Truth

This file is the source of truth for the Lodgra Property Intelligence MVP.

## Executive Summary

Lodgra Property Intelligence transforms incomplete property data into a structured, auditable and presentable market and profitability analysis.

The user provides the information available. Specialist agents research location, demand and comparables. A deterministic financial engine calculates short, medium and long stay scenarios. The system then produces an editable and auditable report ready for owner presentation.

The MVP will be validated internally by Algarve Home Stay as an acquisition and conversion tool. In the medium term it becomes a multi-tenant Lodgra module for professional managers operating portfolios of 20 to 300 properties and may later connect to the PMS or external systems.

## 1. Context and Problem

### 1.1 Manager problem

- Owner leads arrive with little data and no operating history.
- The analysis is currently manual, slow and dependent on individual experience.
- Comparing short stay, medium stay and long-term rental requires different sources and assumptions.
- Commercial projections often do not separate gross revenue, costs, management commission and owner net return.
- Without sources, ranges and confidence, the owner may interpret estimates as guarantees.

### 1.2 Opportunity

Deliver value before requesting a long form from the lead: a grounded analysis that demonstrates local knowledge, reveals property potential and naturally drives the next step toward meeting, technical visit and management proposal.

### 1.3 Job To Be Done

When I receive a lead or evaluate a property, I want to input the available data and obtain a reliable, explainable and presentable projection, so I can decide the exploitation strategy and convert the owner faster.

## 2. Vision, Value Proposition and Principles

### 2.1 Product vision

Be the intelligence layer that transforms scattered market signals and operational data into profitability decisions, recommended actions and accountability for managers and owners.

### 2.2 Value proposition

- From partial data to a commercial analysis in minutes, not days.
- Three exploitation models compared with the same financial structure.
- Agents research, formulas calculate, humans approve.
- Every number shows origin, assumption, range and confidence level.
- The result feeds the commercial funnel and, later, the owner portal.

### 2.3 Principles

| Principle | Application |
| --- | --- |
| Research before asking | The system looks up public data before requesting additional input. |
| Financial determinism | LLMs do not calculate the final result; a versioned engine applies formulas. |
| Traceable evidence | Comparables, links, dates and assumptions stay attached to the analysis. |
| Ranges, not false certainty | Results are scenarios, not guarantees. |
| Human supervision | No external report is published without review and approval. |
| Multi-tenancy from the base | Data, sources and reports are isolated by organization and property. |

## 3. Objectives and Metrics

### 3.1 MVP objectives

- Receive a minimal or complete property input.
- Research and select relevant comparables.
- Project revenues and net results for short, medium and long stay.
- Generate conservative, base and optimized scenarios.
- Allow editing of assumptions and immediate recalculation.
- Produce a proposal report in PDF/DOCX and an internal summary.
- Record execution, sources, versions, human interventions and approval.

### 3.2 Success metrics

| Metric | Pilot target |
| --- | --- |
| Time to first analysis | <= 15 minutes after valid input |
| Human review time | <= 10 minutes per analysis |
| Reproducible calculations | 100% of financial outputs |
| Values with origin/assumption | 100% of key values |
| Reports approved without structural rework | >= 80% |
| Leads accepting a meeting after analysis | measure baseline and improve progressively |
| Reconciliation error | 0 in approved reports |

## 4. Users and Use Cases

### Personas

- Commercial manager AHS
- Revenue manager
- Operations manager
- Organization administrator
- Owner

### Priority use cases

- Property never exploited and with little data.
- Property already in AL, with imported or provided history.
- Property under construction or nearing delivery.
- Annual reassessment of a property under management.
- Comparison between current and optimized strategy.

## 5. MVP Scope

### 5.1 Included

- Analysis creation and editing per organization.
- Manual input, free text and links; automatic extraction into structured fields.
- Assisted web research and source logging.
- Short and long stay comparables.
- Monthly AL projections and annual medium/long stay projections.
- Costs, management commission and owner net return.
- Conservative, base and optimized scenarios.
- Confidence score and fields to confirm.
- Human review and report publication.
- Version history and audit trail.

### 5.2 Out of MVP

- Guaranteed income.
- Formal credit or tax assessment.
- Automatic purchase of paid data without contract/license.
- Automatic price updates on channels.
- Automatic sending to the owner without approval.
- Legal decision on AL eligibility or licensing.
- Prediction based only on listed prices treated as actual occupancy.

## 6. User Experience

### 6.1 Main flow

1. Create analysis and associate lead/owner and property.
2. Paste the lead message or fill in known data.
3. The Intake Agent extracts fields and identifies critical gaps.
4. The system asks only real blockers, preferably one question at a time.
5. Agents research location, demand, comparables and costs.
6. The financial engine calculates all scenarios.
7. The Audit Agent validates coherence, source coverage and rules.
8. The manager reviews assumptions, edits values and recalculates.
9. The manager approves and generates the report with AHS/Lodgra identity.
10. The analysis remains in history and can advance in the commercial funnel.

### 6.2 Analysis states

| State | Definition |
| --- | --- |
| draft | Input started, not executed yet. |
| needs_input | A blocker exists that cannot be researched/inferred. |
| researching | Agents collect and normalize evidence. |
| calculating | Financial engine executes scenarios. |
| needs_review | Result available for human review. |
| approved | Assumptions and report approved. |
| published | External artifact generated/shared. |
| failed | Execution interrupted with traceable error. |
| superseded | Replaced by a newer analysis. |

## 7. Input Data

### 7.1 Minimal input

| Field | Requirement | Note |
| --- | --- | --- |
| Location | Critical | Address, building, pin or sufficiently specific zone. |
| Typology | Critical | T0, T1, T2, house, etc. |
| Bedrooms/beds | Recommended | Can be extracted from free text. |
| Goal | Recommended | Maximize revenue, stability or hybrid use. |
| Availability | Recommended | Year-round, seasonal or blocked dates. |
| AL license | Optional | State: yes, no, unknown. |
| Photos/link | Optional | Improves positioning and comparability. |

### 7.2 Enriched input

- Area, bathrooms, floor, elevator, parking, pool, balcony, view, AC and accessibility.
- Condition, furniture, renovation and maximum capacity.
- Reservation history, revenue, ADR, occupancy, ratings and channels.
- Condominium, IMI, insurance, utilities, maintenance, cleaning and laundry.
- Property value and planned investment improvements.

### 7.3 Provenance

| Type | Example | Treatment |
| --- | --- | --- |
| provided | User/owner input | Highest priority; may require documentary confirmation. |
| observed | Public source | Store source, date and excerpt. |
| derived | Calculated from data | Store formula and inputs. |
| estimated | Assumed due to missing data | Display range and confidence. |
| overridden | Changed by reviewer | Store author, reason and previous value. |

## 8. Agent Architecture

### 8.1 Orchestration pattern

An Orchestrator Agent owns the workflow and uses specialist agents as bounded tools. Specialists never publish the report directly. Shared state is structured and versioned; free text does not replace data contracts.

| Agent | Responsibility | Structured output |
| --- | --- | --- |
| Intake | Extract data and gaps | PropertyInput + blockers |
| Location | Microlocation, demand and seasonality | LocationAnalysis |
| Comparables | Discover, filter and score comps | ComparableSet |
| Short Stay | ADR and monthly occupancy assumptions | ShortStayAssumptions |
| Mid Stay | Mid-term rent and occupancy | MidStayAssumptions |
| Long Stay | Rent and traditional vacancy | LongStayAssumptions |
| Cost | Fixed and variable costs | CostModel |
| Strategy | Model and recommended improvements | StrategyRecommendation |
| Audit | Coherence, sources and conflicts | AuditResult |
| Report | Narrative based only on approved data | ReportContent |

### 8.2 Agent rules

- Never invent source, price, occupancy rate or property characteristic.
- Distinguish listing price from observed transaction/revenue.
- Return null/unknown when evidence is insufficient.
- Surface conflicts between sources instead of silently choosing.
- Do not calculate financial outputs outside the authorized engine.
- Do not alter provided data without creating a version or override.
- Limit tools and data to the tenant and the current analysis.

## 9. Financial Engine

- Financial calculation must be deterministic and versioned.
- LLMs may research, interpret and write the narrative.
- The financial engine must calculate short, medium and long stay projections.
- Scenario outputs: conservative, base and optimized.
- Each result must show gross revenue, estimated costs, commission and owner net return.

## 10. External Publication and Governance

- No external report is published without human approval.
- The analysis must be editable before approval.
- All versions, sources and overrides must be auditable.
- The module must be multi-tenant from day one.

## 11. Not In MVP

- Dashboard as the first entrypoint.
- Sophisticated form as the only input path.
- Full PDF automation pipeline.
- Complete multi-agent automation on day one.
- Automatic public scraping without governance.
- Direct publication to the owner.
- Automatic changes to operational property records.

## 12. Open Questions

- Exact sources to use for comparables per geography.
- Whether the first release stays CLI-first or introduces a minimal internal UI.
- What persistence model is needed for the first pilot.
- Which external APIs, if any, are necessary for research and pricing enrichment.

## 13. Decision

This PRD defines Lodgra Property Intelligence as the first AI-native module of Lodgra, validated first with Algarve Home Stay, built on deterministic finance and human-approved publication.

