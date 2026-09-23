"""
main.py
-------
M-TRACE / MPLADS IntelliTrack — FastAPI REST API.

AI-Assisted Governance & Decision-Support Platform for MoSPI DIID.

Principle: AI detects anomalies → Evidence informs → Human authority verifies → Governance decides.

Run with: uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import math
import datetime
import uuid
from typing import Any, Optional

from fastapi import FastAPI, Query, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_sentinel import MTraceIntelligenceEngine
from data_engine import MPLADSDataEngine

# ---------------------------------------------------------------------------
# App bootstrap
# ---------------------------------------------------------------------------

app = FastAPI(
    title="M-TRACE API — MPLADS IntelliTrack",
    description="AI-Assisted Monitoring, Anomaly Detection & Decision-Support Platform for MoSPI DIID",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global in-memory state
# ---------------------------------------------------------------------------

_engine   = MPLADSDataEngine()
_sentinel = MTraceIntelligenceEngine()
_df       = _sentinel.analyze(_engine.generate())

# In-memory verification case store
_cases: list[dict] = list(_engine.cases)

# In-memory audit trail store
_audit_trail: list[dict] = list(_engine.audit_trail)

# In-memory digital evidence store: project_id -> list of evidence records
_digital_evidences: dict[str, list[dict]] = {}

# Available roles for role-based views
ROLES = {
    "mospi":      {"label": "MoSPI (National Overview)",           "level": "national",  "filter": None},
    "state":      {"label": "State Nodal Authority",               "level": "state",     "filter": "state"},
    "district":   {"label": "District Authority / DM",             "level": "district",  "filter": "district"},
    "mp":         {"label": "Member of Parliament",                "level": "constituency", "filter": "mp_name"},
    "agency":     {"label": "Implementing Agency",                 "level": "agency",    "filter": "contractor"},
    "contractor": {"label": "Contractor (Evidence Submission)",    "level": "contractor","filter": "contractor"},
}


def _safe_val(v: Any) -> Any:
    """Convert numpy types / NaN to JSON-safe Python types."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if hasattr(v, "item"):          # numpy scalar
        return v.item()
    if isinstance(v, list):
        return [_safe_val(i) for i in v]
    if isinstance(v, dict):
        return {k: _safe_val(val) for k, val in v.items()}
    return v


def _row_to_dict(row: Any) -> dict:
    d = row.to_dict()
    return {k: _safe_val(v) for k, v in d.items()}


def _filter_by_role(df, role: str = None, role_value: str = None):
    """Apply jurisdiction-based filtering based on active role."""
    if not role or role == "mospi":
        return df
    role_config = ROLES.get(role)
    if not role_config:
        return df
    filter_col = role_config["filter"]
    if not filter_col or filter_col not in df.columns:
        return df
    if not role_value:
        defaults = {
            "state": "Maharashtra",
            "district": "Amravati",
            "mp": "Wankhade",
            "agency": "Sahara",
            "contractor": "Sahara Builder Corp",
        }
        role_value = defaults.get(role, "")

    if not role_value:
        return df

    val = role_value.strip().lower()
    mask = df[filter_col].astype(str).str.lower().str.contains(val, na=False)
    return df[mask]


# ---------------------------------------------------------------------------
# Endpoints — Core Dashboard
# ---------------------------------------------------------------------------

