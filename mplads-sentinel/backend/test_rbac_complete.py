import urllib.request
import json
import time

time.sleep(1)
base = 'http://127.0.0.1:8000'

def get_json(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post_json(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("=" * 60)
print("M-TRACE ROLE-BASED ACCESS CONTROL (RBAC) VERIFICATION")
print("=" * 60)

print("\n1. Health Check:")
health = get_json(f'{base}/health')
print(f"  Status: {health.get('status')}, Records: {health.get('records')}, Principle: {health.get('principle')}")

print("\n2. MoSPI National Scope:")
mospi_stats = get_json(f'{base}/api/stats?role=mospi')
mospi_cases = get_json(f'{base}/api/cases?role=mospi').get('cases', [])
mospi_audit = get_json(f'{base}/api/audit-trail?role=mospi')
print(f"  Projects: {mospi_stats.get('total_projects')}, Cases: {len(mospi_cases)}, Audit logs: {mospi_audit.get('count')}")

print("\n3. State Nodal (Maharashtra) Scope:")
state_stats = get_json(f'{base}/api/stats?role=state&role_value=Maharashtra')
state_cases = get_json(f'{base}/api/cases?role=state&role_value=Maharashtra').get('cases', [])
state_audit = get_json(f'{base}/api/audit-trail?role=state&role_value=Maharashtra')
print(f"  Projects: {state_stats.get('total_projects')}, Cases: {len(state_cases)}, Audit logs: {state_audit.get('count')}")

print("\n4. District Authority (Amravati) Scope:")
dist_stats = get_json(f'{base}/api/stats?role=district&role_value=Amravati')
dist_cases = get_json(f'{base}/api/cases?role=district&role_value=Amravati').get('cases', [])
dist_audit = get_json(f'{base}/api/audit-trail?role=district&role_value=Amravati')
print(f"  Projects: {dist_stats.get('total_projects')}, Cases: {len(dist_cases)}, Audit logs: {dist_audit.get('count')}")

print("\n5. Honble MP (Wankhade) Scope:")
mp_stats = get_json(f'{base}/api/stats?role=mp&role_value=Wankhade')
mp_summary = get_json(f'{base}/api/mp-summary?role=mp&role_value=Wankhade')
mp_audit = get_json(f'{base}/api/audit-trail?role=mp&role_value=Wankhade')
print(f"  Projects: {mp_stats.get('total_projects')}, MP Summary count: {len(mp_summary)}")
print(f"  Audit Access: {mp_audit.get('notice', 'Granted')}")

print("\n6. Contractor (Sahara Builder Corp) Scope:")
c_stats = get_json(f'{base}/api/stats?role=contractor&role_value=Sahara%20Builder%20Corp')
c_cases = get_json(f'{base}/api/cases?role=contractor&role_value=Sahara%20Builder%20Corp').get('cases', [])
c_audit = get_json(f'{base}/api/audit-trail?role=contractor&role_value=Sahara%20Builder%20Corp')
print(f"  Projects: {c_stats.get('total_projects')}, Cases: {len(c_cases)}")
print(f"  Audit Access: {c_audit.get('notice', 'Granted')}")

print("\n7. Security Enforcement: Case Adjudication RBAC:")
if len(mospi_cases) > 0:
    test_case_id = mospi_cases[0]['case_id']
    contractor_attempt = post_json(f'{base}/api/cases/{test_case_id}/review', {
        'action': 'Resolve - Legitimate',
        'notes': 'Contractor unauthorized override attempt',
        'role': 'contractor',
        'role_value': 'Sahara Builder Corp'
    })
    print(f"  Contractor adjudication status: {contractor_attempt.get('status', contractor_attempt.get('error'))}")

    district_attempt = post_json(f'{base}/api/cases/{test_case_id}/review', {
        'action': 'Schedule Field Inspection',
        'notes': 'Authorized District Collector inquiry scheduled',
        'role': 'district',
        'role_value': 'Amravati'
    })
    print(f"  District adjudication status: {district_attempt.get('status')}")
    print(f"  Updated Case status: {district_attempt.get('case', {}).get('status')}")

print("\n" + "=" * 60)
print("ALL RBAC CHECKS COMPLETED")
print("=" * 60)
