"""
data_engine.py
--------------
M-TRACE / MPLADS IntelliTrack — Synthetic Data Generator.

Produces realistic MPLADS project records with:
  - 4-Layer Data Architecture (Source, Derived, AI Inference, Human Decision)
  - Standardised Government Project IDs (MPLADS-{STATE}-{DIST}-{YEAR}-{SEQ})
  - Real MP names & constituency data seeded from Parliament CSV data
  - Regional cost benchmarks (Schedule of Rates) for typical civil works
  - Pre-seeded flagship "Community Water Tank" demo scenario
  - Verification case & audit trail seed data

Governance Principle:
  AI detects anomalies → Evidence informs → Human authority verifies → Governance decides.
  This engine generates *operational anomaly patterns*, NOT "fraud".
"""

from __future__ import annotations

import csv
import datetime
import os
import random
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, List

import numpy as np
import pandas as pd
from faker import Faker

fake = Faker("en_IN")
rng = np.random.default_rng(42)

# ---------------------------------------------------------------------------
# Indian geographic reference data (expanded to 18 states)
# ---------------------------------------------------------------------------

STATES_DISTRICTS: dict[str, List[str]] = {
    "Uttar Pradesh":   ["Lucknow", "Kanpur", "Varanasi", "Agra", "Meerut", "Allahabad", "Gorakhpur", "Noida"],
    "Maharashtra":     ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur", "Thane", "Amravati"],
    "Bihar":           ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Arrah"],
    "Rajasthan":       ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Bharatpur"],
    "Madhya Pradesh":  ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Ratlam"],
    "West Bengal":     ["Kolkata", "Howrah", "Darjeeling", "Asansol", "Siliguri", "Durgapur"],
    "Tamil Nadu":      ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
    "Karnataka":       ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Kalaburagi"],
    "Gujarat":         ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
    "Telangana":       ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
    "Andhra Pradesh":  ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
    "Odisha":          ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
    "Punjab":          ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda"],
    "Haryana":         ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak"],
    "Jharkhand":       ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
    "Assam":           ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon"],
    "Kerala":          ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
    "Chhattisgarh":    ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
}

# State abbreviations for project IDs
STATE_ABBREV: dict[str, str] = {
    "Uttar Pradesh": "UP", "Maharashtra": "MH", "Bihar": "BR", "Rajasthan": "RJ",
    "Madhya Pradesh": "MP", "West Bengal": "WB", "Tamil Nadu": "TN", "Karnataka": "KA",
    "Gujarat": "GJ", "Telangana": "TS", "Andhra Pradesh": "AP", "Odisha": "OD",
    "Punjab": "PB", "Haryana": "HR", "Jharkhand": "JH", "Assam": "AS",
    "Kerala": "KL", "Chhattisgarh": "CG",
}

DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "Lucknow": (26.85, 80.95),   "Kanpur": (26.45, 80.33),   "Varanasi": (25.32, 83.01),
    "Agra": (27.18, 78.01),       "Meerut": (28.98, 77.71),   "Allahabad": (25.45, 81.84),
    "Gorakhpur": (26.76, 83.37),  "Noida": (28.54, 77.39),
    "Mumbai": (19.08, 72.88),     "Pune": (18.52, 73.86),     "Nagpur": (21.15, 79.09),
    "Nashik": (19.99, 73.79),     "Aurangabad": (19.88, 75.34),"Solapur": (17.68, 75.91),
    "Kolhapur": (16.69, 74.23),   "Thane": (19.22, 72.98),    "Amravati": (20.93, 77.77),
    "Patna": (25.59, 85.13),      "Gaya": (24.80, 85.00),     "Bhagalpur": (25.25, 86.98),
    "Muzaffarpur": (26.12, 85.39),"Purnia": (25.78, 87.48),   "Darbhanga": (26.17, 85.90),
    "Arrah": (25.57, 84.67),
    "Jaipur": (26.91, 75.79),     "Jodhpur": (26.29, 73.02),  "Udaipur": (24.58, 73.68),
    "Kota": (25.18, 75.83),       "Ajmer": (26.45, 74.63),    "Bikaner": (28.01, 73.31),
    "Bharatpur": (27.22, 77.50),
    "Bhopal": (23.25, 77.41),     "Indore": (22.72, 75.86),   "Gwalior": (26.22, 78.18),
    "Jabalpur": (23.18, 79.94),   "Ujjain": (23.18, 75.77),   "Sagar": (23.84, 78.74),
    "Ratlam": (23.33, 75.04),
    "Kolkata": (22.57, 88.36),    "Howrah": (22.59, 88.31),   "Darjeeling": (27.04, 88.27),
    "Asansol": (23.68, 86.98),    "Siliguri": (26.72, 88.43), "Durgapur": (23.48, 87.32),
    "Chennai": (13.08, 80.27),    "Coimbatore": (11.00, 76.96),"Madurai": (9.93, 78.12),
    "Tiruchirappalli": (10.79, 78.70),"Salem": (11.67, 78.15), "Tirunelveli": (8.73, 77.70),
    "Bengaluru": (12.97, 77.59),  "Mysuru": (12.30, 76.65),   "Hubballi": (15.35, 75.14),
    "Mangaluru": (12.87, 74.84),  "Belagavi": (15.85, 74.50), "Kalaburagi": (17.33, 76.82),
    "Ahmedabad": (23.03, 72.58),  "Surat": (21.17, 72.83),     "Vadodara": (22.30, 73.20),
    "Rajkot": (22.30, 70.80),     "Bhavnagar": (21.76, 72.15),"Jamnagar": (22.47, 70.07),
    "Hyderabad": (17.39, 78.49),  "Warangal": (17.97, 79.59), "Nizamabad": (18.67, 78.10),
    "Karimnagar": (18.44, 79.13), "Khammam": (17.25, 80.15),
    "Visakhapatnam": (17.69, 83.22),"Vijayawada": (16.51, 80.62),"Guntur": (16.31, 80.44),
    "Nellore": (14.44, 79.99),    "Tirupati": (13.63, 79.42),
    "Bhubaneswar": (20.30, 85.85),"Cuttack": (20.46, 85.88),  "Rourkela": (22.26, 84.87),
    "Berhampur": (19.32, 84.79),  "Sambalpur": (21.47, 83.97),
    "Amritsar": (31.63, 74.87),   "Ludhiana": (30.90, 75.85), "Jalandhar": (31.33, 75.58),
    "Patiala": (30.34, 76.38),    "Bathinda": (30.21, 74.95),
    "Gurugram": (28.46, 77.03),   "Faridabad": (28.41, 77.31),"Panipat": (29.39, 76.97),
    "Ambala": (30.38, 76.78),     "Rohtak": (28.89, 76.59),
    "Ranchi": (23.35, 85.33),     "Jamshedpur": (22.80, 86.20),"Dhanbad": (23.80, 86.43),
    "Bokaro": (23.67, 86.15),     "Hazaribagh": (23.99, 85.36),
    "Guwahati": (26.18, 91.74),   "Silchar": (24.82, 92.80),  "Dibrugarh": (27.48, 94.91),
    "Jorhat": (26.75, 94.22),     "Nagaon": (26.35, 92.69),
    "Thiruvananthapuram": (8.52, 76.94),"Kochi": (9.93, 76.27),"Kozhikode": (11.25, 75.78),
    "Thrissur": (10.52, 76.21),   "Kollam": (8.89, 76.60),
    "Raipur": (21.25, 81.63),     "Bhilai": (21.21, 81.43),   "Bilaspur": (22.08, 82.15),
    "Korba": (22.36, 82.70),      "Durg": (21.19, 81.28),
}

