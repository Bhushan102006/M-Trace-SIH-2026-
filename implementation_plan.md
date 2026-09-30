# Implementation Plan: MPLADS IntelliTrack (M-TRACE)

Build and transform the existing prototype into the complete, government-grade **MPLADS IntelliTrack (M-TRACE)** platform as specified in the SIH26102 problem statement and the solution blueprint documents in `solution expectation/`.

---

## Executive Summary & Solution Alignment

Based on an exhaustive review of all 7 specification PDFs in `solution expectation`:
1. **`mplads_problem_statement.pdf`**: Official SIH26102 problem framework by MoSPI / DIID.
2. **`mplads_intellitrack_specification.pdf`**: Complete 13-page system specification outlining 100+ services, 6 roles, and the 12-word operational lifecycle (`Recommend → Scrutinize → Sanction → Execute → Collect → Validate → Analyze → Detect → Predict → Alert → Verify → Improve`).
3. **`MPLADS_IntelliTrack_Blueprint.pdf` & `mplads_intellitrack_solution_blueprint.pdf`**: 10 Core System Pillars, 4-Layer data separation architecture, and SIH prototype scope.
4. **`MPLADS_IntelliTrack_SIH26102_Alignment_Report.pdf`**: 94% alignment breakdown, 6-role hierarchy, and 0–100 risk scoring matrix.
5. **`m_trace_report.pdf`**: M-TRACE project report detailing the 17-stage workflow, Explainable AI framework (WHY, WHAT, HOW SERIOUS, WHAT NEXT), and the water tank end-to-end case study.
6. **`MPLADS_IntelliTrack_Service_Architecture.pdf`**: 6 Pillars & 22 Core Services lifecycle chain.

### Core Architectural Principle
> [!IMPORTANT]
> **"Anomaly ≠ Fraud" (Governance Imperative)**
> The platform does **not** replace the statutory MPLADS administrative machinery, nor does it automatically label people or contractors as "fraudulent". 
> It operates on the strict pipeline:
> $$\text{AI detects} \longrightarrow \text{Evidence supports} \longrightarrow \text{Authority verifies} \longrightarrow \text{Governance acts}$$

---

## Current State vs. Target State Analysis

| Capability Area | Current `mplads-sentinel` Prototype | Target State (**MPLADS IntelliTrack / M-TRACE**) |
| :--- | :--- | :--- |
| **System Branding & Terminology** | "MPLADS Sentinel" (Generic fraud terms) | **MPLADS IntelliTrack / M-TRACE** (MoSPI DIID compliant, GovTech grade, risk & anomaly terminology) |
| **Data Separation** | Flat DataFrame with combined inputs & flags | **4-Layer Data Architecture**: Layer A (Source Data), Layer B (Derived Data), Layer C (AI Inference), Layer D (Human Decision) |
| **Project ID Schema** | Auto-increment numeric ID | Standardized Gov ID: `MPLADS-{State}-{Dist}-{Year}-{Seq}` (e.g. `MPLADS-MH-AMR-2026-00452`) |
| **Access Control (RBAC)** | Single dashboard for all users | **6-Tier Jurisdiction Hierarchy**: MoSPI (National), State Nodal, District Authority (Primary Operational), MP / Constituency, Implementing Agency, Contractor |
| **AI Anomaly Detection** | IsolationForest + basic clustering | **5 Domain-Specific Detection Engines**: <br>1. Comparable Cost Benchmarking<br>2. Progress-Expenditure Divergence ($Exp_{high} \text{ vs } Prog_{low}$)<br>3. Semantic NLP + Geospatial Duplicate Work Detection<br>4. GPS Geofence & Evidence Verification<br>5. Invoice & Material Rate Outlier Analysis |
| **Predictive Analytics** | Static delay threshold | Delay probability % & Cost-overrun risk trajectories |
| **Explainable AI (XAI)** | Generic flags | Structured 4-Part Explanation: **WHY** flagged, **WHAT** data caused it, **HOW SERIOUS** (0–100 score), **WHAT NEXT** (Recommended action) |
| **Case Management & Verification** | No verification workflow | 10-Stage Human Verification Lifecycle: Alert → Case → Review → Evidence Request → Field Inspection → Finding Recorded → Resolution / Corrective Action |
| **Audit Trail** | None | Immutable Audit Log tracking `Who → Did what → When → Which project → What changed → Why` |

---

## User Review & Clarifications Required

