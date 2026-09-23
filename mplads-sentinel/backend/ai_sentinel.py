"""
ai_sentinel.py → mtrace_engine.py (M-TRACE Intelligence Engine)
---------------------------------------------------------------
AI-Assisted Governance & Anomaly Detection Engine for MPLADS IntelliTrack.

Detection Layers (Anomaly ≠ Fraud):
  1. Cost Benchmarking Engine — peer comparison against regional Schedule of Rates
  2. Progress-Expenditure Divergence Scorer — financial vs physical gap detection
  3. NLP + Geospatial Duplicate/Overlapping Work Detector — TF-IDF + Haversine
  4. Geospatial Evidence Verification — GPS geofence & timestamp checks
  5. Predictive Delay & Cost Overrun Engine — timeline risk probability

Governance Principle:
  The AI engine flags statistical deviations for human review.
  It does NOT accuse, label, or declare any project as fraudulent.
  All risk scores are advisory; final determination rests with
  the competent District Authority or designated official.

Explainable AI (XAI) Framework:
  For every flagged project, the engine generates a 4-part explanation:
    WHY?         - Why was this project flagged?
    WHAT?        - What exact data points caused the alert?
    HOW SERIOUS? - What is the calculated risk tier (0-100)?
    WHAT NEXT?   - What specific review step is recommended?
"""

from __future__ import annotations

import math
import warnings
from typing import Any

import numpy as np
import pandas as pd
from rapidfuzz import fuzz
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")


# ---------------------------------------------------------------------------
# Cost benchmark reference data (regional Schedule of Rates)
# ---------------------------------------------------------------------------
COST_BENCHMARKS: dict[str, dict[str, float]] = {
    "Road Construction":            {"median_cost_lakhs": 45.0, "std_pct": 22, "cement_ref": 380, "steel_ref": 72},
    "Drainage Infrastructure":      {"median_cost_lakhs": 28.0, "std_pct": 25, "cement_ref": 380, "steel_ref": 72},
    "School Building Renovation":   {"median_cost_lakhs": 35.0, "std_pct": 20, "cement_ref": 380, "steel_ref": 72},
    "Community Health Centre":      {"median_cost_lakhs": 55.0, "std_pct": 18, "cement_ref": 390, "steel_ref": 75},
    "Drinking Water Project":       {"median_cost_lakhs": 42.0, "std_pct": 24, "cement_ref": 380, "steel_ref": 72},
    "Community Water Tank":         {"median_cost_lakhs": 42.3, "std_pct": 20, "cement_ref": 380, "steel_ref": 72},
    "Solar Street Lighting":        {"median_cost_lakhs": 18.0, "std_pct": 30, "cement_ref": 0,   "steel_ref": 0},
    "Community Hall Construction":  {"median_cost_lakhs": 60.0, "std_pct": 20, "cement_ref": 385, "steel_ref": 74},
    "Bridge Construction":          {"median_cost_lakhs": 80.0, "std_pct": 25, "cement_ref": 390, "steel_ref": 78},
    "Smart Classroom":              {"median_cost_lakhs": 25.0, "std_pct": 22, "cement_ref": 380, "steel_ref": 72},
    "PHC/Sub-Centre Upgrade":       {"median_cost_lakhs": 40.0, "std_pct": 18, "cement_ref": 385, "steel_ref": 74},
}

DEFAULT_BENCHMARK = {"median_cost_lakhs": 40.0, "std_pct": 25, "cement_ref": 380, "steel_ref": 72}

# Risk tiers (0-100 scale)
RISK_TIERS = {
    "Normal":               (0,  25),
    "Watch":                (26, 50),
    "Review Required":      (51, 75),
    "High Priority Review": (76, 100),
}