# ---------------------------------------------------------------------------
# Work categories & regional cost benchmarks (Schedule of Rates)
# ---------------------------------------------------------------------------

WORK_TYPES = [
    "Road Construction", "Drainage Infrastructure", "School Building Renovation",
    "Community Health Centre", "Drinking Water Project", "Solar Street Lighting",
    "Storm Water Drain", "Public Toilet Complex", "Anganwadi Centre Construction",
    "Bridge Construction", "Culvert Repair", "Primary School Computer Lab",
    "Gymnasium Construction", "Cremation Ground Development", "Check Dam Construction",
    "Irrigation Canal Lining", "Library Construction", "Rural Connectivity Road",
    "Solid Waste Management", "Cattle Pond Development", "Bus Shelter Construction",
    "Cremation Shed", "Community Hall Construction", "Footpath Development",
    "Street Beautification", "Playground Development", "Community Water Tank",
    "Smart Classroom", "PHC/Sub-Centre Upgrade",
]

# Regional Schedule of Rates (SoR) benchmark — median cost per work type (₹ Lakhs)
# Used for peer benchmarking anomaly detection
COST_BENCHMARKS: dict[str, dict[str, float]] = {
    "Road Construction":            {"median_cost_lakhs": 45.0, "std_pct": 22, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 600},
    "Drainage Infrastructure":      {"median_cost_lakhs": 28.0, "std_pct": 25, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 550},
    "School Building Renovation":   {"median_cost_lakhs": 35.0, "std_pct": 20, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 600},
    "Community Health Centre":      {"median_cost_lakhs": 55.0, "std_pct": 18, "cement_per_bag": 390, "steel_per_kg": 75, "labour_per_day": 650},
    "Drinking Water Project":       {"median_cost_lakhs": 42.0, "std_pct": 24, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 580},
    "Community Water Tank":         {"median_cost_lakhs": 42.3, "std_pct": 20, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 580},
    "Solar Street Lighting":        {"median_cost_lakhs": 18.0, "std_pct": 30, "cement_per_bag": 0,   "steel_per_kg": 0,  "labour_per_day": 500},
    "Community Hall Construction":  {"median_cost_lakhs": 60.0, "std_pct": 20, "cement_per_bag": 385, "steel_per_kg": 74, "labour_per_day": 620},
    "Bridge Construction":          {"median_cost_lakhs": 80.0, "std_pct": 25, "cement_per_bag": 390, "steel_per_kg": 78, "labour_per_day": 700},
    "Smart Classroom":              {"median_cost_lakhs": 25.0, "std_pct": 22, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 550},
    "PHC/Sub-Centre Upgrade":       {"median_cost_lakhs": 40.0, "std_pct": 18, "cement_per_bag": 385, "steel_per_kg": 74, "labour_per_day": 600},
}

# Fallback for work types not in benchmarks
DEFAULT_BENCHMARK = {"median_cost_lakhs": 40.0, "std_pct": 25, "cement_per_bag": 380, "steel_per_kg": 72, "labour_per_day": 580}

