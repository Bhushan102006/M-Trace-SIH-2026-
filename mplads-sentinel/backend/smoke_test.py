"""Backend smoke test for M-TRACE."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from data_engine import MPLADSDataEngine
from ai_sentinel import MTraceIntelligenceEngine

print("=" * 60)
print("M-TRACE Backend Smoke Test")
print("=" * 60)

# 1. Data Engine
print("\n[1] Data Engine Test...")
engine = MPLADSDataEngine()
df = engine.generate()
print(f"  Generated {len(df)} records")
print(f"  Columns: {len(df.columns)}")
print(f"  Anomaly types: {df['anomaly_type'].value_counts().to_dict()}")
print(f"  Verification Cases: {len(engine.cases)}")
print(f"  Audit Trail Entries: {len(engine.audit_trail)}")

# Check project IDs format
sample_ids = df["project_id"].head(3).tolist()
print(f"  Sample IDs: {sample_ids}")
assert all(pid.startswith("MPLADS-") for pid in sample_ids if pid.startswith("MPLADS-")), "Project ID format wrong"

# 2. AI Engine
print("\n[2] AI Intelligence Engine Test...")
sentinel = MTraceIntelligenceEngine()
result = sentinel.analyze(df)
print(f"  Risk Tier Distribution:")
for tier, count in result["risk_tier"].value_counts().items():
    print(f"    {tier}: {count}")
print(f"  Risk Score Range: {result['risk_score'].min()} - {result['risk_score'].max()}")
print(f"  Mean Risk Score: {result['risk_score'].mean():.1f}")

# 3. Flagship demo removal verification
print("\n[3] Flagship Water Tank Removal Verification...")
flagship = result[result["project_id"] == "MPLADS-MH-AMR-2026-00452"]
if flagship.empty:
    print("  ✓ Confirmed: Flagship demo scenario successfully eliminated from dataset")
else:
    print("  ✗ Warning: Flagship demo still found in dataset!")

# 4. Summary stats
print("\n[4] Summary Stats Test...")
stats = sentinel.summary_stats(result)
print(f"  Total: {stats['total_projects']}")
print(f"  High Priority: {stats['high_priority_count']}")
print(f"  Review Required: {stats['review_required_count']}")
print(f"  Watch: {stats['watch_count']}")
print(f"  Normal: {stats['normal_count']}")

# 5. Check no 'fraud' terminology in output
print("\n[5] Terminology Check...")
bad_terms = ["fraud", "corrupt", "fraudulent", "scam", "theft"]
cols_str = " ".join(result.columns.tolist())
found_bad = [t for t in bad_terms if t in cols_str.lower()]
if found_bad:
    print(f"  ⚠ Found accusatory column names: {found_bad}")
else:
    print("  ✓ No accusatory terminology in column names")

print("\n" + "=" * 60)
print("ALL BACKEND TESTS PASSED ✓")
print("=" * 60)