> [!IMPORTANT]
> **Open Questions for Confirmation:**
> 1. **Data Source Preference**: Would you like the system to continue using enhanced realistic synthetic data generation seeded by the real Parliament data files (`Allocated Limit for Honble MPs.csv` and `RS-Session-251-AU3002-Annexure-I.csv`), or do you plan to connect a real PostgreSQL/PostGIS database? *(Recommended: Enhanced realistic in-memory/SQLite/JSON store with full persistence during demo, matching the exact format from the MoSPI CSVs).*
> 2. **Primary Demo Scenario**: The blueprints specifically highlight the **"Community Water Tank in Village X"** scenario (Sanctioned ₹50L, Expenditure ₹37L, Physical 48%, Financial 74%, GPS mismatch, invoice rate anomaly, Risk Score 84/100). Should we ensure this exact walkthrough scenario is featured front-and-center in the interactive demo?
> 3. **Role Switching in Frontend**: Should the frontend UI provide a seamless **"Role Switcher" toolbar** at the top allowing the evaluators/judges to instantly switch perspectives between MoSPI (National), State, District Collector, MP, Implementing Agency, and Contractor?

---

## Proposed Technical Implementation

### Phase 1: Backend Architecture & Data Engine Upgrade

#### [MODIFY] [data_engine.py](file:///d:/MPLANDS/mplads-sentinel/backend/data_engine.py)
- Incorporate the official `Allocated Limit for Honble MPs.csv` and `RS-Session-251-AU3002-Annexure-I.csv` data to anchor real MP names, state quotas, and sanctioned limits.
- Update Project ID format to `MPLADS-{STATE}-{DIST}-{YEAR}-{SEQ}`.
- Model the **4-Layer Data Structure**:
  - **Source Data**: Project specifications, MP recommendation, sanction amount, contractor details, progress updates, geotagged photos (latitude, longitude, timestamp), uploaded invoices with itemized rates (cement, steel, labour, excavation).
  - **Derived Data**: Physical progress %, financial expenditure %, cost deviation %, distance between photo GPS and registered project location.
  - **AI Inference Data**: Risk scores (0–100), anomaly categories, delay probabilities, duplicate similarity matches.
  - **Human Decision Data**: Case status, verification officer notes, requested evidence, resolution findings.
- Generate specialized benchmark datasets for civil works (roads, water supply, community halls, school classrooms, solar lighting) to enable realistic cost comparisons.

#### [MODIFY] [ai_sentinel.py](file:///d:/MPLANDS/mplads-sentinel/backend/ai_sentinel.py)
- Rebrand and upgrade into `M-TRACE Intelligence Engine`:
  1. **Cost Benchmarking Engine**: Compares estimated/actual unit costs against comparable peer projects within the same state/district and category.
  2. **Progress-Expenditure Divergence Scorer**: Detects disproportionate drawdowns (e.g. 75%+ expenditure with <45% physical completion).
  3. **NLP & Geospatial Duplicate Detector**: Combines description embedding cosine similarity with haversine distance (<500m) to identify duplicate or overlapping works.
  4. **Geo-tagging & Evidence Verification**: Flags submissions exceeding geofence tolerance (>150m) and timestamp discrepancies.
  5. **Predictive Delay & Cost Overrun Engine**: Computes delay risk probability based on milestone pacing and elapsed time.
  6. **Unified Risk Scoring (0–100)**: Categorized into `Normal (0-25)`, `Watch (26-50)`, `Review Required (51-75)`, and `High Risk (76-100)`.
  7. **Explainable AI (XAI) Generator**: Synthesizes the 4-part explanation (`why_flagged`, `contributing_factors`, `risk_severity`, `recommended_action`).

#### [MODIFY] [main.py](file:///d:/MPLANDS/mplads-sentinel/backend/main.py)
- Add endpoints supporting the 10 Pillars:
  - `GET /api/projects/{project_id}/health-card`: Comprehensive Project Health Card with 4-layer breakdown.
  - `GET /api/benchmarks/cost`: Regional cost benchmarking comparison for peer works.
  - `POST /api/cases`: Create/update a verification case (Human-in-the-loop workflow).
  - `GET /api/cases`: List active verification cases by district/state.
  - `POST /api/cases/{case_id}/action`: Record administrative finding (Field inspection, additional evidence requested, resolved/legitimate, corrective action).
  - `GET /api/audit-trail`: Fetch immutable audit logs for any project or system-wide action.
  - `GET /api/roles/me`: Return current active role context and jurisdictional filtering.
  - `POST /api/evidence/verify`: Validate in-app photo coordinates against project geofence.

