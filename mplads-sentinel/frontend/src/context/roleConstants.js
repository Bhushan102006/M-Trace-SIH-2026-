export const ROLE_DEFINITIONS = {
  mospi: {
    id: 'mospi',
    label: 'MoSPI (National Overview)',
    shortLabel: 'MoSPI National',
    level: 'national',
    icon: '🏛️',
    color: 'indigo',
    description: 'Ministry of Statistics & Programme Implementation — Apex National Oversight & Statutory Policy',
    defaultRoleValue: '',
    jurisdictionLabel: 'All India (543 Constituencies)',
    allowedPages: [
      'dashboard', 'projects', 'anomalies', 'map',
      'fund_flow', 'work_progress', 'analytics', 'mp_report',
      'audit_trail', 'case_management'
    ],
    canTakeCaseAction: false, // National oversight; district authorities adjudicate
    canViewAudit: true,
    canExportReports: true,
  },
  state: {
    id: 'state',
    label: 'State Nodal Authority',
    shortLabel: 'State Nodal',
    level: 'state',
    icon: '🏢',
    color: 'blue',
    description: 'State Planning & Nodal Department — State-wide surveillance, coordination & inter-district reviews',
    defaultRoleValue: 'Maharashtra',
    jurisdictionLabel: 'State: Maharashtra',
    allowedPages: [
      'dashboard', 'projects', 'anomalies', 'map',
      'fund_flow', 'work_progress', 'analytics', 'mp_report',
      'case_management', 'audit_trail'
    ],
    canTakeCaseAction: true,
    canViewAudit: true,
    canExportReports: true,
  },
  district: {
    id: 'district',
    label: 'District Authority / Collector (DM)',
    shortLabel: 'District DM',
    level: 'district',
    icon: '🏗️',
    color: 'emerald',
    description: 'Statutory Administrative Authority — Primary Adjudicator for Inspections, Sanctions & Verifications',
    defaultRoleValue: 'Amravati',
    jurisdictionLabel: 'District: Amravati, Maharashtra',
    allowedPages: [
      'dashboard', 'case_management', 'anomalies', 'projects',
      'work_progress', 'fund_flow', 'map', 'audit_trail'
    ],
    canTakeCaseAction: true, // PRIMARY ADJUDICATOR
    canViewAudit: true,
    canExportReports: true,
  },
  mp: {
    id: 'mp',
    label: 'Member of Parliament (Hon’ble MP)',
    shortLabel: 'Hon’ble MP',
    level: 'constituency',
    icon: '👤',
    color: 'purple',
    description: 'Parliamentary Representative — Constituency project recommendation, citizen accountability & progress tracking',
    defaultRoleValue: 'Wankhade',
    jurisdictionLabel: 'Hon’ble MP: Balwant Baswant Wankhade (Amravati)',
    allowedPages: [
      'dashboard', 'mp_report', 'projects', 'work_progress',
      'fund_flow', 'map'
    ],
    canTakeCaseAction: false, // Separation of powers: Legislature recommends, Executive adjudicates
    canViewAudit: false,
    canExportReports: true,
  },
  agency: {
    id: 'agency',
    label: 'Implementing Agency (PWD / ZP)',
    shortLabel: 'Agency (PWD)',
    level: 'agency',
    icon: '🔧',
    color: 'amber',
    description: 'Technical Execution Body — Civil works execution, measurement books, milestone certification & vendor coordination',
    defaultRoleValue: 'Sahara',
    jurisdictionLabel: 'Implementing Agency: State Executing Division',
    allowedPages: [
      'dashboard', 'projects', 'work_progress', 'map'
    ],
    canTakeCaseAction: false,
    canViewAudit: false,
    canExportReports: false,
  },
  contractor: {
    id: 'contractor',
    label: 'Contractor (Evidence Submission)',
    shortLabel: 'Contractor',
    level: 'contractor',
    icon: '📋',
    color: 'slate',
    description: 'Restricted Vendor Portal — Upload geo-tagged site photographs, procurement invoices & view assigned works',
    defaultRoleValue: 'Sahara Builder Corp',
    jurisdictionLabel: 'Contractor: Sahara Builder Corp',
    allowedPages: [
      'projects', 'work_progress'
    ],
    canTakeCaseAction: false,
    canViewAudit: false,
    canExportReports: false,
  },
}

export const DEFAULT_ROLE_USERS = {
  mospi: {
    name: 'Dr. Alok Verma, IAS',
    designation: 'Additional Secretary (National Oversight)',
    department: 'Ministry of Statistics & Programme Implementation, GoI',
    email: 'alok.verma.ias@nic.in',
    clearanceLevel: 'Apex Level 1 (National Policy & Oversight)',
  },
  state: {
    name: 'Sunil M. Shinde, IAS',
    designation: 'Principal Secretary (Planning & Nodal)',
    department: 'State Planning & Nodal Department, Maharashtra',
    email: 'sec.planning@maharashtra.gov.in',
    clearanceLevel: 'Level 2 (State Coordinating Authority)',
  },
  district: {
    name: 'Smt. Pavneet Kaur, IAS',
    designation: 'District Magistrate & Collector',
    department: 'District Collectorate, Amravati',
    email: 'collector.amravati@nic.in',
    clearanceLevel: 'Level 3 (Statutory Adjudicator & Sanctioning Body)',
  },
  mp: {
    name: 'Balwant Baswant Wankhade',
    designation: 'Hon’ble Member of Parliament (Lok Sabha)',
    department: 'Parliament of India (Sansad Bhavan)',
    email: 'balwant.mp@sansad.nic.in',
    clearanceLevel: 'Legislative (Constituency Recommendations & Scrutiny)',
  },
  agency: {
    name: 'Er. Ramesh K. Deshmukh',
    designation: 'Executive Engineer (Civil Infrastructure)',
    department: 'Public Works Department (PWD) Division Amravati',
    email: 'ee.pwd.amravati@gov.in',
    clearanceLevel: 'Technical Execution (MB Measurement Certification)',
  },
  contractor: {
    name: 'Vikram Singhania',
    designation: 'Authorized Signatory & General Contractor',
    department: 'Sahara Builder Corp / M-TRACE Vendor Gateway',
    email: 'vendor.sahara@contractor.in',
    clearanceLevel: 'Vendor Portal (Photographic Evidence & Invoices)',
  },
}