MILESTONE_STAGES = [
    "Recommended",
    "Admin Sanction",
    "Technical Sanction",
    "Tender Awarded",
    "Work In Progress",
    "Completed",
]

CONTRACTOR_NAMES = [
    "Shri Ram Constructions Pvt Ltd", "M/s Bharat Infra Works",
    "Patel Brothers Infrastructure",  "National Construction Co.",
    "Sunrise Engineering Works",      "M/s Ganesh Builders",
    "Deshbandhu Civil Works",         "Swastik Infrastructure Ltd",
    "Om Sai Construction",            "Janta Road Builders",
    "Trimurti Projects Pvt Ltd",      "Indian Civil Works",
    "Sahara Builder Corp",            "Navjeevan Construction",
    "Green Valley Infra",             "Rajputana Works Co.",
    "Pioneer Construction Ltd",       "Metro Civil Projects",
    "Janaki Infrastructure",          "Bhumi Developers Ltd",
]

# Similar-name contractor pairs (used for name-similarity anomaly detection)
SIMILAR_NAME_CONTRACTORS: dict[str, str] = {
    "Shri Ram Constructions Pvt Ltd": "Shree Ram Construction Pvt. Ltd.",
    "M/s Bharat Infra Works":         "M/S Bharat Infrastructure Works",
    "Patel Brothers Infrastructure":  "Patel Bros Infrastructure",
    "National Construction Co.":      "National Constructions Company",
    "Sunrise Engineering Works":      "Sun Rise Engineering and Works",
}

# Verification case statuses
CASE_STATUSES = [
    "Alert Generated",
    "Case Opened",
    "Under Review",
    "Evidence Requested",
    "Field Inspection Scheduled",
    "Finding Recorded",
    "Resolved - Legitimate",
    "Resolved - Corrective Action",
]

# ---------------------------------------------------------------------------
# Real MP data loader
# ---------------------------------------------------------------------------