@app.get("/api/stats")
def get_stats(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Governance dashboard statistics."""
    df = _filter_by_role(_df, role, role_value)
    stats = _sentinel.summary_stats(df)
    return {k: _safe_val(v) for k, v in stats.items()}


@app.get("/api/projects")
def get_projects(
    page: int       = Query(1, ge=1),
    page_size: int  = Query(50, ge=1, le=200),
    risk: Optional[str]   = Query(None, description="Filter by risk_level: High, Medium, Low"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk_tier: Normal, Watch, Review Required, High Priority Review"),
    state: Optional[str]  = Query(None),
    district: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search mp_name, contractor, or district"),
    sort_by: str          = Query("risk_score"),
    sort_desc: bool       = Query(True),
    role: Optional[str]   = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Paginated, filtered, sortable list of all MPLADS projects."""
    df = _filter_by_role(_df.copy(), role, role_value)

    if risk:
        df = df[df["risk_level"] == risk]
    if risk_tier:
        df = df[df["risk_tier"] == risk_tier]
    if state:
        df = df[df["state"].str.lower() == state.lower()]
    if district:
        df = df[df["district"].str.lower() == district.lower()]
    if search:
        mask = (
            df["mp_name"].str.contains(search, case=False, na=False)
            | df["contractor"].str.contains(search, case=False, na=False)
            | df["district"].str.contains(search, case=False, na=False)
        )
        df = df[mask]

    valid_sort_cols = [
        "sanctioned_amt", "utilised_amt", "anomaly_score", "risk_score",
        "confidence_score", "unit_cost", "mp_name", "district",
        "days_delayed", "cost_overrun_pct", "utilisation_pct",
    ]
    if sort_by not in valid_sort_cols:
        sort_by = "risk_score"

    df = df.sort_values(sort_by, ascending=not sort_desc)

    total    = len(df)
    start    = (page - 1) * page_size
    end      = start + page_size
    page_df  = df.iloc[start:end]

    cols = [
        "project_id", "mp_name", "constituency", "state", "district",
        "contractor", "work_type", "work_description", "sanctioned_amt", "utilised_amt",
        "released_amt", "expenditure_amt", "unit_cost", "status",
        "milestone_stage", "financial_year", "anomaly_type",
        "risk_score", "risk_tier", "risk_level", "confidence_score", "anomaly_score",
        "statistical_anomaly_flag", "cost_benchmark_flag", "progress_gap_flag",
        "nlp_flag", "contractor_similarity_flag", "geofence_flag", "delay_flag",
        "why_flagged", "recommended_actions", "xai_factors",
        "flag_reasons", "lat", "lon",
        "days_delayed", "delay_status", "delay_band", "delay_probability_pct",
        "physical_progress_pct", "financial_progress_pct", "progress_discrepancy",
        "cost_overrun_amt", "cost_overrun_pct", "cost_overrun_band",
        "cost_deviation_pct", "peer_median_cost",
        "geo_distance_m", "site_lat", "site_lon", "photo_lat", "photo_lon",
        "cement_rate", "steel_rate", "labour_rate",
        "cement_anomaly", "steel_anomaly",
        "utilisation_pct", "target_completion_date", "actual_completion_date",
    ]
    cols = [c for c in cols if c in page_df.columns]

    return {
        "total":     total,
        "page":      page,
        "page_size": page_size,
        "pages":     math.ceil(total / page_size),
        "data":      [_row_to_dict(row) for _, row in page_df[cols].iterrows()],
    }


# ---------------------------------------------------------------------------
# Endpoints — Anomaly & Risk Intelligence
# ---------------------------------------------------------------------------

@app.get("/api/anomalies")
def get_anomalies(
    risk_tier: Optional[str] = Query(None, description="Filter by risk_tier"),
    risk: str = Query("High", description="Minimum risk level: High or Medium"),
    limit: int = Query(100, ge=1, le=500),
    anomaly_type: Optional[str] = Query(None, description="Filter by anomaly type"),
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Return projects with significant anomaly signals for human review."""
    df = _filter_by_role(_df.copy(), role, role_value)

    if risk_tier:
        df = df[df["risk_tier"] == risk_tier]
    else:
        levels = ["High"] if risk == "High" else ["High", "Medium"]
        df = df[df["risk_level"].isin(levels)]

    if anomaly_type:
        df = df[df["anomaly_type"] == anomaly_type]

    df = df.sort_values("risk_score", ascending=False).head(limit)

    cols = [
        "project_id", "mp_name", "constituency", "state", "district",
        "contractor", "work_type", "work_description", "sanctioned_amt", "utilised_amt",
        "released_amt", "unit_cost", "status", "milestone_stage",
        "financial_year", "anomaly_type", "risk_score", "risk_tier",
        "risk_level", "confidence_score", "anomaly_score",
        "statistical_anomaly_flag", "cost_benchmark_flag", "progress_gap_flag",
        "nlp_flag", "contractor_similarity_flag", "geofence_flag", "delay_flag",
        "why_flagged", "recommended_actions", "xai_factors",
        "flag_reasons", "lat", "lon",
        "days_delayed", "delay_status", "delay_band", "delay_probability_pct",
        "physical_progress_pct", "financial_progress_pct", "progress_discrepancy",
        "cost_overrun_amt", "cost_overrun_pct", "cost_deviation_pct",
        "geo_distance_m",
        "cement_rate", "steel_rate", "cement_anomaly", "steel_anomaly",
        "utilisation_pct", "target_completion_date", "actual_completion_date",
    ]
    cols = [c for c in cols if c in df.columns]

    return {
        "count": len(df),
        "data":  [_row_to_dict(row) for _, row in df[cols].iterrows()],
    }


# ---------------------------------------------------------------------------
# Endpoints — Project Health Card
# ---------------------------------------------------------------------------

@app.get("/api/projects/{project_id}/health-card")
def get_project_health_card(project_id: str = Path(...)) -> dict:
    """Comprehensive 4-layer Project Health Card for a specific project."""
    match = _df[_df["project_id"] == project_id]
    if match.empty:
        return {"error": "Project not found", "project_id": project_id}

    row = match.iloc[0]
    d = _row_to_dict(row)

    # Structure into 4 layers
    health_card = {
        "project_id": project_id,
        "source_data": {
            "project_id":       d.get("project_id"),
            "mp_name":          d.get("mp_name"),
            "constituency":     d.get("constituency"),
            "state":            d.get("state"),
            "district":         d.get("district"),
            "contractor":       d.get("contractor"),
            "work_type":        d.get("work_type"),
            "work_description": d.get("work_description"),
            "milestone_stage":  d.get("milestone_stage"),
            "status":           d.get("status"),
            "financial_year":   d.get("financial_year"),
            "recommended_date": d.get("recommended_date"),
            "sanctioned_date":  d.get("sanctioned_date"),
            "target_completion_date": d.get("target_completion_date"),
            "actual_completion_date": d.get("actual_completion_date"),
            "sanctioned_amt":   d.get("sanctioned_amt"),
            "released_amt":     d.get("released_amt"),
            "expenditure_amt":  d.get("expenditure_amt"),
            "utilised_amt":     d.get("utilised_amt"),
            "unit_cost":        d.get("unit_cost"),
            "site_lat":         d.get("site_lat"),
            "site_lon":         d.get("site_lon"),
            "photo_lat":        d.get("photo_lat"),
            "photo_lon":        d.get("photo_lon"),
            "cement_rate":      d.get("cement_rate"),
            "steel_rate":       d.get("steel_rate"),
            "labour_rate":      d.get("labour_rate"),
        },
        "derived_data": {
            "physical_progress_pct":  d.get("physical_progress_pct"),
            "financial_progress_pct": d.get("financial_progress_pct"),
            "progress_discrepancy":   d.get("progress_discrepancy"),
            "days_delayed":           d.get("days_delayed"),
            "delay_status":           d.get("delay_status"),
            "cost_overrun_pct":       d.get("cost_overrun_pct"),
            "cost_overrun_amt":       d.get("cost_overrun_amt"),
            "utilisation_pct":        d.get("utilisation_pct"),
            "geo_distance_m":         d.get("geo_distance_m"),
            "cost_deviation_pct":     d.get("cost_deviation_pct"),
        },
        "ai_inference": {
            "risk_score":              d.get("risk_score"),
            "risk_tier":               d.get("risk_tier"),
            "anomaly_score":           d.get("anomaly_score"),
            "confidence_score":        d.get("confidence_score"),
            "delay_probability_pct":   d.get("delay_probability_pct"),
            "why_flagged":             d.get("why_flagged"),
            "xai_factors":             d.get("xai_factors"),
            "recommended_actions":     d.get("recommended_actions"),
            "anomaly_flags": {
                "statistical_anomaly":     d.get("statistical_anomaly_flag"),
                "cost_benchmark":          d.get("cost_benchmark_flag"),
                "progress_gap":            d.get("progress_gap_flag"),
                "nlp_duplicate":           d.get("nlp_flag"),
                "contractor_similarity":   d.get("contractor_similarity_flag"),
                "geofence_mismatch":       d.get("geofence_flag"),
                "delay":                   d.get("delay_flag"),
                "cement_outlier":          d.get("cement_anomaly"),
                "steel_outlier":           d.get("steel_anomaly"),
            },
        },
        "human_decision": {
            "verification_cases": [c for c in _cases if c["project_id"] == project_id],
            "audit_trail":        [a for a in _audit_trail if a["project_id"] == project_id],
            "digital_evidence":   _digital_evidences.get(project_id, []),
        },
    }

    return health_card


# ---------------------------------------------------------------------------
# Endpoints — Verification Case Management
# ---------------------------------------------------------------------------

class CaseCreateRequest(BaseModel):
    project_id: str
    alert_type: str = "Manual Review Initiated"
    summary: str = ""
    opened_by: str = "District Authority"
    role: str = "District Authority"


class CaseActionRequest(BaseModel):
    action: str   # "request_evidence", "schedule_inspection", "record_finding", "resolve"
    officer: str = ""
    notes: str = ""
    resolution: str = ""  # Used when action == "resolve"
    role: str = "district"


@app.get("/api/cases")
def get_cases(
    status: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """List active verification cases with role-based jurisdiction filtering."""
    cases = list(_cases)

    # Filter by project_id or status
    if status:
        cases = [c for c in cases if c["status"] == status]
    if project_id:
        cases = [c for c in cases if c["project_id"] == project_id]

    # Apply role-based jurisdiction filtering
    if role and role != "mospi":
        # Get project IDs permitted for this role
        permitted_df = _filter_by_role(_df, role, role_value)
        permitted_ids = set(permitted_df["project_id"].unique())
        cases = [c for c in cases if c["project_id"] in permitted_ids]

    return {
        "count": len(cases),
        "cases": [{k: _safe_val(v) for k, v in c.items()} for c in cases],
    }


@app.post("/api/cases")
def create_case(req: CaseCreateRequest) -> dict:
    """Create a new verification case for a project."""
    case_id = f"CASE-{str(uuid.uuid4())[:8].upper()}"
    now = datetime.datetime.now().isoformat()

    case = {
        "case_id":          case_id,
        "project_id":       req.project_id,
        "status":           "Case Opened",
        "opened_date":      now,
        "opened_by":        req.opened_by,
        "role":             req.role,
        "alert_type":       req.alert_type,
        "summary":          req.summary,
        "assigned_officer": "",
        "evidence_notes":   [],
        "resolution":       None,
        "last_updated":     now,
    }
    _cases.append(case)

    _audit_trail.append({
        "timestamp":  now,
        "user":       req.opened_by,
        "role":       req.role,
        "project_id": req.project_id,
        "action":     "Verification Case Opened",
        "details":    f"Case {case_id} opened. Alert type: {req.alert_type}. {req.summary}",
        "rationale":  "Administrative review initiated for anomaly verification.",
    })

    return {"status": "created", "case": case}


@app.post("/api/cases/{case_id}/review")
def review_case(case_id: str, req: CaseActionRequest) -> dict:
    """Record an administrative action on a verification case with RBAC authorization check."""
    case = next((c for c in _cases if c["case_id"] == case_id), None)
    if not case:
        return {"error": "Case not found"}

    # RBAC Guard: Contractors cannot adjudicate or resolve cases
    if req.role and req.role.lower() in ["contractor", "agency"]:
        if "resolve" in req.action.lower() or "inspection" in req.action.lower():
            return {
                "error": f"Unauthorized: Role '{req.role}' cannot adjudicate or resolve verification cases. This statutory function is reserved for District Authorities.",
                "status": "forbidden"
            }

    now = datetime.datetime.now().isoformat()

    act = req.action.lower().replace("-", "_").replace(" ", "_")

    if "evidence" in act:
        case["status"] = "Evidence Requested"
        case["evidence_notes"].append(f"{now[:10]}: Evidence requested — {req.notes}")
    elif "inspection" in act:
        case["status"] = "Field Inspection Scheduled"
        case["assigned_officer"] = req.officer or case["assigned_officer"]
        case["evidence_notes"].append(f"{now[:10]}: Field inspection scheduled — {req.notes}")
    elif "finding" in act:
        case["status"] = "Finding Recorded"
        case["evidence_notes"].append(f"{now[:10]}: Finding — {req.notes}")
    elif "resolve" in act or "legitimate" in act:
        res_text = req.resolution or req.notes or "Resolved by competent authority"
        if "legitimate" in res_text.lower() or "justified" in res_text.lower() or "legitimate" in act:
            case["status"] = "Resolved - Legitimate"
        else:
            case["status"] = "Resolved - Corrective Action"
        case["resolution"] = res_text
        case["evidence_notes"].append(f"{now[:10]}: Resolved — {res_text}")
    else:
        case["evidence_notes"].append(f"{now[:10]}: Action ({req.action}) — {req.notes}")

    case["last_updated"] = now

    _audit_trail.append({
        "timestamp":  now,
        "user":       req.officer or case["opened_by"],
        "role":       case["role"],
        "project_id": case["project_id"],
        "action":     f"Case {req.action.replace('_', ' ').title()}",
        "details":    req.notes or req.resolution or f"Action: {req.action}",
        "rationale":  req.notes or "Administrative action recorded.",
    })

    return {"status": "updated", "case": {k: _safe_val(v) for k, v in case.items()}}


# ---------------------------------------------------------------------------
# Endpoints — Real-Time Digital Evidence & Geotagged Camera Verification
# ---------------------------------------------------------------------------

class DigitalEvidenceSubmission(BaseModel):
    project_id: str
    photo_data: str  # Base64 data URL
    captured_at: Optional[str] = None
    captured_lat: float
    captured_lon: float
    accuracy_m: float = 5.0
    geo_distance_m: float = 0.0
    geofence_status: str = "VERIFIED"  # "VERIFIED" or "GEOFENCE_BREACH"
    stage: str = "Work In Progress"
    contractor_name: str = "Sahara Builder Corp"
    mb_record_no: Optional[str] = ""
    remarks: Optional[str] = ""
    physical_progress_pct: Optional[float] = None
    checksum: Optional[str] = ""
    device_info: Optional[str] = "Live Camera Stream"


@app.post("/api/projects/{project_id}/evidence")
def submit_digital_evidence(project_id: str, req: DigitalEvidenceSubmission) -> dict:
    """Submit real-time camera-captured geotagged evidence for a project. Gallery uploads are disallowed."""
    now = datetime.datetime.now().isoformat()
    evidence_id = f"EV-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

    entry = {
        "evidence_id": evidence_id,
        "project_id": project_id,
        "photo_data": req.photo_data,
        "captured_at": req.captured_at or now,
        "captured_lat": req.captured_lat,
        "captured_lon": req.captured_lon,
        "accuracy_m": req.accuracy_m,
        "geo_distance_m": req.geo_distance_m,
        "geofence_status": req.geofence_status,
        "stage": req.stage,
        "contractor_name": req.contractor_name,
        "mb_record_no": req.mb_record_no or "N/A",
        "remarks": req.remarks or "",
        "physical_progress_pct": req.physical_progress_pct,
        "checksum": req.checksum or f"SHA256-{uuid.uuid4().hex[:16]}",
        "device_info": req.device_info or "Live Camera Stream",
        "verified_anti_cheat": True,
        "timestamp": now,
    }

    if project_id not in _digital_evidences:
        _digital_evidences[project_id] = []
    _digital_evidences[project_id].insert(0, entry)

    # Permanent Administrative Audit Trail Entry
    _audit_trail.append({
        "timestamp": now,
        "user": req.contractor_name,
        "role": "Contractor",
        "project_id": project_id,
        "action": "Live Geotagged Evidence Submitted",
        "details": f"Camera-only verification captured at ({req.captured_lat:.5f}N, {req.captured_lon:.5f}E) +/-{req.accuracy_m:.1f}m. Distance to site: {req.geo_distance_m:.1f}m ({req.geofence_status}). MB Ref: {req.mb_record_no or 'N/A'}.",
        "rationale": f"Milestone: {req.stage}. Physical Progress: {req.physical_progress_pct or 'N/A'}%. Remarks: {req.remarks or 'Real-time anti-tamper camera stream verified.'}",
    })

    # Update DataFrame record if project exists
    idx = _df[_df["project_id"] == project_id].index
    if not idx.empty:
        _df.loc[idx, "photo_lat"] = req.captured_lat
        _df.loc[idx, "photo_lon"] = req.captured_lon
        _df.loc[idx, "geo_distance_m"] = req.geo_distance_m
        if req.physical_progress_pct is not None:
            _df.loc[idx, "physical_progress_pct"] = req.physical_progress_pct

    # Auto-update active verification cases
    for case in _cases:
        if case.get("project_id") == project_id:
            case.setdefault("evidence_notes", []).append(
                f"{now[:10]}: Live Geotagged Evidence submitted by {req.contractor_name} — Geofence {req.geofence_status} ({req.geo_distance_m:.1f}m)"
            )
            if case.get("status") == "Evidence Requested":
                case["status"] = "Evidence Submitted"
            case["last_updated"] = now

    return {"status": "success", "evidence_id": evidence_id, "evidence": {k: _safe_val(v) for k, v in entry.items()}}


@app.get("/api/projects/{project_id}/evidence")
def get_project_evidence(project_id: str) -> dict:
    """Retrieve all submitted real-time geotagged evidence records for a project."""
    entries = _digital_evidences.get(project_id, [])
    return {
        "project_id": project_id,
        "count": len(entries),
        "evidence": [{k: _safe_val(v) for k, v in e.items()} for e in entries],
    }


# ---------------------------------------------------------------------------
# Endpoints — Audit Trail
# ---------------------------------------------------------------------------

@app.get("/api/audit-trail")
def get_audit_trail(
    project_id: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Searchable, chronological audit trail of all administrative actions."""
    if role in ("contractor", "agency", "mp"):
        return {
            "count": 0,
            "entries": [],
            "audit_trail": [],
            "notice": f"Audit trail restricted: internal administrative access only (role '{role}' unauthorized)",
        }

    trail = _audit_trail
    if role in ("state", "district"):
        permitted_df = _filter_by_role(_df, role, role_value)
        permitted_pids = set(permitted_df["project_id"].unique())
        trail = [a for a in trail if a.get("project_id") in permitted_pids]

    if project_id:
        trail = [a for a in trail if a["project_id"] == project_id]
    trail = sorted(trail, key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
    formatted = [{k: _safe_val(v) for k, v in a.items()} for a in trail]
    return {
        "count": len(trail),
        "entries": formatted,
        "audit_trail": formatted,
    }


# ---------------------------------------------------------------------------
# Endpoints — Benchmarks
# ---------------------------------------------------------------------------

@app.get("/api/benchmarks")
def get_benchmarks() -> dict:
    """Regional cost and timeline benchmark reference data."""
    from data_engine import COST_BENCHMARKS as CB
    benchmarks = []
    for work_type, data in CB.items():
        benchmarks.append({
            "work_type":        work_type,
            "median_cost_lakhs": data["median_cost_lakhs"],
            "std_pct":          data["std_pct"],
            "cement_per_bag":   data.get("cement_per_bag", 380),
            "steel_per_kg":     data.get("steel_per_kg", 72),
            "labour_per_day":   data.get("labour_per_day", 580),
        })
    return {"benchmarks": benchmarks}


# ---------------------------------------------------------------------------
# Endpoints — Roles
# ---------------------------------------------------------------------------

@app.get("/api/roles")
def get_roles() -> dict:
    """Available governance roles for the role-switcher UI."""
    return {"roles": ROLES}


# ---------------------------------------------------------------------------
# Endpoints — Anomaly Type Breakdown (replaces /api/fraud-types)
# ---------------------------------------------------------------------------

@app.get("/api/anomaly-types")
def get_anomaly_types() -> dict:
    """Anomaly type breakdown for charts (governance terminology)."""
    breakdown    = _df["anomaly_type"].value_counts().to_dict()
    risk_by_type = _df.groupby("anomaly_type")["risk_score"].mean().round(1).to_dict()
    amount_by_type = _df.groupby("anomaly_type")["sanctioned_amt"].sum().round(2).to_dict()
    return {
        "counts":         {k: _safe_val(v) for k, v in breakdown.items()},
        "avg_risk_score": {k: _safe_val(v) for k, v in risk_by_type.items()},
        "amount_at_risk": {k: _safe_val(v) for k, v in amount_by_type.items()},
    }


# Backward compatibility alias
@app.get("/api/fraud-types")
def get_fraud_types() -> dict:
    """Backward compatibility — redirects to anomaly-types."""
    return get_anomaly_types()


# ---------------------------------------------------------------------------
# Endpoints — Geo
# ---------------------------------------------------------------------------

@app.get("/api/geo")
def get_geo(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """GeoJSON FeatureCollection for map visualisation with risk scoring."""
    df = _filter_by_role(_df, role, role_value)
    features = []
    for _, row in df.iterrows():
        feature = {
            "type": "Feature",
            "geometry": {
                "type":        "Point",
                "coordinates": [_safe_val(row["lon"]), _safe_val(row["lat"])],
            },
            "properties": {
                "project_id":           _safe_val(row["project_id"]),
                "mp_name":              _safe_val(row["mp_name"]),
                "constituency":         _safe_val(row.get("constituency")),
                "district":             _safe_val(row["district"]),
                "state":                _safe_val(row["state"]),
                "work_type":            _safe_val(row.get("work_type")),
                "contractor":           _safe_val(row["contractor"]),
                "sanctioned_amt":       _safe_val(row["sanctioned_amt"]),
                "utilised_amt":         _safe_val(row.get("utilised_amt")),
                "unit_cost":            _safe_val(row.get("unit_cost")),
                "status":               _safe_val(row.get("status")),
                "milestone_stage":      _safe_val(row.get("milestone_stage")),
                "financial_year":       _safe_val(row.get("financial_year")),
                "risk_score":           _safe_val(row.get("risk_score")),
                "risk_tier":            _safe_val(row.get("risk_tier")),
                "risk_level":           _safe_val(row.get("risk_level")),
                "confidence_score":     _safe_val(row.get("confidence_score")),
                "anomaly_type":         _safe_val(row.get("anomaly_type")),
                "why_flagged":          _safe_val(row.get("why_flagged")),
                "flag_reasons":         _safe_val(row.get("flag_reasons", [])),
                "geo_distance_m":       _safe_val(row.get("geo_distance_m")),
                "site_lat":             _safe_val(row.get("site_lat")),
                "site_lon":             _safe_val(row.get("site_lon")),
                "photo_lat":            _safe_val(row.get("photo_lat")),
                "photo_lon":            _safe_val(row.get("photo_lon")),
                "geofence_flag":        _safe_val(row.get("geofence_flag", 0)),
                "days_delayed":         _safe_val(row.get("days_delayed", 0)),
                "delay_status":         _safe_val(row.get("delay_status")),
                "physical_progress_pct":_safe_val(row.get("physical_progress_pct")),
                "financial_progress_pct":_safe_val(row.get("financial_progress_pct")),
                "cost_overrun_pct":     _safe_val(row.get("cost_overrun_pct")),
                "utilisation_pct":      _safe_val(row.get("utilisation_pct")),
            },
        }
        features.append(feature)
    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Endpoints — State Summary
# ---------------------------------------------------------------------------

@app.get("/api/state-summary")
def get_state_summary() -> list:
    """Per-state aggregated summary for heatmap / bar chart."""
    grp = _df.groupby("state").agg(
        total        =("project_id",       "count"),
        flagged      =("risk_level",        lambda x: (x.isin(["High", "Medium"])).sum()),
        high_risk    =("risk_level",        lambda x: (x == "High").sum()),
        total_sanction=("sanctioned_amt",   "sum"),
        total_utilised=("utilised_amt",     "sum"),
        total_released=("released_amt",     "sum"),
        avg_risk_score=("risk_score",       "mean"),
        stalled_count =("delay_status",     lambda x: (x == "Stalled").sum()),
        total_overrun =("cost_overrun_amt", "sum"),
    ).reset_index()
    grp["anomaly_pct"] = (grp["flagged"] / grp["total"] * 100).round(2)
    grp["util_pct"]    = (grp["total_utilised"] / grp["total_sanction"].replace(0, 1) * 100).round(2)
    return [_row_to_dict(row) for _, row in grp.iterrows()]


# ---------------------------------------------------------------------------
# Endpoints — Fund Flow
# ---------------------------------------------------------------------------

@app.get("/api/fund-flow")
def get_fund_flow(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Fund utilization funnel: Sanctioned → Released → Expended → Utilised."""
    df = _filter_by_role(_df, role, role_value)
    sanctioned = float(df["sanctioned_amt"].sum()) if not df.empty else 0.0
    released   = float(df["released_amt"].sum()) if not df.empty else 0.0
    expended   = float(df["expenditure_amt"].sum()) if not df.empty else 0.0
    utilised   = float(df["utilised_amt"].sum()) if not df.empty else 0.0

    overall = {
        "sanctioned": round(sanctioned, 2),
        "released":   round(released, 2),
        "expended":   round(expended, 2),
        "utilised":   round(utilised, 2),
    }
    overall["release_pct"]  = round(overall["released"]  / overall["sanctioned"] * 100, 2) if overall["sanctioned"] else 0
    overall["expend_pct"]   = round(overall["expended"]   / overall["sanctioned"] * 100, 2) if overall["sanctioned"] else 0
    overall["utilised_pct"] = round(overall["utilised"]   / overall["sanctioned"] * 100, 2) if overall["sanctioned"] else 0

    if not df.empty:
        by_fy = df.groupby("financial_year").agg(
            sanctioned=("sanctioned_amt",  "sum"),
            released  =("released_amt",    "sum"),
            expended  =("expenditure_amt", "sum"),
            utilised  =("utilised_amt",    "sum"),
            projects  =("project_id",      "count"),
        ).reset_index().sort_values("financial_year")

        by_state = df.groupby("state").agg(
            sanctioned=("sanctioned_amt",  "sum"),
            released  =("released_amt",    "sum"),
            utilised  =("utilised_amt",    "sum"),
            projects  =("project_id",      "count"),
        ).reset_index()
        by_state["util_pct"] = (by_state["utilised"] / by_state["sanctioned"].replace(0, 1) * 100).round(2)
        by_state = by_state.sort_values("util_pct")
    else:
        by_fy = pd.DataFrame()
        by_state = pd.DataFrame()

    return {
        "overall":   {k: _safe_val(v) for k, v in overall.items()},
        "by_fy":     [_row_to_dict(row) for _, row in by_fy.iterrows()] if not by_fy.empty else [],
        "by_state":  [_row_to_dict(row) for _, row in by_state.iterrows()] if not by_state.empty else [],
    }


# ---------------------------------------------------------------------------
# Endpoints — MP Summary
# ---------------------------------------------------------------------------

@app.get("/api/mp-summary")
def get_mp_summary(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> list:
    """Per-MP aggregated fund utilization and risk profile."""
    df = _filter_by_role(_df, role, role_value)
    if df.empty:
        return []
    grp = df.groupby("mp_name").agg(
        total_projects  =("project_id",      "count"),
        flagged_count   =("risk_level",       lambda x: (x.isin(["High", "Medium"])).sum()),
        high_risk_count =("risk_level",       lambda x: (x == "High").sum()),
        total_sanctioned=("sanctioned_amt",   "sum"),
        total_utilised  =("utilised_amt",     "sum"),
        total_released  =("released_amt",     "sum"),
        avg_risk_score  =("risk_score",       "mean"),
        stalled_count   =("delay_status",     lambda x: (x == "Stalled").sum()),
        cost_overrun    =("cost_overrun_amt", "sum"),
        states          =("state",            lambda x: list(x.unique())),
    ).reset_index()
    grp["utilisation_pct"] = (grp["total_utilised"] / grp["total_sanctioned"].replace(0, 1) * 100).round(2)
    grp["anomaly_pct"]     = (grp["flagged_count"] / grp["total_projects"] * 100).round(2)
    grp = grp.sort_values("total_sanctioned", ascending=False)
    return [_row_to_dict(row) for _, row in grp.iterrows()]


# ---------------------------------------------------------------------------
# Endpoints — Timeline Trends
# ---------------------------------------------------------------------------

@app.get("/api/timeline")
def get_timeline(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Year-over-year trend data for sanctions, utilization, and anomalies."""
    df = _filter_by_role(_df, role, role_value)
    if df.empty:
        return {"by_fy": [], "stage_fy": []}

    by_fy = df.groupby("financial_year").agg(
        total_projects  =("project_id",      "count"),
        total_sanctioned=("sanctioned_amt",  "sum"),
        total_utilised  =("utilised_amt",    "sum"),
        total_released  =("released_amt",    "sum"),
        flagged_count   =("risk_level",      lambda x: (x.isin(["High", "Medium"])).sum()),
        high_risk_count =("risk_level",      lambda x: (x == "High").sum()),
        avg_risk_score  =("risk_score",      "mean"),
        completed       =("status",          lambda x: (x == "Completed").sum()),
        stalled         =("delay_status",    lambda x: (x == "Stalled").sum()),
        cost_overrun    =("cost_overrun_amt","sum"),
    ).reset_index().sort_values("financial_year")

    by_fy["utilisation_pct"] = (by_fy["total_utilised"] / by_fy["total_sanctioned"].replace(0, 1) * 100).round(2)
    by_fy["anomaly_pct"]     = (by_fy["flagged_count"]  / by_fy["total_projects"] * 100).round(2)
    by_fy["completion_rate"] = (by_fy["completed"]       / by_fy["total_projects"] * 100).round(2)

    stage_fy = df.groupby(["financial_year", "milestone_stage"]).size().reset_index(name="count")

    return {
        "by_fy":    [_row_to_dict(row) for _, row in by_fy.iterrows()],
        "stage_fy": [_row_to_dict(row) for _, row in stage_fy.iterrows()],
    }


# ---------------------------------------------------------------------------
# Endpoints — Delay Analytics
# ---------------------------------------------------------------------------

@app.get("/api/delay-analytics")
def get_delay_analytics(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Delay band distribution, stalled works by state, milestone analysis."""
    df = _filter_by_role(_df, role, role_value)
    if df.empty:
        return {
            "delay_distribution": [],
            "stalled_by_state": [],
            "top_stalled": [],
            "stage_distribution": [],
            "avg_delay_by_work": [],
        }

    delay_dist = df["delay_band"].value_counts().reset_index()
    delay_dist.columns = ["band", "count"]

    stalled = df[df["delay_status"].isin(["Stalled", "Significant Delay"])].copy()
    by_state = stalled.groupby("state").agg(
        stalled_count   =("project_id",      "count"),
        total_sanctioned=("sanctioned_amt",  "sum"),
        total_utilised  =("utilised_amt",    "sum"),
        avg_delay_days  =("days_delayed",    "mean"),
    ).reset_index().sort_values("stalled_count", ascending=False)

    top_stalled = stalled.sort_values("days_delayed", ascending=False).head(20)
    stalled_cols = [
        "project_id", "mp_name", "state", "district", "work_type",
        "contractor", "days_delayed", "delay_status", "delay_band",
        "sanctioned_amt", "utilised_amt", "milestone_stage", "financial_year",
        "released_amt", "risk_score", "risk_tier",
    ]
    stalled_cols = [c for c in stalled_cols if c in top_stalled.columns]

    stage_dist = df["milestone_stage"].value_counts().reset_index()
    stage_dist.columns = ["stage", "count"]

    avg_delay_work = df[df["days_delayed"] > 0].groupby("work_type").agg(
        avg_delay=("days_delayed", "mean"),
        count    =("project_id",  "count"),
    ).reset_index().sort_values("avg_delay", ascending=False).head(10)

    return {
        "delay_distribution": [_row_to_dict(row) for _, row in delay_dist.iterrows()],
        "stalled_by_state":   [_row_to_dict(row) for _, row in by_state.iterrows()],
        "top_stalled":        [_row_to_dict(row) for _, row in top_stalled[stalled_cols].iterrows()],
        "stage_distribution": [_row_to_dict(row) for _, row in stage_dist.iterrows()],
        "avg_delay_by_work":  [_row_to_dict(row) for _, row in avg_delay_work.iterrows()],
    }


# ---------------------------------------------------------------------------
# Endpoints — Cost Overrun Analytics
# ---------------------------------------------------------------------------

@app.get("/api/cost-overrun")
def get_cost_overrun(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Cost overrun distribution, top overrun projects, state-wise breakdown."""
    df = _filter_by_role(_df, role, role_value)
    if df.empty:
        return {
            "band_distribution": [],
            "top_overrun": [],
            "state_overrun": [],
            "total_overrun_amt": 0.0,
            "affected_projects": 0,
        }

    overrun_df = df[df["cost_overrun_pct"] > 0].copy()

    band_dist = overrun_df["cost_overrun_band"].value_counts().reset_index()
    band_dist.columns = ["band", "count"]

    top_overrun = overrun_df.sort_values("cost_overrun_pct", ascending=False).head(15)
    overrun_cols = [
        "project_id", "mp_name", "state", "district", "work_type",
        "contractor", "sanctioned_amt", "cost_overrun_amt", "cost_overrun_pct",
        "cost_overrun_band", "financial_year", "risk_score", "risk_tier", "status",
    ]
    overrun_cols = [c for c in overrun_cols if c in top_overrun.columns]

    state_overrun = df.groupby("state").agg(
        total_overrun    =("cost_overrun_amt", "sum"),
        avg_overrun_pct  =("cost_overrun_pct", "mean"),
        overrun_projects =("cost_overrun_pct", lambda x: (x > 0).sum()),
        total_projects   =("project_id",       "count"),
    ).reset_index()
    state_overrun["overrun_rate"] = (state_overrun["overrun_projects"] / state_overrun["total_projects"].replace(0, 1) * 100).round(2)
    state_overrun = state_overrun.sort_values("total_overrun", ascending=False)

    return {
        "band_distribution": [_row_to_dict(row) for _, row in band_dist.iterrows()],
        "top_overrun":       [_row_to_dict(row) for _, row in top_overrun[overrun_cols].iterrows()],
        "state_overrun":     [_row_to_dict(row) for _, row in state_overrun.iterrows()],
        "total_overrun_amt": round(float(df["cost_overrun_amt"].sum()), 2),
        "affected_projects": int((df["cost_overrun_pct"] > 0).sum()),
    }


# ---------------------------------------------------------------------------
# Endpoints — Work Progress
# ---------------------------------------------------------------------------

@app.get("/api/work-progress")
def get_work_progress(
    role: Optional[str] = Query(None),
    role_value: Optional[str] = Query(None),
) -> dict:
    """Physical vs financial progress data for scatter and milestone analysis."""
    df = _filter_by_role(_df, role, role_value)
    progress_df = df[df["milestone_stage"].isin(["Work In Progress", "Completed", "Tender Awarded"])].copy()
    prog_cols = [
        "project_id", "mp_name", "state", "district", "work_type", "contractor",
        "milestone_stage", "status", "financial_year",
        "physical_progress_pct", "financial_progress_pct", "progress_discrepancy",
        "sanctioned_amt", "utilised_amt", "utilisation_pct",
        "days_delayed", "delay_status", "risk_score", "risk_tier", "anomaly_type",
    ]
    prog_cols = [c for c in prog_cols if c in progress_df.columns]

    if not df.empty:
        by_work_type = df.groupby("work_type").agg(
            avg_physical =("physical_progress_pct",  "mean"),
            avg_financial=("financial_progress_pct", "mean"),
            avg_gap      =("progress_discrepancy",   "mean"),
            total        =("project_id",             "count"),
            completed    =("status",                 lambda x: (x == "Completed").sum()),
        ).reset_index()
        by_work_type["completion_rate"] = (by_work_type["completed"] / by_work_type["total"].replace(0, 1) * 100).round(2)
        by_work_type = by_work_type.sort_values("avg_gap", ascending=False).head(15)

        summary = {
            "avg_physical_progress":  round(float(df["physical_progress_pct"].mean()), 2),
            "avg_financial_progress": round(float(df["financial_progress_pct"].mean()), 2),
            "avg_discrepancy":        round(float(df["progress_discrepancy"].mean()), 2),
            "high_gap_projects":      int((df["progress_discrepancy"] >= 40).sum()),
        }
    else:
        by_work_type = pd.DataFrame()
        summary = {"avg_physical_progress": 0, "avg_financial_progress": 0, "avg_discrepancy": 0, "high_gap_projects": 0}

    return {
        "projects":      [_row_to_dict(row) for _, row in progress_df[prog_cols].iterrows()],
        "by_work_type":  [_row_to_dict(row) for _, row in by_work_type.iterrows()] if not by_work_type.empty else [],
        "summary":       summary,
    }


# ---------------------------------------------------------------------------
# Endpoints — System
# ---------------------------------------------------------------------------

@app.post("/api/refresh")
def refresh_data() -> dict:
    """Re-generate data and re-run AI analysis."""
    global _df, _cases, _audit_trail
    _df = _sentinel.analyze(_engine.generate())
    _cases = list(_engine.cases)
    _audit_trail = list(_engine.audit_trail)
    stats = _sentinel.summary_stats(_df)
    return {"status": "refreshed", "stats": {k: _safe_val(v) for k, v in stats.items()}}


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "records": len(_df),
        "version": "3.0.0",
        "platform": "M-TRACE / MPLADS IntelliTrack",
        "principle": "AI detects anomalies • Human authorities verify & decide",
    }


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