---

### Phase 2: Frontend Rebranding & Multi-Role Experience

#### [MODIFY] [App.jsx](file:///d:/MPLANDS/mplads-sentinel/frontend/src/App.jsx)
- Update platform identity to **MPLADS IntelliTrack (M-TRACE)** with the official subtitle *"AI-Powered Monitoring, Anomaly Detection & Decision-Support Platform for MoSPI"*.
- Add an interactive **Role & Jurisdiction Switcher**:
  - `MoSPI Official (National View)`
  - `State Nodal Authority (State View)`
  - `District Authority / DM (Operational & Verification View)`
  - `Member of Parliament (Constituency View)`
  - `Implementing Agency (Project Execution View)`
  - `Contractor (Restricted Evidence Submission View)`
- Seamless navigation between National Overview, GIS Map, Project Health Cards, Anomaly & Risk Center, Case Management, and Audit Trail.

#### [MODIFY] [Dashboard.jsx](file:///d:/MPLANDS/mplads-sentinel/frontend/src/pages/Dashboard.jsx)
- Adapt dashboard metrics dynamically based on active role (National aggregations for MoSPI, District-level queue for District Collector, MP constituency overview for MP).
- Display the **Risk Scoring Matrix (0–100)** with standard color tiers: Green (Normal), Yellow (Watch), Orange (Review Required), Red (High Risk).
- Feature quick-action cards for pending human verification cases.

#### [NEW] `ProjectHealthCardModal.jsx` / `ProjectHealthCard.jsx`
- Implement the official **Project Health Card** component specified in Section 8 of the blueprint:
  - Project Details & ID (`MPLADS-MH-AMR-2026-00452`)
  - Sanction vs Expenditure vs Physical Progress gauge
  - Timeline & Delay Probability indicator
  - 4-Layer data tab view (Source Data, Derived Calculations, AI Inference, Official Action)
  - Explainable AI summary card (`Why Flagged?`, `Key Factors`, `Recommended Verification Steps`)
  - Direct action button: *"Initiate Human Verification Case / Field Inspection"*

#### [NEW] `CaseManagement.jsx` (Pillar 8 & 10)
- Dedicated workflow page for District Authorities and Inspecting Officers:
  - Track cases through stages: `Alert Generated → Case Opened → Evidence Requested → Field Inspection → Finding Recorded → Resolved / Corrective Action`.
  - Officer notes entry, photographic proof review, and decision logging.
  - Visual distinction between "Confirmed Concern" and "Legitimate Operational Deviation".

#### [NEW] `AuditTrailPage.jsx` (Pillar 9)
- Immutable, searchable audit timeline displaying all actions:
  - `[Timestamp] | [User & Role] | [Action] | [Project ID] | [Delta / Change] | [Reason]`

#### [MODIFY] [GeoMap.jsx](file:///d:/MPLANDS/mplads-sentinel/frontend/src/pages/GeoMap.jsx)
- Upgrade GIS mapping with project clustering, geofence radius rings, evidence photo pinpoints showing location mismatch distance, and risk severity markers.

#### [MODIFY] [AnomaliesPage.jsx](file:///d:/MPLANDS/mplads-sentinel/frontend/src/pages/AnomaliesPage.jsx)
- Refactor anomaly categories to match the 5 Core Anomaly Types from the specification:
  1. Cost Anomaly (Peer Deviation)
  2. Expenditure vs Physical Progress Divergence
  3. Delay & Stalling Prediction
  4. Duplicate / Overlapping Project
  5. Invoice / Rate Discrepancy & GPS Mismatch

---

## Verification & Testing Plan

### Automated Verification
- Run Python unit & smoke tests to verify:
  - 4-Layer data integrity and schema validation.
  - All 5 anomaly detection modules executing without errors.
  - Risk score calculation falling accurately in the 0–100 scale.
  - Role-based filtering correctly limiting data by state, district, or constituency.
  - Verification case lifecycle transitions and audit trail append operations.

### End-to-End Walkthrough Verification
- Verify the featured **"Community Water Tank"** scenario:
  - Inspect project `MPLADS-MH-AMR-2026-00452` in District view.
  - Observe High Risk score (78–84/100) with XAI breakdown.
  - Submit an evidence verification request and simulate an officer inspection finding.
  - Check that the action is recorded immutably in the Audit Trail.
- Verify role switching across MoSPI, State, District, MP, and Contractor.