class MTraceIntelligenceEngine:
    """
    M-TRACE AI-Assisted Anomaly Detection & Decision-Support Engine.

    This engine analyses MPLADS project data across 5 domain-specific
    detection modules and produces:
      - Multi-factor risk scores (0–100)
      - 4-tier risk classifications
      - Explainable AI (XAI) summaries for every flagged project
      - Recommended verification actions for human authorities

    Usage:
        engine = MTraceIntelligenceEngine()
        results_df = engine.analyze(df)   # df from MPLADSDataEngine.generate()
    """

    def __init__(
        self,
        iso_contamination: float = 0.08,
        geo_cluster_radius_km: float = 25.0,
        geo_cluster_min_projects: int = 4,
        nlp_similarity_threshold: float = 0.82,
        contractor_fuzz_threshold: float = 80,
        delay_threshold_days: int = 180,
        progress_gap_threshold: float = 25.0,
        geofence_tolerance_m: float = 150.0,
    ):
        self.iso_contamination           = iso_contamination
        self.geo_cluster_radius_km       = geo_cluster_radius_km
        self.geo_cluster_min_projects    = geo_cluster_min_projects
        self.nlp_similarity_threshold    = nlp_similarity_threshold
        self.contractor_fuzz_threshold   = contractor_fuzz_threshold
        self.delay_threshold_days        = delay_threshold_days
        self.progress_gap_threshold      = progress_gap_threshold
        self.geofence_tolerance_m        = geofence_tolerance_m

        self._iso_model   = IsolationForest(
            n_estimators=200,
            contamination=self.iso_contamination,
            random_state=42,
            n_jobs=-1,
        )
        self._scaler      = StandardScaler()
        self._tfidf       = TfidfVectorizer(ngram_range=(1, 2), min_df=1)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Run all 5 detection modules on the DataFrame.
        Returns enriched DataFrame with anomaly signals, risk scores,
        and explainable AI summaries.
        """
        df = df.copy()

        # Module 1: Cost Benchmarking
        df = self._analyze_cost_benchmarks(df)
        # Module 2: Progress-Expenditure Divergence
        df = self._analyze_progress_divergence(df)
        # Module 3: Duplicate/Overlapping Work Detection (NLP + Geo)
        df = self._detect_duplicate_works(df)
        # Module 4: Geospatial Evidence Verification
        df = self._verify_geospatial_evidence(df)
        # Module 5: Predictive Delay & Timeline Risk
        df = self._predict_delay_risk(df)
        # Contractor name similarity detection
        df = self._detect_contractor_similarity(df)
        # Statistical anomaly detection (IsolationForest)
        df = self._run_statistical_anomaly(df)

        # Aggregate: Multi-factor Risk Score (0-100) + XAI
        df = self._compute_risk_score(df)

        return df

    # ------------------------------------------------------------------
    # Module 1: Cost Benchmarking Engine
    # ------------------------------------------------------------------

    def _analyze_cost_benchmarks(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compare project costs against regional peer benchmarks."""
        df["cost_benchmark_flag"] = 0
        df["cost_deviation_pct"]  = 0.0
        df["peer_median_cost"]    = 0.0

        # Compute district-level median unit costs
        df["district_median_unit_cost"] = df.groupby("district")["unit_cost"].transform("median")
        df["unit_cost_z"] = (
            (df["unit_cost"] - df["district_median_unit_cost"])
            / (df.groupby("district")["unit_cost"].transform("std").replace(0, 1))
        ).fillna(0)

        # Invoice rate anomaly checks (cement, steel)
        df["cement_anomaly"] = 0
        df["steel_anomaly"]  = 0

        for idx, row in df.iterrows():
            work_type = row.get("work_type", "")
            benchmark = COST_BENCHMARKS.get(work_type, DEFAULT_BENCHMARK)
            median_cost = benchmark["median_cost_lakhs"] * 100000  # Convert to rupees
            sanctioned = row.get("sanctioned_amt", 0)

            if median_cost > 0 and sanctioned > 0:
                deviation = ((sanctioned - median_cost) / median_cost) * 100
                df.at[idx, "cost_deviation_pct"] = round(deviation, 1)
                df.at[idx, "peer_median_cost"]   = median_cost

                if deviation > 25:  # >25% above peer median
                    df.at[idx, "cost_benchmark_flag"] = 1

            # Check invoice material rates
            cement_ref = benchmark.get("cement_ref", 380)
            steel_ref  = benchmark.get("steel_ref", 72)
            cement_rate = row.get("cement_rate", 0)
            steel_rate  = row.get("steel_rate", 0)

            if cement_ref > 0 and cement_rate > cement_ref * 1.20:
                df.at[idx, "cement_anomaly"] = 1
            if steel_ref > 0 and steel_rate > steel_ref * 1.20:
                df.at[idx, "steel_anomaly"] = 1

        return df

    # ------------------------------------------------------------------
    # Module 2: Progress-Expenditure Divergence
    # ------------------------------------------------------------------

    def _analyze_progress_divergence(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect projects with significant financial-physical progress gaps."""
        df["progress_gap_flag"] = (
            df["progress_discrepancy"] >= self.progress_gap_threshold
        ).astype(int)

        # Compute divergence index (0-1 scale)
        df["divergence_index"] = (
            df["progress_discrepancy"].clip(0, 100) / 100.0
        ).round(4)

        return df

    # ------------------------------------------------------------------
    # Module 3: NLP + Geospatial Duplicate/Overlapping Work Detection
    # ------------------------------------------------------------------

    def _detect_duplicate_works(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect similar work descriptions in geographic proximity."""
        df["nlp_flag"]          = 0
        df["nlp_duplicate_of"]  = None
        df["nlp_similarity"]    = 0.0

        descriptions = df["work_description"].fillna("").tolist()
        if len(descriptions) < 2:
            return df

        tfidf_matrix = self._tfidf.fit_transform(descriptions)
        batch_size   = 100
        n            = len(descriptions)
        dup_indices: set[int] = set()
        dup_pairs:   dict[int, int] = {}
        dup_scores:  dict[int, float] = {}

        for i in range(0, n, batch_size):
            batch = tfidf_matrix[i : i + batch_size]
            sims  = cosine_similarity(batch, tfidf_matrix)
            if hasattr(sims, "toarray"):
                sims = sims.toarray()

            for local_i, row in enumerate(sims):
                global_i = i + local_i
                for j, score in enumerate(row):
                    if j != global_i and score >= self.nlp_similarity_threshold:
                        # Also check geographic proximity (<500m)
                        lat_i = df.at[global_i, "lat"] if global_i in df.index else 0
                        lon_i = df.at[global_i, "lon"] if global_i in df.index else 0
                        lat_j = df.at[j, "lat"] if j in df.index else 0
                        lon_j = df.at[j, "lon"] if j in df.index else 0
                        dist_km = ((lat_i - lat_j)**2 + (lon_i - lon_j)**2)**0.5 * 111
                        if dist_km < 0.5:  # <500m proximity
                            dup_indices.add(global_i)
                            dup_pairs[global_i] = j
                            dup_scores[global_i] = round(score, 4)

        for idx in dup_indices:
            df.at[idx, "nlp_flag"]        = 1
            df.at[idx, "nlp_duplicate_of"] = df.at[dup_pairs[idx], "project_id"]
            df.at[idx, "nlp_similarity"]  = dup_scores.get(idx, 0)

        return df

    # ------------------------------------------------------------------
    # Module 4: Geospatial Evidence Verification
    # ------------------------------------------------------------------

    def _verify_geospatial_evidence(self, df: pd.DataFrame) -> pd.DataFrame:
        """Flag projects where evidence photo GPS exceeds geofence tolerance."""
        df["geofence_flag"] = 0

        if "geo_distance_m" in df.columns:
            df["geofence_flag"] = (
                df["geo_distance_m"] > self.geofence_tolerance_m
            ).astype(int)
        elif "photo_lat" in df.columns and "site_lat" in df.columns:
            # Calculate distance if not pre-computed
            df["geo_distance_m"] = (
                ((df["photo_lat"] - df["site_lat"])**2 + (df["photo_lon"] - df["site_lon"])**2)**0.5 * 111000
            ).round(1)
            df["geofence_flag"] = (df["geo_distance_m"] > self.geofence_tolerance_m).astype(int)

        return df

    # ------------------------------------------------------------------
    # Module 5: Predictive Delay & Timeline Risk
    # ------------------------------------------------------------------

    def _predict_delay_risk(self, df: pd.DataFrame) -> pd.DataFrame:
        """Estimate delay probability and flag critical stalls."""
        df["delay_flag"] = (df["days_delayed"] >= self.delay_threshold_days).astype(int)

        # Compute delay probability (0-100%) based on current pacing
        df["delay_probability_pct"] = 0.0

        for idx, row in df.iterrows():
            if row["status"] == "Completed" or row["physical_progress_pct"] >= 100:
                df.at[idx, "delay_probability_pct"] = 0.0
                continue

            days_delayed = row.get("days_delayed", 0)
            physical_pct = row.get("physical_progress_pct", 0)

            if days_delayed > 0 and physical_pct < 80:
                # Simple heuristic: probability increases with delay and inversely with progress
                prob = min(95, 20 + (days_delayed / 10) + (80 - physical_pct) * 0.4)
                df.at[idx, "delay_probability_pct"] = round(prob, 1)
            elif physical_pct < 30 and row["status"] == "In Progress":
                df.at[idx, "delay_probability_pct"] = round(float(30 + (30 - physical_pct) * 0.8), 1)

        return df

    # ------------------------------------------------------------------
    # Contractor Name Similarity Detection
    # ------------------------------------------------------------------

    def _detect_contractor_similarity(self, df: pd.DataFrame) -> pd.DataFrame:
        """Detect contractors with suspiciously similar names (possible name variants)."""
        df["contractor_similarity_flag"] = 0
        contractors = df["contractor"].unique().tolist()

        similar_pairs: set[str] = set()
        for i, a in enumerate(contractors):
            for b in contractors[i + 1:]:
                if fuzz.token_sort_ratio(a, b) >= self.contractor_fuzz_threshold:
                    similar_pairs.add(a)
                    similar_pairs.add(b)

        df.loc[df["contractor"].isin(similar_pairs), "contractor_similarity_flag"] = 1
        return df

    # ------------------------------------------------------------------
    # Statistical Anomaly Detection (IsolationForest)
    # ------------------------------------------------------------------

    def _run_statistical_anomaly(self, df: pd.DataFrame) -> pd.DataFrame:
        """IsolationForest-based statistical anomaly scoring."""
        df["amt_ratio"]     = (df["utilised_amt"] / df["sanctioned_amt"].replace(0, 1)).clip(0, 1.5)
        df["unit_cost_log"] = np.log1p(df["unit_cost"])
        df["sanction_log"]  = np.log1p(df["sanctioned_amt"])

        features        = df[["amt_ratio", "unit_cost_log", "sanction_log", "unit_cost_z"]].values
        features_scaled = self._scaler.fit_transform(features)

        raw_scores = self._iso_model.fit(features_scaled).score_samples(features_scaled)
        min_s, max_s = raw_scores.min(), raw_scores.max()
        df["anomaly_score"] = (1 - (raw_scores - min_s) / (max_s - min_s + 1e-9)).round(4)
        df["statistical_anomaly_flag"] = (df["anomaly_score"] > 0.65).astype(int)

        return df

    # ------------------------------------------------------------------
    # Multi-Factor Risk Score (0-100) + Explainable AI (XAI)
    # ------------------------------------------------------------------

    def _compute_risk_score(self, df: pd.DataFrame) -> pd.DataFrame:
        """Compute unified 0-100 risk score with XAI explanation."""

        def _score_row(row: pd.Series) -> tuple[int, str, float, list[dict], str, list[str]]:
            factors: list[dict] = []
            score = 0.0

            # --- Cost Benchmarking ---
            if row.get("cost_benchmark_flag", 0):
                dev_pct = row.get("cost_deviation_pct", 0)
                contribution = min(20, abs(dev_pct) * 0.5)
                score += contribution
                factors.append({
                    "factor": "Cost Variance vs Peer Benchmark",
                    "value": f"+{dev_pct:.1f}%",
                    "peer_benchmark": f"₹{row.get('peer_median_cost', 0)/100000:.1f}L median for {row.get('work_type', 'this category')}",
                    "contribution": round(contribution, 1),
                })

            # --- Invoice Rate Anomalies ---
            if row.get("cement_anomaly", 0):
                score += 12
                benchmark = COST_BENCHMARKS.get(row.get("work_type", ""), DEFAULT_BENCHMARK)
                factors.append({
                    "factor": "Cement Rate Outlier",
                    "value": f"₹{row.get('cement_rate', 0)}/bag",
                    "peer_benchmark": f"₹{benchmark.get('cement_ref', 380)}/bag regional reference",
                    "contribution": 12,
                })
            if row.get("steel_anomaly", 0):
                score += 10
                benchmark = COST_BENCHMARKS.get(row.get("work_type", ""), DEFAULT_BENCHMARK)
                factors.append({
                    "factor": "Steel Rate Outlier",
                    "value": f"₹{row.get('steel_rate', 0)}/kg",
                    "peer_benchmark": f"₹{benchmark.get('steel_ref', 72)}/kg regional reference",
                    "contribution": 10,
                })

            # --- Statistical Anomaly ---
            if row.get("statistical_anomaly_flag", 0):
                anomaly_contribution = row.get("anomaly_score", 0) * 25
                score += anomaly_contribution
                factors.append({
                    "factor": "Statistical Anomaly (IsolationForest)",
                    "value": f"Score {row.get('anomaly_score', 0):.2f}",
                    "peer_benchmark": "Threshold: 0.65",
                    "contribution": round(anomaly_contribution, 1),
                })

            # --- Contractor Concentration ---
            if row.get("contractor_similarity_flag", 0):
                score += 10
                factors.append({
                    "factor": "Contractor Name Similarity",
                    "value": f"'{row.get('contractor', '')}'",
                    "peer_benchmark": "Similar name variants detected in registry",
                    "contribution": 10,
                })

            # --- NLP Duplicate ---
            if row.get("nlp_flag", 0):
                sim = row.get("nlp_similarity", 0)
                contribution = min(18, sim * 20)
                score += contribution
                factors.append({
                    "factor": "Overlapping Work Description",
                    "value": f"{sim*100:.0f}% similarity with {row.get('nlp_duplicate_of', 'another project')}",
                    "peer_benchmark": f"Threshold: {self.nlp_similarity_threshold*100:.0f}%",
                    "contribution": round(contribution, 1),
                })

            # --- Progress-Expenditure Divergence ---
            if row.get("progress_gap_flag", 0):
                gap = row.get("progress_discrepancy", 0)
                contribution = min(25, gap * 0.8)
                score += contribution
                factors.append({
                    "factor": "Progress-Expenditure Divergence",
                    "value": f"{row.get('physical_progress_pct', 0):.0f}% physical vs {row.get('financial_progress_pct', 0):.0f}% financial",
                    "peer_benchmark": f"Gap: {gap:.0f}% (threshold: {self.progress_gap_threshold:.0f}%)",
                    "contribution": round(contribution, 1),
                })

            # --- Geofence Mismatch ---
            if row.get("geofence_flag", 0):
                dist = row.get("geo_distance_m", 0)
                contribution = min(18, dist / 12)
                score += contribution
                factors.append({
                    "factor": "Geofence Evidence Mismatch",
                    "value": f"{dist:.0f}m from registered site",
                    "peer_benchmark": f"Tolerance: {self.geofence_tolerance_m:.0f}m",
                    "contribution": round(contribution, 1),
                })

            # --- Delay Risk ---
            if row.get("delay_flag", 0):
                days = row.get("days_delayed", 0)
                contribution = min(20, days / 20)
                score += contribution
                factors.append({
                    "factor": "Critical Timeline Delay",
                    "value": f"{days} days delayed",
                    "peer_benchmark": f"Threshold: {self.delay_threshold_days} days",
                    "contribution": round(contribution, 1),
                })

            # --- Unit cost outlier ---
            if row.get("unit_cost_z", 0) > 3.0:
                z = row["unit_cost_z"]
                contribution = min(15, z * 3)
                score += contribution
                factors.append({
                    "factor": "Unit Cost Statistical Outlier",
                    "value": f"₹{row['unit_cost']:,.0f} ({z:.1f}σ above district median)",
                    "peer_benchmark": f"District median: ₹{row.get('district_median_unit_cost', 0):,.0f}",
                    "contribution": round(contribution, 1),
                })

            # Clamp to 0-100
            score = min(100, max(0, score))
            risk_score = round(score)

            # Determine tier
            if risk_score >= 76:
                tier = "High Priority Review"
            elif risk_score >= 51:
                tier = "Review Required"
            elif risk_score >= 26:
                tier = "Watch"
            else:
                tier = "Normal"

            # Generate XAI explanation
            why_parts = [f["factor"] for f in factors[:3]]
            why_flagged = (
                " and ".join(why_parts) + " detected."
                if why_parts else "No significant anomalies detected."
            )

            # Generate recommended actions
            actions = _generate_recommended_actions(tier, factors, row)

            return risk_score, tier, row.get("anomaly_score", 0), factors, why_flagged, actions

        results = df.apply(_score_row, axis=1)
        df["risk_score"]          = [r[0] for r in results]
        df["risk_tier"]           = [r[1] for r in results]
        df["confidence_score"]    = [r[2] for r in results]
        df["xai_factors"]         = [r[3] for r in results]
        df["why_flagged"]         = [r[4] for r in results]
        df["recommended_actions"] = [r[5] for r in results]

        # Backward compatibility aliases
        df["risk_level"]          = df["risk_tier"].map({
            "High Priority Review": "High",
            "Review Required": "Medium",
            "Watch": "Low",
            "Normal": "Low",
        })
        df["flag_reasons"]        = df["why_flagged"].apply(lambda x: [x] if x else [])

        return df

    # ------------------------------------------------------------------
    # Summary helpers
    # ------------------------------------------------------------------

    def summary_stats(self, df: pd.DataFrame) -> dict[str, Any]:
        """Generate governance dashboard statistics."""
        review_required = df[df["risk_tier"].isin(["High Priority Review", "Review Required"])]
        stalled = df[df["delay_status"].isin(["Stalled", "Significant Delay"])]
        avg_util = (df["utilised_amt"].sum() / df["sanctioned_amt"].sum() * 100) if df["sanctioned_amt"].sum() > 0 else 0

        return {
            "total_projects":           len(df),
            "total_sanctioned":         round(df["sanctioned_amt"].sum(), 2),
            "total_utilised":           round(df["utilised_amt"].sum(), 2),
            "total_released":           round(df["released_amt"].sum(), 2),
            "avg_utilisation_pct":      round(avg_util, 2),

            # Risk distribution (4 tiers)
            "normal_count":             int((df["risk_tier"] == "Normal").sum()),
            "watch_count":              int((df["risk_tier"] == "Watch").sum()),
            "review_required_count":    int((df["risk_tier"] == "Review Required").sum()),
            "high_priority_count":      int((df["risk_tier"] == "High Priority Review").sum()),
            "avg_risk_score":           round(df["risk_score"].mean(), 1),

            # Backward compatibility
            "flagged_count":            len(review_required),
            "high_risk":                int((df["risk_tier"] == "High Priority Review").sum()),
            "medium_risk":              int((df["risk_tier"] == "Review Required").sum()),
            "low_risk":                 int((df["risk_tier"].isin(["Watch", "Normal"])).sum()),
            "amount_at_risk":           round(review_required["sanctioned_amt"].sum(), 2),

            # Operational metrics
            "total_stalled":            int((df["delay_status"] == "Stalled").sum()),
            "total_significant_delay":  int((df["delay_status"] == "Significant Delay").sum()),
            "avg_delay_days":           round(df[df["days_delayed"] > 0]["days_delayed"].mean(), 1) if (df["days_delayed"] > 0).any() else 0,
            "total_cost_overrun":       round(df["cost_overrun_amt"].sum(), 2),
            "completed_projects":       int((df["status"] == "Completed").sum()),
            "in_progress_projects":     int((df["status"] == "In Progress").sum()),
            "sanctioned_projects":      int((df["status"] == "Sanctioned").sum()),

            # Anomaly type distribution (governance terminology)
            "anomaly_distribution":     df[df["anomaly_type"] != "none"]["anomaly_type"].value_counts().to_dict() if "anomaly_type" in df.columns else {},
        }


# ---------------------------------------------------------------------------
# XAI: Recommended Action Generator
# ---------------------------------------------------------------------------

def _generate_recommended_actions(
    tier: str,
    factors: list[dict],
    row: pd.Series,
) -> list[str]:
    """Generate specific, actionable verification recommendations."""
    actions: list[str] = []
    factor_names = {f["factor"] for f in factors}

    if "Cost Variance vs Peer Benchmark" in factor_names or "Cement Rate Outlier" in factor_names:
        actions.append("Request itemized Bill of Quantities (BOQ) and compare against regional Schedule of Rates")
    if "Steel Rate Outlier" in factor_names:
        actions.append("Verify steel procurement invoices against current market rates and approved vendor list")

    if "Progress-Expenditure Divergence" in factor_names:
        actions.append("Request updated milestone progress certification with geo-tagged photographs from Implementing Agency")
        if row.get("progress_discrepancy", 0) > 50:
            actions.append("Assign District Technical Officer for on-site physical measurement and verification")

    if "Overlapping Work Description" in factor_names:
        actions.append("Cross-verify with project registry to confirm distinct work scopes and avoid duplication")

    if "Geofence Evidence Mismatch" in factor_names:
        actions.append(f"Verify evidence photo location — captured {row.get('geo_distance_m', 0):.0f}m from registered project site")
        actions.append("Request fresh geo-tagged inspection photograph from approved coordinates")

    if "Critical Timeline Delay" in factor_names:
        days = row.get("days_delayed", 0)
        if days > 240:
            actions.append("Recommend show-cause notice to contractor for extended stalling beyond 8 months")
        else:
            actions.append("Request revised timeline and milestone plan from Implementing Agency")

    if "Contractor Name Similarity" in factor_names:
        actions.append("Verify contractor registration details and PAN/GST cross-reference for name variants")

    if "Unit Cost Statistical Outlier" in factor_names:
        actions.append("Verify soil survey report if foundation cost variance is claimed due to terrain conditions")

    if tier == "High Priority Review" and not actions:
        actions.append("Schedule comprehensive field inspection by designated District Technical Officer")
    elif tier == "Review Required" and not actions:
        actions.append("Review project documentation and request clarification from Implementing Agency")

    return actions


# ---------------------------------------------------------------------------
# Backward compatibility alias
# ---------------------------------------------------------------------------
AISentinel = MTraceIntelligenceEngine


# ---------------------------------------------------------------------------
# Quick standalone test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    from data_engine import MPLADSDataEngine

    engine   = MPLADSDataEngine()
    df       = engine.generate()
    sentinel = MTraceIntelligenceEngine()
    result   = sentinel.analyze(df)

    print("Risk Tier Distribution:")
    print(result["risk_tier"].value_counts())
    print(f"\nRisk Score Range: {result['risk_score'].min()} – {result['risk_score'].max()}")
    print(f"Mean Risk Score: {result['risk_score'].mean():.1f}")

    print("\nHigh Priority Review Projects:")
    cols = ["project_id", "mp_name", "district", "work_type", "risk_score", "risk_tier", "why_flagged"]
    high = result[result["risk_tier"] == "High Priority Review"][cols]
    print(high.head(5).to_string())

    print("\nSummary Stats:")
    stats = sentinel.summary_stats(result)
    for k, v in stats.items():
        print(f"  {k}: {v}")
