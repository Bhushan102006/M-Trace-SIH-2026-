import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=" * 65)
print("M-TRACE ROLE-BASED ACCESS CONTROL (RBAC) COMPREHENSIVE SUITE")
print("=" * 65)

# 1. Health
print("\n[1] Health Check")
res = client.get("/health").json()
print(f"  Platform: {res.get('platform')}")
print(f"  Principle: {res.get('principle')}")
print(f"  Records: {res.get('records')}")
assert res.get('status') == 'ok'

# 2. MoSPI National Overview
print("\n[2] MoSPI Apex National Authority (All-India Scope)")
s = client.get("/api/stats?role=mospi").json()
c = client.get("/api/cases?role=mospi").json()
a = client.get("/api/audit-trail?role=mospi").json()
print(f"  Total Projects visible: {s.get('total_projects')} (Expected 801)")
print(f"  Verification Cases: {len(c)}")
print(f"  Audit Trail Log Entries: {a.get('count')}")
assert s.get('total_projects') == 801, "MoSPI should see all 801 projects"

# 3. State Nodal Authority (Maharashtra)
print("\n[3] State Nodal Authority (State Scope: Maharashtra)")
s = client.get("/api/stats?role=state&role_value=Maharashtra").json()
c = client.get("/api/cases?role=state&role_value=Maharashtra").json()
a = client.get("/api/audit-trail?role=state&role_value=Maharashtra").json()
p = client.get("/api/projects?role=state&role_value=Maharashtra").json()
print(f"  Projects visible: {s.get('total_projects')} / 801")
print(f"  Verification Cases in state: {len(c)}")
print(f"  Audit Trail Logs in state: {a.get('count')}")
assert 0 < s.get('total_projects') < 801, "State should see only state projects"

# 4. District Authority (Amravati, Maharashtra)
print("\n[4] District Authority / DM (District Scope: Amravati)")
s = client.get("/api/stats?role=district&role_value=Amravati").json()
c = client.get("/api/cases?role=district&role_value=Amravati").json()
a = client.get("/api/audit-trail?role=district&role_value=Amravati").json()
print(f"  Projects visible: {s.get('total_projects')} / 801")
print(f"  Verification Cases in district: {len(c)}")
print(f"  Audit Trail Logs in district: {a.get('count')}")
assert 0 < s.get('total_projects') < 801, "District should see only district projects"

# 5. Hon'ble MP (Wankhade)
print("\n[5] Member of Parliament (Hon'ble MP: Wankhade)")
s = client.get("/api/stats?role=mp&role_value=Wankhade").json()
m = client.get("/api/mp-summary?role=mp&role_value=Wankhade").json()
a = client.get("/api/audit-trail?role=mp&role_value=Wankhade").json()
print(f"  Projects visible: {s.get('total_projects')}")
print(f"  MP Summary records: {len(m)}")
print(f"  Audit Trail Access: {a.get('notice', 'Granted')}")
assert a.get('notice') is not None, "MP must NOT have access to internal administrative audit logs"

# 6. Implementing Agency (Sahara)
print("\n[6] Implementing Agency (Agency Scope: Sahara)")
s = client.get("/api/stats?role=agency&role_value=Sahara").json()
a = client.get("/api/audit-trail?role=agency&role_value=Sahara").json()
print(f"  Projects visible: {s.get('total_projects')}")
print(f"  Audit Trail Access: {a.get('notice', 'Granted')}")
assert a.get('notice') is not None, "Agency must NOT have access to internal administrative audit logs"

# 7. Contractor (Sahara Builder Corp)
print("\n[7] Contractor Vendor Portal (Contractor Scope: Sahara Builder Corp)")
s = client.get("/api/stats?role=contractor&role_value=Sahara%20Builder%20Corp").json()
a = client.get("/api/audit-trail?role=contractor&role_value=Sahara%20Builder%20Corp").json()
print(f"  Projects visible: {s.get('total_projects')}")
print(f"  Audit Trail Access: {a.get('notice', 'Granted')}")
assert a.get('notice') is not None, "Contractor must NOT have access to internal administrative audit logs"

# 8. Security Guard: Adjudication RBAC Enforcement
print("\n[8] Security Guard: Case Adjudication Authorization")
all_cases = client.get("/api/cases?role=mospi").json()
case_list = all_cases.get("cases", [])
if case_list:
    case_id = case_list[0]["case_id"]
    # Contractor attempt (MUST BE FORBIDDEN)
    c_res = client.post(f"/api/cases/{case_id}/review", json={
        "action": "resolve",
        "notes": "Contractor illegal self-clearance attempt",
        "resolution": "Legitimate",
        "role": "contractor",
    }).json()
    print(f"  Contractor adjudication attempt -> Status: {c_res.get('status')}")
    print(f"    Message: {c_res.get('error')}")
    assert c_res.get("status") == "forbidden", "Contractor adjudication must be FORBIDDEN"

    # District DM attempt (MUST BE AUTHORIZED)
    d_res = client.post(f"/api/cases/{case_id}/review", json={
        "action": "schedule_inspection",
        "notes": "District Collector ordered physical verification by Executive Engineer",
        "officer": "District Collector, Amravati",
        "role": "district",
    }).json()
    print(f"  District DM adjudication attempt -> Status: {d_res.get('status')}")
    print(f"    Updated Case Status: {d_res.get('case', {}).get('status')}")
    assert d_res.get("status") == "updated", "District authority must be AUTHORIZED to adjudicate"

print("\n" + "=" * 65)
print("ALL RBAC SECURITY & GOVERNANCE TESTS PASSED (100% SUCCESS) ✓")
print("=" * 65)