def _load_real_mp_data() -> list[dict]:
    """Load real MP names, states, constituencies, and allocated amounts from Parliament CSV."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "Allocated Limit for Honble MPs.csv",
        Path(__file__).resolve().parent.parent / "Allocated Limit for Honble MPs.csv",
        Path("Allocated Limit for Honble MPs.csv"),
    ]
    csv_path = next((p for p in candidates if p.exists()), None)
    if not csv_path:
        return []

    records = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                records.append({
                    "mp_name": row.get("Hon'ble Members of Parliaments", "").strip(),
                    "state": row.get("State", "").strip(),
                    "constituency": row.get("Constituency", "").strip(),
                    "allocated_amount": float(row.get("Allocated AMOUNT ( ₹ )", "0").strip().replace(",", "")),
                })
            except (ValueError, KeyError):
                continue
    return records


# ---------------------------------------------------------------------------
# Anomaly archetype configuration (governance-aligned terminology)
# ---------------------------------------------------------------------------

@dataclass
class AnomalyConfig:
    """Operational anomaly injection configuration.

    These represent realistic patterns of discrepancy that the AI engine should
    detect. They are NOT accusations of wrongdoing — legitimate administrative
    explanations exist for many of these patterns.
    """
    # Progress-expenditure divergence: high financial outflow, low physical completion
    progress_divergence_fraction: float = 0.06
    # Duplicate/overlapping work descriptions in close proximity
    duplicate_scope_fraction: float = 0.04
    # Cost outlier: unit costs significantly above regional peer benchmarks
    cost_outlier_fraction: float = 0.06
    # Concentrated contractor pattern: single contractor dominates a locality
    concentrated_contractor_fraction: float = 0.04
    # Critical timeline delay / stalled works
    timeline_delay_fraction: float = 0.07
    # Geospatial evidence mismatch: photo GPS differs from registered site
    geo_evidence_mismatch_fraction: float = 0.03
    # Total records to generate
    total_records: int = 800


# Counter for unique sequential project IDs
_project_seq: dict[str, int] = {}


def _next_project_id(state: str, district: str, fy: str) -> str:
    """Generate a standardised MPLADS project ID: MPLADS-{ST}-{DIST}-{YEAR}-{SEQ}."""
    st = STATE_ABBREV.get(state, state[:2].upper())
    dist_code = district[:3].upper()
    year = fy.split("-")[0]
    key = f"{st}-{dist_code}-{year}"
    _project_seq[key] = _project_seq.get(key, 0) + 1
    seq = str(_project_seq[key]).zfill(5)
    return f"MPLADS-{st}-{dist_code}-{year}-{seq}"


class MPLADSDataEngine:
    """Generates synthetic MPLADS project records with 4-layer data architecture.

    AI-Assisted Governance Principle:
        The generated data contains operational anomaly patterns that the AI engine
        will flag for human review. These patterns are NOT labels of wrongdoing —
        they represent deviations that warrant verification by competent authorities.
    """

    def __init__(self, config: AnomalyConfig | None = None):
        self.config = config or AnomalyConfig()
        self._records: list[dict] = []
        self._real_mps: list[dict] = _load_real_mp_data()
        self._cases: list[dict] = []
        self._audit_trail: list[dict] = []

    @property
    def cases(self) -> list[dict]:
        return self._cases

    @property
    def audit_trail(self) -> list[dict]:
        return self._audit_trail

    def generate(self) -> pd.DataFrame:
        """Generate the complete project dataset with anomaly patterns."""
        global _project_seq
        _project_seq = {}
        self._records = []
        self._cases = []
        self._audit_trail = []
        n = self.config.total_records

        n_progress  = int(n * self.config.progress_divergence_fraction)
        n_dup       = int(n * self.config.duplicate_scope_fraction)
        n_cost      = int(n * self.config.cost_outlier_fraction)
        n_conc      = int(n * self.config.concentrated_contractor_fraction)
        n_delayed   = int(n * self.config.timeline_delay_fraction)
        n_geo       = int(n * self.config.geo_evidence_mismatch_fraction)
        n_clean     = n - n_progress - n_dup - n_cost - n_conc - n_delayed - n_geo

        self._generate_clean(n_clean)
        self._inject_progress_divergence(n_progress)
        self._inject_duplicate_scope(n_dup)
        self._inject_cost_outlier(n_cost)
        self._inject_concentrated_contractor(n_conc)
        self._inject_timeline_delay(n_delayed)
        self._inject_geo_evidence_mismatch(n_geo)

        # Flagship demo scenario removed per requirements
        # self._inject_flagship_water_tank()

        df = pd.DataFrame(self._records)
        df = df.sample(frac=1, random_state=42).reset_index(drop=True)

        # Round numeric columns
        for col in ["sanctioned_amt", "released_amt", "expenditure_amt", "utilised_amt",
                     "cost_overrun_amt", "unit_cost"]:
            if col in df.columns:
                df[col] = df[col].round(2)
        for col in ["cost_overrun_pct", "physical_progress_pct",
                     "financial_progress_pct", "progress_discrepancy"]:
            if col in df.columns:
                df[col] = df[col].round(1)

        # Add derived categorical bands
        df["delay_band"] = df["days_delayed"].apply(self._delay_band)
        df["cost_overrun_band"] = df["cost_overrun_pct"].apply(self._overrun_band)
        df["utilisation_pct"] = (
            (df["utilised_amt"] / df["sanctioned_amt"].replace(0, 1)) * 100
        ).clip(0, 150).round(1)

        # Generate seed verification cases & audit trail for high-anomaly projects
        self._generate_seed_cases(df)

        return df

    @staticmethod
    def _delay_band(days: int) -> str:
        if days == 0:
            return "On Track"
        elif days <= 30:
            return "Minor (<30d)"
        elif days <= 90:
            return "Moderate (30-90d)"
        elif days <= 180:
            return "Significant (90-180d)"
        else:
            return "Critical (>180d)"

    @staticmethod
    def _overrun_band(pct: float) -> str:
        if pct <= 0:
            return "None"
        elif pct <= 10:
            return "Low (≤10%)"
        elif pct <= 25:
            return "Moderate (10-25%)"
        elif pct <= 40:
            return "High (25-40%)"
        else:
            return "Severe (>40%)"

    # ------------------------------------------------------------------
    # MP data selection
    # ------------------------------------------------------------------

    def _pick_mp(self, state: str | None = None, district: str | None = None) -> dict:
        """Pick an MP from real data if available, matching district constituency where possible."""
        candidates = self._real_mps
        if district and candidates:
            dist_mps = [m for m in candidates if district.lower() in m.get("constituency", "").lower()]
            if dist_mps:
                return random.choice(dist_mps)
        if state and candidates:
            state_mps = [m for m in candidates if m["state"].lower() == state.lower()]
            if state_mps:
                return random.choice(state_mps)
        if candidates:
            return random.choice(candidates)
        # Fallback synthetic
        return {
            "mp_name": fake.name(),
            "state": state or random.choice(list(STATES_DISTRICTS)),
            "constituency": fake.city(),
            "allocated_amount": 147000000,
        }

    # ------------------------------------------------------------------
    # Base record generator
    # ------------------------------------------------------------------

    def _base_record(self, anomaly_type: str = "none") -> dict:
        state    = random.choice(list(STATES_DISTRICTS))
        district = random.choice(STATES_DISTRICTS[state])
        lat, lon = DISTRICT_COORDS.get(district, (20.59, 78.96))
        # Registered site coordinates (approved project location)
        site_lat = round(lat + rng.uniform(-0.15, 0.15), 6)
        site_lon = round(lon + rng.uniform(-0.15, 0.15), 6)
        # Evidence photo coordinates — normally close to site
        photo_lat = round(site_lat + rng.uniform(-0.0008, 0.0008), 6)
        photo_lon = round(site_lon + rng.uniform(-0.0008, 0.0008), 6)

        mp_data  = self._pick_mp(state, district)
        work     = random.choice(WORK_TYPES)
        benchmark = COST_BENCHMARKS.get(work, DEFAULT_BENCHMARK)
        sanctioned = round(float(rng.uniform(6_00_000, 1_40_00_000)), 2)

        # Milestone lifecycle
        stage_weights = [0.05, 0.08, 0.10, 0.15, 0.32, 0.30]
        stage = random.choices(MILESTONE_STAGES, weights=stage_weights)[0]

        # Financial year spread
        fy = random.choices(
            ["2022-23", "2023-24", "2024-25"],
            weights=[0.25, 0.40, 0.35]
        )[0]
        base_year = int(fy.split("-")[0])
        rec_date = datetime.date(base_year, random.randint(4, 7), random.randint(1, 28))
        sanct_date = rec_date + datetime.timedelta(days=random.randint(20, 60))
        target_date = sanct_date + datetime.timedelta(days=random.randint(150, 300))

        today = datetime.date(2026, 9, 1)

        contractor = random.choice(CONTRACTOR_NAMES)

        # Invoice material rates (realistic with slight variance)
        cement_rate = round(benchmark["cement_per_bag"] * rng.uniform(0.92, 1.08), 0)
        steel_rate  = round(benchmark["steel_per_kg"] * rng.uniform(0.90, 1.10), 0)
        labour_rate = round(benchmark["labour_per_day"] * rng.uniform(0.88, 1.12), 0)

        if stage == "Completed":
            actual_date = target_date + datetime.timedelta(days=random.randint(-20, 45))
            days_delayed = max(0, (actual_date - target_date).days)
            physical_pct = 100.0
            released_amt = sanctioned
            disbursed_amt = round(sanctioned * rng.uniform(0.92, 1.0), 2)
            expenditure_amt = disbursed_amt
            cost_overrun_amt = max(0.0, expenditure_amt - sanctioned)
        elif stage == "Work In Progress":
            actual_date = None
            physical_pct = round(float(rng.uniform(25.0, 85.0)), 1)
            released_amt = round(sanctioned * rng.uniform(0.60, 0.90), 2)
            disbursed_amt = round(released_amt * (physical_pct / 100.0) * rng.uniform(0.90, 1.05), 2)
            expenditure_amt = disbursed_amt
            days_delayed = max(0, (today - target_date).days) if today > target_date else 0
            cost_overrun_amt = 0.0
        elif stage == "Tender Awarded":
            actual_date = None
            physical_pct = round(float(rng.uniform(0.0, 15.0)), 1)
            released_amt = round(sanctioned * 0.30, 2)
            disbursed_amt = round(sanctioned * 0.10, 2)
            expenditure_amt = disbursed_amt
            days_delayed = max(0, (today - target_date).days) if today > target_date else 0
            cost_overrun_amt = 0.0
        else:  # Recommended / Admin Sanction / Technical Sanction
            actual_date = None
            physical_pct = 0.0
            released_amt = round(sanctioned * 0.20, 2) if stage == "Technical Sanction" else 0.0
            disbursed_amt = 0.0
            expenditure_amt = 0.0
            days_delayed = 0
            cost_overrun_amt = 0.0

        fin_pct = round((disbursed_amt / sanctioned) * 100.0, 1) if sanctioned > 0 else 0.0
        progress_gap = round(fin_pct - physical_pct, 1)
        cost_overrun_pct = round((cost_overrun_amt / sanctioned) * 100.0, 1) if sanctioned > 0 else 0.0

        if days_delayed == 0:
            delay_status = "On Track"
        elif days_delayed <= 90:
            delay_status = "Minor Delay"
        elif days_delayed <= 180:
            delay_status = "Significant Delay"
        else:
            delay_status = "Stalled"

        project_id = _next_project_id(state, district, fy)

        # Compute geofence distance in meters between registered site and photo evidence
        geo_distance_m = round(
            ((photo_lat - site_lat)**2 + (photo_lon - site_lon)**2)**0.5 * 111000, 1
        )

        return {
            # --- Layer A: Source Data ---
            "project_id":             project_id,
            "mp_name":                mp_data["mp_name"],
            "constituency":           mp_data.get("constituency", f"{district} {random.choice(['North','South','East','West','Central'])}"),
            "state":                  state,
            "district":               district,
            "contractor":             contractor,
            "work_type":              work,
            "work_description":       f"{work} at {fake.city()}, {district}",
            "milestone_stage":        stage,
            "status":                 "Completed" if stage == "Completed" else "In Progress" if stage in ["Work In Progress", "Tender Awarded"] else "Sanctioned",
            "recommended_date":       rec_date.strftime("%Y-%m-%d"),
            "sanctioned_date":        sanct_date.strftime("%Y-%m-%d"),
            "target_completion_date": target_date.strftime("%Y-%m-%d"),
            "actual_completion_date": actual_date.strftime("%Y-%m-%d") if actual_date else None,
            "financial_year":         fy,
            "sanctioned_amt":         sanctioned,
            "released_amt":           released_amt,
            "expenditure_amt":        expenditure_amt,
            "utilised_amt":           disbursed_amt,
            "cost_overrun_amt":       cost_overrun_amt,
            "unit_cost":              round(sanctioned / rng.uniform(80, 450), 2),

            # GPS: registered site vs evidence photo
            "site_lat":               site_lat,
            "site_lon":               site_lon,
            "photo_lat":              photo_lat,
            "photo_lon":              photo_lon,
            "geo_distance_m":         geo_distance_m,
            # Keep lat/lon as site coords for backward compatibility
            "lat":                    site_lat,
            "lon":                    site_lon,

            # Invoice material rates
            "cement_rate":            cement_rate,
            "steel_rate":             steel_rate,
            "labour_rate":            labour_rate,

            # --- Layer B: Derived Data ---
            "days_delayed":           days_delayed,
            "delay_status":           delay_status,
            "cost_overrun_pct":       cost_overrun_pct,
            "physical_progress_pct":  physical_pct,
            "financial_progress_pct": fin_pct,
            "progress_discrepancy":   progress_gap,

            # Anomaly type (for internal tracking only — NOT exposed as "fraud")
            "anomaly_type":           anomaly_type,
        }

    def _generate_clean(self, n: int) -> None:
        for _ in range(n):
            self._records.append(self._base_record())

    # ------------------------------------------------------------------
    # Anomaly Archetype 1: Progress-Expenditure Divergence
    # High financial outflow with disproportionately low physical completion.
    # This MAY indicate fund diversion, but could also reflect advance
    # material procurement, staged billing, or seasonal construction pauses.
    # ------------------------------------------------------------------
    def _inject_progress_divergence(self, n: int) -> None:
        for _ in range(n):
            rec = self._base_record("progress_divergence")
            rec["milestone_stage"]        = "Work In Progress"
            rec["status"]                 = "In Progress"
            rec["released_amt"]           = round(rec["sanctioned_amt"] * 0.90, 2)
            rec["utilised_amt"]           = round(rec["sanctioned_amt"] * rng.uniform(0.70, 0.95), 2)
            rec["financial_progress_pct"] = round((rec["utilised_amt"] / rec["sanctioned_amt"]) * 100.0, 1)
            rec["physical_progress_pct"]  = round(float(rng.uniform(12.0, 35.0)), 1)
            rec["progress_discrepancy"]   = round(rec["financial_progress_pct"] - rec["physical_progress_pct"], 1)
            rec["days_delayed"]           = random.randint(90, 210)
            rec["delay_status"]           = "Significant Delay"
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Anomaly Archetype 2: Duplicate / Overlapping Work Scope
    # Similar descriptions for works in close geographic proximity.
    # Could be legitimate sub-phases of a larger project, or clerical
    # duplication, or genuinely overlapping scope requiring review.
    # ------------------------------------------------------------------
    def _inject_duplicate_scope(self, n: int) -> None:
        legit = [c for c in CONTRACTOR_NAMES if c in SIMILAR_NAME_CONTRACTORS]
        for _ in range(n):
            rec = self._base_record("duplicate_scope")
            orig = random.choice(legit)
            rec["contractor"] = SIMILAR_NAME_CONTRACTORS[orig]
            if self._records:
                src = random.choice([r for r in self._records if r["anomaly_type"] == "none"] or self._records)
                rec["work_description"] = src["work_description"].replace("at", "near").replace(",", " -")
                rec["work_type"]        = src["work_type"]
                rec["sanctioned_amt"]   = round(src["sanctioned_amt"] * rng.uniform(0.97, 1.02), 2)
            rec["milestone_stage"] = "Completed"
            rec["status"]          = "Completed"
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Anomaly Archetype 3: Cost Outlier (above regional peer benchmark)
    # Unit costs significantly exceeding the regional Schedule of Rates.
    # Can be legitimate due to terrain difficulty, material scarcity,
    # or remote location premium. Warrants peer comparison review.
    # ------------------------------------------------------------------
    def _inject_cost_outlier(self, n: int) -> None:
        for _ in range(n):
            rec = self._base_record("cost_outlier")
            rec["unit_cost"]        = round(float(rng.uniform(6_00_000, 18_00_000)), 2)
            sanctioned              = round(rec["unit_cost"] * rng.uniform(12, 28), 2)
            rec["sanctioned_amt"]   = sanctioned
            overrun_pct             = round(float(rng.uniform(18.0, 42.0)), 1)
            overrun_amt             = round(sanctioned * (overrun_pct / 100.0), 2)
            rec["cost_overrun_amt"] = overrun_amt
            rec["cost_overrun_pct"] = overrun_pct
            rec["expenditure_amt"]  = round(sanctioned + overrun_amt, 2)
            rec["utilised_amt"]     = rec["expenditure_amt"]
            rec["financial_progress_pct"] = round((rec["utilised_amt"] / sanctioned) * 100.0, 1)
            # Invoice rates inflated
            rec["cement_rate"]      = round(float(rng.uniform(450, 550)), 0)
            rec["steel_rate"]       = round(float(rng.uniform(90, 120)), 0)
            rec["milestone_stage"]  = "Completed"
            rec["status"]           = "Completed"
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Anomaly Archetype 4: Concentrated Contractor Pattern
    # A single contractor dominating all projects in a small radius.
    # May indicate healthy local capacity, or may warrant transparency
    # review of tender allocation processes.
    # ------------------------------------------------------------------
    def _inject_concentrated_contractor(self, n: int) -> None:
        shell_company = "Infinity Infra Consultants Pvt Ltd"
        mp_data       = self._pick_mp("Uttar Pradesh")
        base_state    = "Uttar Pradesh"
        base_district = "Lucknow"
        base_lat, base_lon = DISTRICT_COORDS["Lucknow"]

        for _ in range(n):
            rec = self._base_record("concentrated_contractor")
            rec["contractor"]    = shell_company
            rec["mp_name"]       = mp_data["mp_name"]
            rec["constituency"]  = mp_data.get("constituency", f"{base_district} Central")
            rec["state"]         = base_state
            rec["district"]      = base_district
            rec["site_lat"]      = round(base_lat + rng.uniform(-0.04, 0.04), 6)
            rec["site_lon"]      = round(base_lon + rng.uniform(-0.04, 0.04), 6)
            rec["lat"]           = rec["site_lat"]
            rec["lon"]           = rec["site_lon"]
            rec["photo_lat"]     = round(rec["site_lat"] + rng.uniform(-0.001, 0.001), 6)
            rec["photo_lon"]     = round(rec["site_lon"] + rng.uniform(-0.001, 0.001), 6)
            rec["sanctioned_amt"]= round(float(rng.uniform(60_00_000, 1_40_00_000)), 2)
            rec["utilised_amt"]  = round(rec["sanctioned_amt"] * rng.uniform(0.93, 0.99), 2)
            rec["financial_progress_pct"] = round((rec["utilised_amt"] / rec["sanctioned_amt"]) * 100.0, 1)
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Anomaly Archetype 5: Critical Timeline Delay / Stalled Works
    # ------------------------------------------------------------------
    def _inject_timeline_delay(self, n: int) -> None:
        for _ in range(n):
            rec = self._base_record("timeline_delay")
            rec["milestone_stage"]       = random.choice(["Tender Awarded", "Work In Progress"])
            rec["status"]                = "In Progress"
            rec["days_delayed"]          = random.randint(160, 420)
            rec["delay_status"]          = "Stalled" if rec["days_delayed"] > 240 else "Significant Delay"
            rec["physical_progress_pct"] = round(float(rng.uniform(10.0, 35.0)), 1)
            rec["released_amt"]          = round(rec["sanctioned_amt"] * 0.70, 2)
            rec["utilised_amt"]          = round(rec["sanctioned_amt"] * 0.40, 2)
            rec["financial_progress_pct"]= round((rec["utilised_amt"] / rec["sanctioned_amt"]) * 100.0, 1)
            rec["progress_discrepancy"]  = round(rec["financial_progress_pct"] - rec["physical_progress_pct"], 1)
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Anomaly Archetype 6: Geospatial Evidence Mismatch
    # Photo GPS coordinates differ significantly from the registered
    # project site. Could be a GPS calibration issue, construction
    # staging area, or warrants on-site verification.
    # ------------------------------------------------------------------
    def _inject_geo_evidence_mismatch(self, n: int) -> None:
        for _ in range(n):
            rec = self._base_record("geo_evidence_mismatch")
            # Set photo location >200m from site
            offset_lat = rng.uniform(0.002, 0.006) * random.choice([-1, 1])
            offset_lon = rng.uniform(0.002, 0.006) * random.choice([-1, 1])
            rec["photo_lat"] = round(rec["site_lat"] + offset_lat, 6)
            rec["photo_lon"] = round(rec["site_lon"] + offset_lon, 6)
            rec["geo_distance_m"] = round(
                ((offset_lat)**2 + (offset_lon)**2)**0.5 * 111000, 1
            )
            rec["milestone_stage"] = "Work In Progress"
            rec["status"] = "In Progress"
            self._records.append(rec)

    # ------------------------------------------------------------------
    # Flagship Demo: Community Water Tank in Village X, Amravati
    # ------------------------------------------------------------------
    def _inject_flagship_water_tank(self) -> None:
        """Pre-seed the showcase scenario from the M-TRACE blueprint.

        Community Water Tank, Village X, Amravati District, Maharashtra.
        Sanctioned: ₹50L | Expenditure: ₹37L | Physical: 48% | Financial: 74%
        GPS mismatch 240m | Cement rate outlier | Risk Score: ~78-84/100
        """
        amr_lat, amr_lon = DISTRICT_COORDS["Amravati"]
        site_lat = round(amr_lat + 0.042, 6)
        site_lon = round(amr_lon - 0.031, 6)

        mp_data = self._pick_mp("Maharashtra", "Amravati")

        rec = {
            "project_id":             "MPLADS-MH-AMR-2026-00452",
            "mp_name":                mp_data["mp_name"],
            "constituency":           mp_data.get("constituency", "Amravati"),
            "state":                  "Maharashtra",
            "district":               "Amravati",
            "contractor":             "Sahara Builder Corp",
            "work_type":              "Community Water Tank",
            "work_description":       "Construction of Community Drinking Water Storage Tank at Village Takli, Amravati",
            "milestone_stage":        "Work In Progress",
            "status":                 "In Progress",
            "recommended_date":       "2025-06-15",
            "sanctioned_date":        "2025-07-20",
            "target_completion_date": "2026-04-30",
            "actual_completion_date": None,
            "financial_year":         "2025-26",
            "sanctioned_amt":         5000000.0,   # ₹50 Lakhs
            "released_amt":           4500000.0,
            "expenditure_amt":        3700000.0,   # ₹37 Lakhs
            "utilised_amt":           3700000.0,
            "cost_overrun_amt":       0.0,
            "unit_cost":              416667.0,

            # Registered site location
            "site_lat":               site_lat,
            "site_lon":               site_lon,
            # Evidence photo captured 240m away from registered site
            "photo_lat":              round(site_lat + 0.00216, 6),
            "photo_lon":              round(site_lon + 0.00045, 6),
            "geo_distance_m":         240.0,
            "lat":                    site_lat,
            "lon":                    site_lon,

            # Invoice rates — cement rate is an outlier
            "cement_rate":            480.0,   # vs benchmark 380
            "steel_rate":             74.0,
            "labour_rate":            620.0,

            # Derived data
            "days_delayed":           45,
            "delay_status":           "Minor Delay",
            "cost_overrun_pct":       0.0,
            "physical_progress_pct":  48.0,
            "financial_progress_pct": 74.0,
            "progress_discrepancy":   26.0,

            "anomaly_type":           "flagship_demo",
        }
        self._records.append(rec)

        # Pre-seed a verification case for this project
        self._cases.append({
            "case_id":         "CASE-MH-AMR-001",
            "project_id":      "MPLADS-MH-AMR-2026-00452",
            "status":          "Under Review",
            "opened_date":     "2026-08-15",
            "opened_by":       "District Collector, Amravati",
            "role":            "District Authority",
            "alert_type":      "Multiple Anomalies Detected",
            "summary":         "AI detected progress-expenditure divergence (48% physical vs 74% financial), "
                               "geofence deviation (240m from registered site), and cement rate outlier "
                               "(₹480/bag vs ₹380/bag regional benchmark). Verification recommended.",
            "assigned_officer": "Shri R.K. Deshmukh, Technical Assistant",
            "evidence_notes":  [],
            "resolution":      None,
            "last_updated":    "2026-09-01",
        })

        self._audit_trail.extend([
            {
                "timestamp":   "2026-08-15T10:30:00+05:30",
                "user":        "M-TRACE AI Engine",
                "role":        "System",
                "project_id":  "MPLADS-MH-AMR-2026-00452",
                "action":      "Anomaly Alert Generated",
                "details":     "Multi-factor risk score 78/100 — Progress-expenditure divergence, geofence mismatch, invoice rate outlier detected.",
                "rationale":   "Automated detection by AI anomaly engine. Requires human verification.",
            },
            {
                "timestamp":   "2026-08-15T14:15:00+05:30",
                "user":        "Shri A.P. Kulkarni, District Collector",
                "role":        "District Authority",
                "project_id":  "MPLADS-MH-AMR-2026-00452",
                "action":      "Verification Case Opened",
                "details":     "Case CASE-MH-AMR-001 opened for review. Assigned to Technical Assistant for field inspection.",
                "rationale":   "Administrative review initiated per MPLADS monitoring guidelines.",
            },
            {
                "timestamp":   "2026-09-01T09:00:00+05:30",
                "user":        "Shri R.K. Deshmukh, Technical Assistant",
                "role":        "Inspecting Officer",
                "project_id":  "MPLADS-MH-AMR-2026-00452",
                "action":      "Field Inspection Scheduled",
                "details":     "On-site physical verification scheduled for September 5, 2026. Checklist: Verify BOQ, photograph progress, measure tank dimensions, check cement inventory.",
                "rationale":   "Standard operating procedure for projects with risk score > 70.",
            },
        ])

    # ------------------------------------------------------------------
    # Seed verification cases for demo
    # ------------------------------------------------------------------
    def _generate_seed_cases(self, df: pd.DataFrame) -> None:
        """Generate a few additional seed verification cases for the demo."""
        # Add a resolved case example
        if len(df) > 10:
            resolved_project = df.iloc[5]
            self._cases.append({
                "case_id":         "CASE-UP-LKN-002",
                "project_id":      resolved_project["project_id"],
                "status":          "Resolved - Legitimate",
                "opened_date":     "2026-06-10",
                "opened_by":       "State Nodal Officer, Uttar Pradesh",
                "role":            "State Nodal Authority",
                "alert_type":      "Cost Outlier Detected",
                "summary":         "Unit cost exceeded regional benchmark by 22%. Field verification conducted.",
                "assigned_officer": "Smt. Priya Mishra, Assistant Engineer",
                "evidence_notes":  [
                    "2026-06-15: Site inspection completed. Foundation required hard rock excavation.",
                    "2026-06-20: Contractor submitted revised soil survey report confirming rocky strata.",
                    "2026-06-25: BOQ verified against revised estimates. Cost variance justified.",
                ],
                "resolution":      "Legitimate Operational Justification — Foundation work encountered hard rock layer "
                                   "requiring reinforced blasting. Cost variance of 22% is within acceptable limits "
                                   "given the geological conditions. No corrective action required.",
                "last_updated":    "2026-06-28",
            })

            self._audit_trail.extend([
                {
                    "timestamp":  "2026-06-28T16:30:00+05:30",
                    "user":       "Smt. Priya Mishra, Assistant Engineer",
                    "role":       "Inspecting Officer",
                    "project_id": resolved_project["project_id"],
                    "action":     "Case Resolved - Legitimate",
                    "details":    "Cost variance justified by geological conditions. Hard rock excavation confirmed.",
                    "rationale":  "On-site inspection and soil survey report validated the cost deviation.",
                },
            ])


if __name__ == "__main__":
    engine = MPLADSDataEngine()
    df = engine.generate()
    print(f"Generated {len(df)} records")
    print(df["anomaly_type"].value_counts())
    print("Columns:", df.columns.tolist())
    print(f"\nVerification Cases: {len(engine.cases)}")
    print(f"Audit Trail Entries: {len(engine.audit_trail)}")

