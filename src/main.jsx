import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BookOpen, BookOpenCheck, Bot, CalendarCheck2, CalendarDays, CheckCircle2, ClipboardCheck, Database, Download, FileText, Gauge, Menu, Plane, Search, Settings, ShieldCheck, Users, WalletCards, Zap } from 'lucide-react';
import malaysiaAircraft from './assets/malaysia-airlines-aircraft.svg';
import { getOpsRange, mockData } from './mockData.js';
import { callAcms, getApiUrl, setApiUrl } from './api.js';
import AllowanceModule from './modules/AllowanceModule.jsx';
import AttendanceModule from './modules/AttendanceModule.jsx';
import PoliciesModule from './modules/PoliciesModule.jsx';
import './styles.css';

const nav = [
  { key: 'command', label: 'Command Center', icon: Gauge },
  { key: 'roster', label: 'Roster Editor', icon: CalendarDays },
  { key: 'demand', label: 'Flight Demand', icon: Plane },
  { key: 'crew', label: 'Crew 360', icon: Users },
  { key: 'ops', label: 'Check-in / Absence', icon: ClipboardCheck },
  { key: 'allowances', label: 'Allowances', icon: WalletCards },
  { key: 'attendance', label: 'Crew Attendance', icon: CalendarCheck2 },
  { key: 'policies', label: 'HR Policies', icon: BookOpenCheck },
  { key: 'recovery', label: 'Recovery', icon: Zap },
  { key: 'optimizer', label: 'Scenario Lab', icon: Activity },
  { key: 'rules', label: 'Rules', icon: ShieldCheck },
  { key: 'reports', label: 'Analytics', icon: FileText },
  { key: 'backend', label: 'Database / API', icon: Database },
  { key: 'copilot', label: 'AI Copilot', icon: Bot },
  { key: 'admin', label: 'Admin', icon: Settings },
  { key: 'glossary', label: 'Glossary', icon: BookOpen }
];

const screenMeta = {
  command: { id: 'W01', title: 'Operations Command Center', subtitle: 'Planner / OCC / Admin workspace', features: ['Live operational readiness dashboard', 'KPI cards for flights, crewed percentage, exceptions and check-ins', 'Exception drill-down and AI daily brief', 'Connected to CheckIns, Recovery_Cases and Roster_Actual'] },
  flightsDetail: { id: 'W01-A', title: 'Flights Today Detail', subtitle: 'Date-filtered flight coverage, crew demand and status export', features: ['Flight-by-flight demand coverage', 'Crewing status and gate readiness', 'CSV download for selected date range', 'Designed for OCC flight dispatch reviews'] },
  exceptionsDetail: { id: 'W01-B', title: 'Open Exceptions Detail', subtitle: 'Operational exception queue for selected June dates', features: ['Priority, SLA and owner triage', 'Flight and crew-linked exceptions', 'Downloadable exception register', 'Recovery handoff ready'] },
  checkinsDetail: { id: 'W01-C', title: 'Late Check-ins Detail', subtitle: 'Crew attendance and evidence monitoring by day or range', features: ['Late, pending and checked-in evidence', 'Crew report versus actual timing', 'CSV export for attendance audit', 'Ops escalation focused'] },
  stabilityDetail: { id: 'W01-D', title: 'Roster Stability Detail', subtitle: 'Roster change health and stability drivers across June', features: ['Daily stability movement', 'Change pressure and exception mix', 'Downloadable stability dataset', 'Planner-ready roster quality insights'] },
  roster: { id: 'W02', title: 'Modern Roster Editor', subtitle: 'Monthly multi-window Gantt workspace', features: ['Crew rows, duty tiles and roster state toggle', 'Color-coded duty, standby, training, leave and exceptions', 'Manual edit with rule validation before save', 'Planned, published and actual roster comparison'] },
  demand: { id: 'W03', title: 'Flight Demand Board', subtitle: 'Schedule demand and crew requirement control', features: ['Flight schedule import', 'Aircraft type and crew requirement mapping', 'Schedule deltas and missing demand flags', 'Export to roster build'] },
  crew: { id: 'W06', title: 'Crew Profile & Qualification 360', subtitle: 'Eligibility, documents and roster history', features: ['Eligibility snapshot across rank, base, fleet and route', 'License, medical, training and recency timeline', 'Document links and maker-checker updates', 'Data quality exceptions'] },
  ops: { id: 'W10/W11', title: 'Absence, No-show & Check-in Desk', subtitle: 'Day-of-operation attendance control', features: ['Due/pending/late/no-show tabs', 'Geo/Wi-Fi/device validation result', 'MC attachment review', 'Escalation and recovery trigger'] },
  allowances: { id: 'W33', title: 'Crew Allowance Management', subtitle: 'Roster-driven calculation, approval, distribution and payroll control', features: ['Cabin and flight crew rule engines mapped to the supplied guidebooks', 'Daily breakdown mirrors the existing allowance statement tables', 'Discrepancy adjustments, maker-checker approval and audit trail', 'Backend-ready PDF distribution and payroll handoff'] },
  attendance: { id: 'W34', title: 'Crew Attendance Self-Service', subtitle: 'Crew-submitted reporting evidence stored in the backend', features: ['Mobile-friendly duty and check-in capture', 'Scheduled-versus-actual status calculation', 'Consent-based geo, network and device evidence', 'OCC late/pending review queue and audit history'] },
  policies: { id: 'W35', title: 'HR Policies & Crew Governance', subtitle: 'Published policy library, effective dating and acknowledgements', features: ['Allowance and attendance rules linked to published policy versions', 'Search by category, audience and effective date', 'Crew acknowledgement with timestamped audit evidence', 'Rule-to-source and rule-to-system traceability'] },
  recovery: { id: 'W13', title: 'Recovery Workbench', subtitle: 'Disruption resolution with ranked replacement options', features: ['Disruption case queue by priority and SLA', 'Ranked legal replacement recommendations', 'Reserve call-up and roster update actions', 'Audit of recommendation and override reason'] },
  optimizer: { id: 'W14', title: 'Optimizer Scenario Lab', subtitle: 'Compare roster alternatives before publishing', features: ['Scenario A/B comparison', 'Cost, overtime, stability and preference grant', 'Equal distribution for standby, free weekends and block hours', 'Fatigue and legality impact preview'] },
  rules: { id: 'W15', title: 'Rule & Legality Console', subtitle: 'Validation, explainability and override controls', features: ['Hard blocks and soft warnings', 'Rule configuration preview', 'Override rights with mandatory reason capture', 'Audit-ready evidence of every rule execution'] },
  reports: { id: 'W22', title: 'Analytics & KPI Dashboard', subtitle: 'Management scorecards and exportable KPIs', features: ['Utilization, roster quality and governance trends', 'Recovery time and leave demand', 'Training expiry and check-in compliance', 'Payroll readiness and KPI snapshots'] },
  backend: { id: 'W25/W26', title: 'Database + API Monitor', subtitle: 'Webhook health and backend sheet governance', features: ['Endpoint status, latency and failed calls', 'Google Sheet schema and record count monitoring', 'Retry queue and payload inspection', 'Backup and trigger status'] },
  copilot: { id: 'W29', title: 'AI Copilot & Natural Language Search', subtitle: 'Assistant layer for roster data and suggested actions', features: ['Ask roster questions', 'Summarize exceptions', 'Explain recommendations', 'Draft recovery notifications and daily briefings'] },
  admin: { id: 'W27/W28/W31', title: 'Administration Console', subtitle: 'Rules, RBAC, system settings and support controls', features: ['Rule thresholds and master data', 'User provisioning and access scopes', 'Trigger schedules and backups', 'Maintenance banner and environment flags'] },
  glossary: { id: 'W32', title: 'ACMS Glossary & Acronym Copilot', subtitle: 'Complete acronym dictionary with searchable AI assistance', features: ['Every ACMS acronym expanded with operational meaning', 'Category filters across crew, flight, compliance, systems and analytics', 'AI copilot answers questions using the glossary context', 'Quick reference for planners, OCC, admins and crew users'] }
};


const glossaryTerms = [
  { acronym: 'ACMS', term: 'Airline Crew Management System', category: 'System', detail: 'End-to-end crew operations platform covering roster planning, crew records, check-in, absence, recovery, legality rules, analytics, integrations and administration.' },
  { acronym: 'Admin', term: 'Administrator', category: 'Security', detail: 'Privileged user or console area used to configure rules, master data, users, RBAC, backups, triggers and system settings.' },
  { acronym: 'AI', term: 'Artificial Intelligence', category: 'System', detail: 'Assistant capability used to search operational data, explain acronyms, summarize exceptions and recommend recovery actions.' },
  { acronym: 'API', term: 'Application Programming Interface', category: 'System', detail: 'Secure endpoint used by the frontend, Google Apps Script backend and integrations to exchange ACMS data.' },
  { acronym: 'Apps Script', term: 'Google Apps Script', category: 'System', detail: 'Google automation runtime used to expose Sheets-backed web app endpoints, triggers and backend jobs.' },
  { acronym: 'ATR', term: 'Avions de Transport Régional', category: 'Fleet', detail: 'Regional turboprop aircraft family used for fleet qualification and demand planning.' },
  { acronym: 'ATR72', term: 'ATR 72', category: 'Fleet', detail: 'Specific ATR regional aircraft type referenced in demo flight demand and crew requirement records.' },
  { acronym: 'Audit Log', term: 'Audit Log', category: 'Governance', detail: 'Chronological evidence trail for changes, validations, overrides, webhook calls and support actions.' },
  { acronym: 'B737', term: 'Boeing 737', category: 'Fleet', detail: 'Narrow-body jet fleet type requiring specific pilot and cabin crew qualifications.' },
  { acronym: 'Base', term: 'Crew Base', category: 'Airport/Base', detail: 'Crew home station used for assignment, reserve coverage, proximity checks and roster planning.' },
  { acronym: 'BKI', term: 'Kota Kinabalu International Airport', category: 'Airport/Base', detail: 'Airport or base code used for sectors, crew base data and recovery proximity checks.' },
  { acronym: 'CC', term: 'Cabin Crew', category: 'Crew', detail: 'Cabin crew rank responsible for passenger cabin safety, service and aircraft-specific cabin duties.' },
  { acronym: 'Check-in', term: 'Crew Check-in', category: 'Operations', detail: 'Day-of-operation attendance confirmation before report or departure, validated by time, location, device or network controls.' },
  { acronym: 'CPT', term: 'Captain', category: 'Crew', detail: 'Pilot in command and required flight deck rank in crew demand packages.' },
  { acronym: 'CRM', term: 'Crew Resource Management', category: 'Training', detail: 'Human factors, communication and teamwork training tracked as part of crew qualification validity.' },
  { acronym: 'Crew 360', term: 'Crew Profile 360', category: 'Crew', detail: 'Full crew profile view combining rank, base, fleet, status, documents, qualification, training and roster history.' },
  { acronym: 'Crew_Master', term: 'Crew Master Sheet', category: 'Backend', detail: 'Backend master data sheet containing crew identifiers, names, ranks, bases, fleets and status information.' },
  { acronym: 'Demand Gap', term: 'Demand Gap', category: 'Planning', detail: 'Flight demand item that lacks required crew mapping, aircraft data or assignment coverage.' },
  { acronym: 'Device Validation', term: 'Device Validation', category: 'Operations', detail: 'Check-in evidence confirming the crew member used an expected or trusted device.' },
  { acronym: 'ETA', term: 'Estimated Time of Arrival', category: 'Flight', detail: 'Projected arrival time used for recovery planning, disruption communication and duty impact assessment.' },
  { acronym: 'Exceptions ON', term: 'Exceptions Enabled', category: 'Planning', detail: 'Roster editor filter or mode showing conflicts, missing crew, legality warnings and operational exceptions.' },
  { acronym: 'FB', term: 'Flight Block', category: 'Roster', detail: 'Roster duty code for an assigned flying block or flight duty sequence; shown as green duty tiles in the roster timeline.' },
  { acronym: 'FDP', term: 'Flight Duty Period', category: 'Compliance', detail: 'Regulated duty window from report time through post-flight duties, checked by legality rules.' },
  { acronym: 'FO', term: 'First Officer', category: 'Crew', detail: 'Second pilot role paired with the captain for flight deck coverage.' },
  { acronym: 'FY', term: 'Firefly Flight Designator', category: 'Flight', detail: 'Flight number prefix used in demo records such as FY3124, FY2176, FY4020 and FY1108.' },
  { acronym: 'Gantt', term: 'Gantt Timeline', category: 'Planning', detail: 'Timeline view displaying crew duties, standby, training, leave, off days and conflicts across calendar days.' },
  { acronym: 'Geo', term: 'Geolocation Validation', category: 'Operations', detail: 'Check-in control validating that a crew member is at an approved reporting location.' },
  { acronym: 'GitHub Pages', term: 'GitHub Pages', category: 'System', detail: 'Static hosting target for deploying the Vite frontend through GitHub Actions.' },
  { acronym: 'Hard Block', term: 'Hard Block', category: 'Compliance', detail: 'Legality rule failure that must be resolved or formally overridden before roster publication.' },
  { acronym: 'JHB', term: 'Johor Bahru Airport', category: 'Airport/Base', detail: 'Airport or sector code used in flight demand, route qualification and recovery context.' },
  { acronym: 'JSON', term: 'JavaScript Object Notation', category: 'System', detail: 'Structured payload format used in Apps Script-compatible text/plain API requests and responses.' },
  { acronym: 'KPI', term: 'Key Performance Indicator', category: 'Analytics', detail: 'Management metric such as roster stability, utilization, recovery time, OTP, payroll readiness or check-in compliance.' },
  { acronym: 'KUL', term: 'Kuala Lumpur International Airport', category: 'Airport/Base', detail: 'Major airport/base code used in crew base, route and sector assignments.' },
  { acronym: 'Legality', term: 'Legality Validation', category: 'Compliance', detail: 'Rule checking process that evaluates rest, FDP, consecutive duty, qualification and expiry constraints.' },
  { acronym: 'LGK', term: 'Langkawi International Airport', category: 'Airport/Base', detail: 'Airport or sector code used in schedule, demand and route records.' },
  { acronym: 'Line Check', term: 'Line Check', category: 'Training', detail: 'Operational proficiency check tracked in qualification timelines and optimizer scenarios.' },
  { acronym: 'LVE', term: 'Leave', category: 'Roster', detail: 'Roster code for approved absence such as annual, medical, special or other authorized leave.' },
  { acronym: 'Maker-checker', term: 'Maker-checker Review', category: 'Governance', detail: 'Two-step control where one user submits a data change and another reviews or approves it.' },
  { acronym: 'Max FDP', term: 'Maximum Flight Duty Period', category: 'Compliance', detail: 'Configured upper limit for flight duty period duration, treated as a hard legality rule.' },
  { acronym: 'MC', term: 'Medical Certificate', category: 'Operations', detail: 'Evidence attached to sickness or absence cases and reviewed by operations controllers.' },
  { acronym: 'Min Rest', term: 'Minimum Rest', category: 'Compliance', detail: 'Required rest duration between duties, configured as a hard legality rule in the rules console.' },
  { acronym: 'MYR', term: 'Malaysian Ringgit', category: 'Analytics', detail: 'Currency used for scenario cost comparison and savings estimates.' },
  { acronym: 'No-show', term: 'Crew No-show', category: 'Operations', detail: 'Crew member did not report or check in as required, typically triggering escalation and recovery.' },
  { acronym: 'OCC', term: 'Operations Control Center', category: 'Operations', detail: 'Day-of-operation control team responsible for disruptions, escalations, recovery actions and operational briefings.' },
  { acronym: 'OFF', term: 'Off Duty', category: 'Roster', detail: 'Roster code for protected non-working time.' },
  { acronym: 'Open Trip', term: 'Open Trip', category: 'Planning', detail: 'Flight or duty pairing without sufficient assigned qualified crew.' },
  { acronym: 'OTP', term: 'On-Time Performance', category: 'Analytics', detail: 'Measure of flights operating to schedule, protected through early exception handling and crew recovery.' },
  { acronym: 'Overtime', term: 'Overtime Hours', category: 'Analytics', detail: 'Crew work above planned or contractual thresholds, tracked in scenario and management reporting.' },
  { acronym: 'PEN', term: 'Penang International Airport', category: 'Airport/Base', detail: 'Airport or base code used in crew base, sector and flight data.' },
  { acronym: 'Planner', term: 'Crew Planner', category: 'Crew', detail: 'User role responsible for roster building, validation, publication and demand coverage.' },
  { acronym: 'POST', term: 'HTTP POST Request', category: 'System', detail: 'API request method used to send action payloads to the Apps Script web app.' },
  { acronym: 'Preference Grant', term: 'Preference Grant Rate', category: 'Analytics', detail: 'Percentage of crew preferences satisfied within roster stability and legality constraints.' },
  { acronym: 'Published v3', term: 'Published Roster Version 3', category: 'Planning', detail: 'Example published roster state/version used in the roster editor filter strip.' },
  { acronym: 'RBAC', term: 'Role-Based Access Control', category: 'Security', detail: 'Permission model that limits users to approved capabilities based on role and operational scope.' },
  { acronym: 'RC', term: 'Recovery Case', category: 'Recovery', detail: 'Case identifier for disruptions requiring replacement crew, replanning, communication or escalation.' },
  { acronym: 'Reserve Pool', term: 'Reserve Pool', category: 'Recovery', detail: 'Available standby or reserve crew who can be called up for short-notice coverage.' },
  { acronym: 'Rest OK', term: 'Rest Compliant', category: 'Compliance', detail: 'Indicates a proposed crew replacement satisfies minimum rest requirements.' },
  { acronym: 'Roster_Actual', term: 'Actual Roster Sheet', category: 'Backend', detail: 'Backend sheet or dataset containing operated roster outcomes after day-of-operation changes.' },
  { acronym: 'Roster_Published', term: 'Published Roster Sheet', category: 'Backend', detail: 'Backend sheet containing the currently published roster used by operations.' },
  { acronym: 'Route Qualification', term: 'Route Qualification', category: 'Compliance', detail: 'Eligibility requirement that crew are qualified or approved for a route, sector or airport.' },
  { acronym: 'SBY', term: 'Standby', category: 'Roster', detail: 'Roster code for crew held available for short-notice operational coverage.' },
  { acronym: 'Scenario A/B', term: 'Scenario A/B Comparison', category: 'Planning', detail: 'Optimizer comparison of baseline and alternative rosters across cost, overtime, stability, preferences and risk.' },
  { acronym: 'Sector', term: 'Flight Sector', category: 'Flight', detail: 'Origin-destination leg such as KUL-PEN or SZB-BKI used in demand and route qualification.' },
  { acronym: 'SEP', term: 'Safety and Emergency Procedures', category: 'Training', detail: 'Recurring safety training requirement tracked for crew qualification validity.' },
  { acronym: 'SLA', term: 'Service Level Agreement', category: 'Operations', detail: 'Target handling time for exceptions such as late check-ins, no-shows, recovery cases and support queues.' },
  { acronym: 'Soft Warning', term: 'Soft Warning', category: 'Compliance', detail: 'Rule alert requiring review but not always blocking publication when justified.' },
  { acronym: 'STA', term: 'Scheduled Time of Arrival', category: 'Flight', detail: 'Published arrival time used in schedule, duty and disruption calculations.' },
  { acronym: 'STD', term: 'Scheduled Time of Departure', category: 'Flight', detail: 'Published departure time used to derive check-in deadlines, duty timelines and flight demand.' },
  { acronym: 'SZB', term: 'Sultan Abdul Aziz Shah Airport', category: 'Airport/Base', detail: 'Airport or sector code used in flight demand and route context.' },
  { acronym: 'TRN', term: 'Training', category: 'Roster', detail: 'Roster code for required training duty, simulator event, recurrent course or line check.' },
  { acronym: 'Trigger', term: 'Scheduled Trigger', category: 'Backend', detail: 'Automated Apps Script job used for sync, backup, retry, alerting or maintenance tasks.' },
  { acronym: 'Unassigned Trip', term: 'Unassigned Trip', category: 'Planning', detail: 'Scheduled duty or flight with missing crew assignment after roster build or recovery.' },
  { acronym: 'URL', term: 'Uniform Resource Locator', category: 'System', detail: 'Web address for the Apps Script /exec endpoint or local Vite development server.' },
  { acronym: 'PA', term: 'Productivity Allowance', category: 'Allowance', detail: 'Crew entitlement calculated from eligible actual duty or block time using the effective rate for crew type and grade.' },
  { acronym: 'PI', term: 'Productivity Incentive', category: 'Allowance', detail: 'Hourly incentive paired with eligible productivity activity under the applicable cabin or flight crew policy.' },
  { acronym: 'GHCCP', term: 'Group Human Capital Corporate Policy', category: 'HR Policy', detail: 'Corporate policy source referenced for duty travel, meal benefits, compensation, leave and related employment matters.' },
  { acronym: 'Allowance Statement', term: 'Monthly Crew Allowance Statement', category: 'Allowance', detail: 'Crew-level report containing daily roster-derived activity, calculated entitlements, adjustments, approvals and final payroll total.' },
  { acronym: 'Attendance Record', term: 'Crew Attendance Submission', category: 'Operations', detail: 'Backend record of duty date, assigned flight, scheduled report, actual check-in and supplied location, network or device evidence.' },
  { acronym: 'Utilization', term: 'Crew Utilization', category: 'Analytics', detail: 'Measure of planned or actual crew usage by rank, fleet, base or period.' },
  { acronym: 'Vite', term: 'Vite Frontend Tooling', category: 'System', detail: 'Development and build tool used to run and bundle the React web application.' },
  { acronym: 'Webhook', term: 'Webhook Endpoint', category: 'Backend', detail: 'HTTP endpoint receiving ACMS actions such as roster retrieval, check-in posting, absence updates and notifications.' },
  { acronym: 'Wi-Fi', term: 'Wireless Network Validation', category: 'Operations', detail: 'Optional check-in evidence confirming an approved reporting-point network was used.' },
  { acronym: 'W01-W32', term: 'Screen Identifier Range', category: 'System', detail: 'Blueprint screen IDs used to label ACMS modules from command center through glossary.' }
];

function glossaryAnswer(question) {
  const text = question.trim().toLowerCase();
  if (!text) return 'Ask about any acronym, category or crew operations phrase in the glossary.';
  const matches = glossaryTerms.filter(item => [item.acronym, item.term, item.category, item.detail].join(' ').toLowerCase().includes(text));
  if (matches.length) {
    return matches.slice(0, 4).map(item => `${item.acronym} means ${item.term}. ${item.detail}`).join('\n\n');
  }
  const tokens = text.split(/\W+/).filter(Boolean);
  const fuzzy = glossaryTerms.filter(item => tokens.some(token => [item.acronym, item.term, item.category, item.detail].join(' ').toLowerCase().includes(token)));
  if (fuzzy.length) return `I found related glossary entries:\n\n${fuzzy.slice(0, 4).map(item => `• ${item.acronym} — ${item.term}: ${item.detail}`).join('\n')}`;
  return 'I could not find a direct glossary match. Try an acronym such as FB, FDP, RBAC, OCC, SBY, MC, STD or KPI.';
}

function toneClass(tone) { return tone === 'risk' ? 'risk' : tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : 'info'; }

function Shell() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('acms-authenticated') === 'true');
  const [active, setActive] = useState('command');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [sync, setSync] = useState('Demo data');
  const [crewDirectory, setCrewDirectory] = useState(mockData.crew);

  async function ping() {
    setSync('Checking...');
    const res = await callAcms('ping');
    setSync(res?.ok ? 'All Sync' : 'Demo data');
  }

  useEffect(() => { ping(); }, []);

  function saveUrl() { setApiUrl(apiUrl); ping(); }
  function handleLogin() { sessionStorage.setItem('acms-authenticated', 'true'); setIsAuthenticated(true); }
  function handleLogout() { sessionStorage.removeItem('acms-authenticated'); setIsAuthenticated(false); setActive('command'); }

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin}/>;

  const meta = screenMeta[active] || screenMeta.command;
  const Icon = nav.find(n => n.key === active)?.icon || Gauge;

  return <div className="app">
    <aside className={sidebarOpen ? 'sidebar' : 'sidebar collapsed'}>
      <div className="brand"><div className="brandMark">A</div><div><b>ACMS</b><span>Crew Ops OS</span></div></div>
      <nav>{nav.map(item => { const NIcon = item.icon; return <button key={item.key} className={active === item.key ? 'nav active' : 'nav'} onClick={() => setActive(item.key)}><NIcon size={18}/><span>{item.label}</span></button>})}</nav>
      <div className="backendPill"><span>Live Sheets Backend</span><b>{sync}</b></div>
    </aside>
    <main>
      <header className="topbar">
        <button className="iconBtn" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20}/></button>
        <div className="titleBlock"><div className="screenId"><Icon size={18}/>{meta.id}</div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
        <div className="topActions"><button className="ghost" onClick={() => setActive('copilot')}><Bot size={16}/> Ask AI Copilot</button><button className="sync" onClick={ping}>{sync}</button><button className="ghost logoutBtn" onClick={handleLogout}>Sign out</button><div className="avatar">AI</div></div>
      </header>
      <FeatureStrip features={meta.features}/>
      <Screen active={active} setActive={setActive} apiUrl={apiUrl} setApiUrlState={setApiUrlState} saveUrl={saveUrl} crewDirectory={crewDirectory} setCrewDirectory={setCrewDirectory}/>
    </main>
  </div>;
}


function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submitLogin(event) {
    event.preventDefault();
    if (userId.trim().toUpperCase() === 'AIONOS' && password === 'AIONOS123') {
      setError('');
      onLogin();
      return;
    }
    setError('Invalid credentials. Use your assigned AIONOS access ID and password.');
  }

  return <main className="loginPage">
    <section className="loginHero" aria-label="ACMS secure login">
      <div className="loginVisual">
        <div className="brand loginBrand"><div className="brandMark">A</div><div><b>ACMS</b><span>AIONOS Crew Ops OS</span></div></div>
        <div className="malaysiaAirlineGraphic" aria-label="Malaysia Airlines aircraft at the airport">
          <img src={malaysiaAircraft} alt="Malaysia Airlines aircraft parked on an airport apron" />
        </div>
        <div className="radarCard">
          <div className="radarOrbit"><span/><span/><span/></div>
          <div><strong>Live crew command</strong><small>Roster, legality, recovery and OCC intelligence unified after sign-in.</small></div>
        </div>
        <div className="loginStats">
          <span><b>98%</b> payroll ready</span><span><b>216</b> active users</span><span><b>4.8k</b> webhook calls</span>
        </div>
      </div>
      <form className="loginCard" onSubmit={submitLogin}>
        <span className="securePill"><ShieldCheck size={16}/> Secure AIONOS Gateway</span>
        <h1>Welcome to ACMS</h1>
        <p>Sign in to enter the Airline Crew Management System command center.</p>
        <label>User ID<input value={userId} onChange={e => setUserId(e.target.value)} placeholder="AIONOS" autoComplete="username" autoFocus/></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="AIONOS123" autoComplete="current-password"/></label>
        {error ? <div className="loginError" role="alert">{error}</div> : <div className="loginHint">Demo access: User ID <b>AIONOS</b> · Password <b>AIONOS123</b></div>}
        <button className="loginButton" type="submit">Enter ACMS Command Center</button>
      </form>
    </section>
  </main>;
}

function FeatureStrip({features}) { return <section className="featureStrip">{features.map((f, i) => <div className="feature" key={f}><span>{String(i+1).padStart(2,'0')}</span>{f}</div>)}</section>; }

function Kpis({items = mockData.kpis, onSelect}) { return <div className="kpis">{items.map(k => <button className={`card kpi ${toneClass(k.tone)} ${onSelect ? 'clickable' : ''} ${k.selected ? 'selected' : ''}`} key={k.label} onClick={() => onSelect?.(k)}><span>{k.label}</span><strong>{k.value}</strong><small>{k.note}</small></button>)}</div>; }

const duties = ['FB','SBY','TRN','OFF','LVE','FB','SBY','TRN','OFF','FB','SBY','FB'];
function Gantt({title='Live Operations Timeline', rows=12, rowLabels, actions}) {
  const days = Array.from({length:14}, (_,i)=>String(i+1).padStart(2,'0'));
  const displayRows = rowLabels?.length || rows;
  return <div className="card ganttCard"><div className="cardHeader"><div className="cardTitle">{title}</div>{actions}</div><div className="gantt"><div className="ganttHead"><span></span>{days.map(d=><b key={d}>D{d}</b>)}</div>{Array.from({length:displayRows},(_,r)=> <div className="ganttRow" key={rowLabels?.[r] || r}><label>{rowLabels?.[r] || `Crew ${100+r}`}</label>{days.map((d,c)=> { const show = (r+c)%4===0 || (r*c)%9===0; const duty=duties[(r+c)%duties.length]; return <span className={show ? `tile ${duty.toLowerCase()}` : 'slot'} key={d}>{show ? duty : ''}{show && (r+c)%11===0 ? <i/>: null}</span>})}</div>)}</div></div>;
}

function Table({title, columns, rows, actions}) { return <div className="card tableCard"><div className="cardHeader"><div className="cardTitle">{title}</div>{actions}</div><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{columns.map(c=><td key={c}>{row[c] ?? row[c.toLowerCase()] ?? ''}</td>)}</tr>)}</tbody></table></div>; }

function DateRangePicker({ startDate, endDate, setStartDate, setEndDate }) {
  return <div className="datePanel card"><div><b>June operations calendar</b><span>Select one day or a group of days. Demo backend data is populated for every date in June 2026.</span></div><label>From<input type="date" min="2026-06-01" max="2026-06-30" value={startDate} onChange={e => setStartDate(e.target.value)}/></label><label>To<input type="date" min="2026-06-01" max="2026-06-30" value={endDate} onChange={e => setEndDate(e.target.value)}/></label></div>;
}
function exportCsv(filename, rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const csv = [columns.join(','), ...rows.map(row => columns.map(col => `"${String(row[col] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
function Command({ setActive }) { const [startDate,setStartDate]=useState('2026-06-01'); const [endDate,setEndDate]=useState('2026-06-30'); const range=getOpsRange(startDate,endDate); const items=[{label:'Flights Today',value:range.flights.length,note:`${range.days.length} June day(s) selected`,tone:'ok',screen:'flightsDetail'},{label:'Open Exceptions',value:range.exceptions.filter(x=>x.priority!=='Low').length,note:'high / medium triage',tone:'risk',screen:'exceptionsDetail'},{label:'Late Check-ins',value:range.checkins.filter(x=>x.status==='Late').length,note:'auto-escalated',tone:'warn',screen:'checkinsDetail'},{label:'Roster Stability',value:`${range.avgStability}%`,note:'average selected range',tone:'info',screen:'stabilityDetail'}]; return <><DateRangePicker startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate}/><Kpis items={items} onSelect={k=>setActive(k.screen)}/><div className="grid two"><Gantt/><Table title="Priority Exceptions" columns={['date','type','crew','flight','sla','priority']} rows={range.exceptions.slice(0,10)}/><Table title="Flights in Selected Range" columns={['date','flight','sector','std','aircraft','status']} rows={range.flights.slice(0,10)}/><MiniChart title="Recovery Cycle Time" /></div></>; }
function DetailScreen({ type }) { const [startDate,setStartDate]=useState('2026-06-01'); const [endDate,setEndDate]=useState('2026-06-30'); const range=getOpsRange(startDate,endDate); const configs={flightsDetail:{title:'Downloadable Flight Operations Register',cols:['date','flight','sector','std','sta','aircraft','need','status','gate','crewedPercent'],rows:range.flights,kpis:[{label:'Selected Flights',value:range.flights.length,note:'scheduled sectors',tone:'ok'},{label:'Open Trips',value:range.flights.filter(x=>x.status==='Open trip').length,note:'needs action',tone:'risk'},{label:'Delay Risks',value:range.flights.filter(x=>x.status==='Delay risk').length,note:'watchlist',tone:'warn'},{label:'Crewed Avg',value:'94%',note:'range estimate',tone:'info'}]},exceptionsDetail:{title:'Downloadable Exception Register',cols:['date','type','crew','flight','sla','priority','owner'],rows:range.exceptions,kpis:[{label:'All Exceptions',value:range.exceptions.length,note:'selected range',tone:'risk'},{label:'High Priority',value:range.exceptions.filter(x=>x.priority==='High').length,note:'OCC focus',tone:'risk'},{label:'Medium',value:range.exceptions.filter(x=>x.priority==='Med').length,note:'planner queue',tone:'warn'},{label:'SLA Owners',value:'4',note:'active desks',tone:'info'}]},checkinsDetail:{title:'Downloadable Check-in Audit',cols:['date','crew','flight','report','actual','status','evidence'],rows:range.checkins,kpis:[{label:'Check-ins',value:range.checkins.length,note:'selected range',tone:'info'},{label:'Late',value:range.checkins.filter(x=>x.status==='Late').length,note:'escalated',tone:'warn'},{label:'Pending',value:range.checkins.filter(x=>x.status==='Pending').length,note:'monitor',tone:'risk'},{label:'Evidence OK',value:range.checkins.filter(x=>x.evidence.includes('OK')).length,note:'validated',tone:'ok'}]},stabilityDetail:{title:'Downloadable Roster Stability Dataset',cols:['date','flightCount','exceptionCount','lateCheckIns','stability'],rows:range.days,kpis:[{label:'Average Stability',value:`${range.avgStability}%`,note:'selected range',tone:'info'},{label:'Best Day',value:`${Math.max(...range.days.map(x=>x.stability))}%`,note:'June peak',tone:'ok'},{label:'Change Load',value:range.exceptions.length,note:'exception pressure',tone:'warn'},{label:'Late Impact',value:range.checkins.filter(x=>x.status==='Late').length,note:'attendance pressure',tone:'risk'}]}}; const cfg=configs[type]; return <><DateRangePicker startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate}/><Kpis items={cfg.kpis}/><div className="grid two"><Table title={cfg.title} columns={cfg.cols} rows={cfg.rows} actions={<button className="downloadBtn" onClick={()=>exportCsv(`${type}-${startDate}-to-${endDate}.csv`, cfg.rows)}><Download size={15}/> Download CSV</button>}/><MiniChart title="Selected Range Trend" /></div></>; }

function Roster({ crewDirectory = mockData.crew }) {
  const [fleet,setFleet]=useState('ATR');
  const [base,setBase]=useState('KUL');
  const [rank,setRank]=useState('All');
  const [exceptionsOn,setExceptionsOn]=useState(true);
  const [version,setVersion]=useState('Published v3');
  const [newStatus,setNewStatus]=useState('Ready');
  const [selectedCrew,setSelectedCrew]=useState(crewDirectory[0]?.crewId || '');
  const [crewStatuses,setCrewStatuses]=useState(() => Object.fromEntries(crewDirectory.map(crew => [crew.crewId, crew.status])));
  const [validation,setValidation]=useState('Not validated');
  const [publishState,setPublishState]=useState('Roster has draft edits');
  const [viewAll,setViewAll]=useState(false);

  const rosterCrew = crewDirectory
    .map(crew => ({ ...crew, status: crewStatuses[crew.crewId] || crew.status }))
    .filter(crew => fleet === 'All' || crew.fleet === fleet)
    .filter(crew => base === 'All' || crew.base === base)
    .filter(crew => rank === 'All' || crew.rank === rank);
  const openTrips = mockData.flights.filter(flight => exceptionsOn || !['Missing CC','Delay risk','Open trip'].includes(flight.status));
  const visibleRosterCrew = viewAll ? rosterCrew : rosterCrew.slice(0, 3);
  const visibleOpenTrips = viewAll ? openTrips : openTrips.slice(0, 3);
  const rosterGanttLabels = visibleRosterCrew.map(crew => crew.crewId);

  function viewAllRosterRecords() {
    setFleet('All');
    setBase('All');
    setRank('All');
    setExceptionsOn(true);
    setViewAll(true);
  }

  function applyCrewStatus() {
    setCrewStatuses(current => ({ ...current, [selectedCrew]: newStatus }));
    setValidation('Crew status changed · validation required');
    setPublishState('Roster has unpublished status updates');
  }

  function validateRoster() {
    const issueCount = exceptionsOn ? openTrips.filter(flight => ['Missing CC','Delay risk','Open trip'].includes(flight.status)).length : 0;
    setValidation(issueCount ? `Validated with ${issueCount} visible exception(s)` : 'Validated · no visible exceptions');
  }

  function publishRoster() {
    const nextVersion = version === 'Published v3' ? 'Published v4' : 'Published v3';
    setVersion(nextVersion);
    setPublishState(`${nextVersion} active · ${rosterCrew.length} crew row(s) published`);
    setValidation('Published roster validated and locked');
  }

  return <>
    <div className="filters rosterFilters">
      <button className={fleet === 'ATR' ? 'selected' : ''} onClick={()=>setFleet(fleet === 'ATR' ? 'All' : 'ATR')}>Fleet {fleet}</button>
      <button className={base === 'KUL' ? 'selected' : ''} onClick={()=>setBase(base === 'KUL' ? 'All' : 'KUL')}>Base {base}</button>
      <button className={rank === 'All' ? 'selected' : ''} onClick={()=>setRank(rank === 'All' ? 'CPT' : rank === 'CPT' ? 'FO' : rank === 'FO' ? 'CC' : 'All')}>Rank {rank}</button>
      <button className={exceptionsOn ? 'selected risk' : ''} onClick={()=>setExceptionsOn(!exceptionsOn)}>Exceptions {exceptionsOn ? 'ON' : 'OFF'}</button>
      <button className="selected warn" onClick={()=>setVersion(version === 'Published v3' ? 'Published v4' : 'Published v3')}>{version}</button>
      <button onClick={validateRoster}>Validate</button>
      <button onClick={publishRoster}>Publish</button>
      <button className={viewAll ? 'selected' : ''} onClick={viewAllRosterRecords}>View All</button>
    </div>
    <div className="card rosterControl">
      <div><strong>Crew status update</strong><small>Add or update crew availability before validation and publish.</small></div>
      <select value={selectedCrew} onChange={e=>setSelectedCrew(e.target.value)}>{crewDirectory.map(crew => <option key={crew.crewId} value={crew.crewId}>{crew.crewId} · {crew.name}</option>)}</select>
      <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}>{['Ready','Training','Standby','Sick','Leave','Unavailable','Med expiring'].map(status => <option key={status}>{status}</option>)}</select>
      <button onClick={applyCrewStatus}>Add status</button>
    </div>
    <Kpis items={[{label:'Roster Filter',value:`${fleet}/${base}/${rank}`,note:`${rosterCrew.length} crew rows visible`,tone:'info'},{label:'Exception Mode',value:exceptionsOn ? 'ON' : 'OFF',note:`${openTrips.length} trips in scope`,tone:exceptionsOn ? 'risk' : 'ok'},{label:'Validation',value:validation.includes('Validated') || validation.includes('Published') ? 'Ready' : 'Draft',note:validation,tone:validation.includes('required') ? 'warn' : 'ok'},{label:'Publish State',value:version.replace('Published ',''),note:publishState,tone:'info'}]}/>
    <Gantt title="Modern Roster Editor · Multi-window Gantt" rowLabels={rosterGanttLabels} actions={!viewAll && <button className="viewAllBtn" onClick={viewAllRosterRecords}>View All</button>}/>
    <div className="grid two"><Table title="Unassigned Trips" columns={['flight','sector','need','status']} rows={visibleOpenTrips} actions={!viewAll && <button className="viewAllBtn" onClick={viewAllRosterRecords}>View All</button>}/><Table title="Rotation Details" columns={['crewId','rank','base','fleet','status','training']} rows={visibleRosterCrew} actions={!viewAll && <button className="viewAllBtn" onClick={viewAllRosterRecords}>View All</button>}/></div>
  </>;
}
function Demand() {
  const [startDate,setStartDate]=useState('2026-06-01');
  const [endDate,setEndDate]=useState('2026-06-30');
  const [selectedKpi,setSelectedKpi]=useState('Schedule Rows');
  const range=getOpsRange(startDate,endDate);
  const demandGapFlights = range.flights.filter(flight => ['Missing CC','Open trip'].includes(flight.status));
  const aircraftSwapRecords = range.exceptions
    .filter(exception => exception.type === 'Aircraft swap')
    .map(exception => {
      const flight = range.flights.find(item => item.flight === exception.flight) || {};
      return { ...exception, sector: flight.sector, aircraft: flight.aircraft, std: flight.std, status: flight.status || 'Swap review' };
    });
  const importHealthRows = range.days.map(day => ({
    date: day.date,
    scheduleRows: day.flights.length,
    demandGaps: day.flights.filter(flight => ['Missing CC','Open trip'].includes(flight.status)).length,
    aircraftSwaps: day.exceptions.filter(exception => exception.type === 'Aircraft swap').length,
    importStatus: day.exceptionCount > 20 ? 'Review' : 'OK'
  }));
  const items=[
    {label:'Schedule Rows',value:range.flights.length,note:`${range.days.length} June day(s) selected`,tone:'info'},
    {label:'Demand Gaps',value:demandGapFlights.length,note:'missing crew mapping',tone:'warn'},
    {label:'Aircraft Swaps',value:aircraftSwapRecords.length,note:'selected range',tone:'risk'},
    {label:'Import Health',value:importHealthRows.every(row => row.importStatus === 'OK') ? 'OK' : 'Review',note:'June schedule sync',tone:importHealthRows.every(row => row.importStatus === 'OK') ? 'ok' : 'warn'}
  ];
  const tableConfigs={
    'Schedule Rows': { title:'Complete Flight Demand Packages', columns:['date','flight','sector','std','sta','aircraft','need','status'], rows:range.flights },
    'Demand Gaps': { title:'Complete Demand Gap Records', columns:['date','flight','sector','std','sta','aircraft','need','status'], rows:demandGapFlights },
    'Aircraft Swaps': { title:'Complete Aircraft Swap Records', columns:['date','type','flight','sector','std','aircraft','status','sla','priority','owner'], rows:aircraftSwapRecords },
    'Import Health': { title:'Complete Import Health by June Date', columns:['date','scheduleRows','demandGaps','aircraftSwaps','importStatus'], rows:importHealthRows }
  };
  const cfg=tableConfigs[selectedKpi];
  return <>
    <DateRangePicker startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate}/>
    <Kpis items={items.map(item => ({...item, selected: item.label === selectedKpi}))} onSelect={k=>setSelectedKpi(k.label)}/>
    <Table title={cfg.title} columns={cfg.columns} rows={cfg.rows} actions={<button className="downloadBtn" onClick={()=>exportCsv(`demand-${selectedKpi.toLowerCase().replaceAll(' ','-')}-${startDate}-to-${endDate}.csv`, cfg.rows)}><Download size={15}/> Download CSV</button>}/>
  </>;
}

function useJuneKpiRange(defaultKpi) {
  const [startDate,setStartDate]=useState('2026-06-01');
  const [endDate,setEndDate]=useState('2026-06-30');
  const [selectedKpi,setSelectedKpi]=useState(defaultKpi);
  const range=getOpsRange(startDate,endDate);
  return { startDate, endDate, setStartDate, setEndDate, selectedKpi, setSelectedKpi, range };
}

function KpiDrivenScreen({ state, items, tableConfigs, children }) {
  const cfg=tableConfigs[state.selectedKpi];
  return <>
    <DateRangePicker startDate={state.startDate} endDate={state.endDate} setStartDate={state.setStartDate} setEndDate={state.setEndDate}/>
    <Kpis items={items.map(item => ({...item, selected: item.label === state.selectedKpi}))} onSelect={k=>state.setSelectedKpi(k.label)}/>
    {children}
    <Table title={cfg.title} columns={cfg.columns} rows={cfg.rows} actions={<button className="downloadBtn" onClick={()=>exportCsv(`${state.selectedKpi.toLowerCase().replaceAll(' ','-')}-${state.startDate}-to-${state.endDate}.csv`, cfg.rows)}><Download size={15}/> Download CSV</button>}/>
  </>;
}

function Crew({ crewDirectory = mockData.crew }) {
  const state=useJuneKpiRange('Active Crew');
  const expiringCrew=crewDirectory.filter(crew => crew.status.includes('expiring') || crew.medical === 'Expiring' || crew.training.includes('due'));
  const qualifiedCrew=crewDirectory.filter(crew => crew.status === 'Ready' && crew.medical === 'Valid');
  const dataGapCrew=crewDirectory.filter(crew => crew.license === 'N/A' || crew.status !== 'Ready');
  const items=[{label:'Active Crew',value:crewDirectory.length,note:`${state.range.days.length} June day(s) selected`,tone:'info'},{label:'Expiring Docs',value:expiringCrew.length,note:'within June review window',tone:'warn'},{label:'Qualified Pool',value:`${Math.round((qualifiedCrew.length/crewDirectory.length)*100)}%`,note:'eligible for schedule',tone:'ok'},{label:'Data Gaps',value:dataGapCrew.length,note:'maker-checker queue',tone:'risk'}];
  const tableConfigs={
    'Active Crew': { title:'Crew 360 Active Crew Results', columns:['crewId','name','rank','base','fleet','status','medical','license','training'], rows:crewDirectory },
    'Expiring Docs': { title:'Crew 360 Expiring Document Results', columns:['crewId','name','rank','base','fleet','status','medical','license','training'], rows:expiringCrew },
    'Qualified Pool': { title:'Crew 360 Qualified Pool Results', columns:['crewId','name','rank','base','fleet','status','medical','license','training'], rows:qualifiedCrew },
    'Data Gaps': { title:'Crew 360 Data Gap Results', columns:['crewId','name','rank','base','fleet','status','medical','license','training'], rows:dataGapCrew }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><Gantt title="Qualification & Validity Timeline" rows={8}/><MiniChart title="June Crew Readiness Trend"/></div></KpiDrivenScreen>;
}
function Ops() {
  const state=useJuneKpiRange('Due Check-ins');
  const due=state.range.checkins;
  const late=due.filter(row => row.status === 'Late');
  const noShowRisk=state.range.exceptions.filter(row => row.type === 'No-show');
  const mcReview=state.range.exceptions.filter(row => row.type === 'Medical review');
  const items=[{label:'Due Check-ins',value:due.length,note:'selected June range',tone:'info'},{label:'Late',value:late.length,note:'escalated',tone:'warn'},{label:'No-show Risk',value:noShowRisk.length,note:'recovery ready',tone:'risk'},{label:'MC Review',value:mcReview.length,note:'pending OCC',tone:'info'}];
  const tableConfigs={
    'Due Check-ins': { title:'Due Check-in Results', columns:['date','crew','flight','report','actual','status','evidence'], rows:due },
    'Late': { title:'Late Check-in Results', columns:['date','crew','flight','report','actual','status','evidence'], rows:late },
    'No-show Risk': { title:'No-show Risk Results', columns:['date','type','crew','flight','sla','priority','owner'], rows:noShowRisk },
    'MC Review': { title:'Medical Certificate Review Results', columns:['date','type','crew','flight','sla','priority','owner'], rows:mcReview }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><MiniChart title="June Attendance Trend"/><Table title="Absence Desk" columns={['caseId','issue','flight','priority','status']} rows={mockData.recoveryCases}/></div></KpiDrivenScreen>;
}
function Recovery({ crewDirectory = mockData.crew }) {
  const state=useJuneKpiRange('Disruptions');
  const disruptions=state.range.exceptions.filter(row => row.priority !== 'Low');
  const reservePool=crewDirectory.filter(crew => ['Ready','Standby'].includes(crew.status));
  const bestOptions=[{crew:'CPT Amir',why:'same base, rest OK',score:96},{crew:'CPT Shafiq',why:'reserve, fleet OK',score:91},{crew:'CPT Nadia',why:'legal but low rest',score:79}];
  const protectedFlights=state.range.flights.filter(row => row.status === 'Crewed');
  const items=[{label:'Disruptions',value:disruptions.length,note:'active cases',tone:'risk'},{label:'Reserve Pool',value:reservePool.length,note:'available in June range',tone:'ok'},{label:'Best Option ETA',value:'14m',note:'legal replacement',tone:'info'},{label:'OTP Protected',value:protectedFlights.length,note:'flights saved',tone:'info'}];
  const tableConfigs={
    'Disruptions': { title:'Recovery Disruption Results', columns:['date','type','crew','flight','sla','priority','owner'], rows:disruptions },
    'Reserve Pool': { title:'Available Reserve Pool Results', columns:['crewId','name','rank','base','fleet','status'], rows:reservePool },
    'Best Option ETA': { title:'Best Replacement Option Results', columns:['crew','why','score'], rows:bestOptions },
    'OTP Protected': { title:'OTP Protected Flight Results', columns:['date','flight','sector','std','sta','aircraft','need','status'], rows:protectedFlights }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><Table title="Recovery Cases" columns={['caseId','issue','flight','priority','status']} rows={mockData.recoveryCases}/><Gantt title="Before / After Recovery Timeline" rows={4}/></div></KpiDrivenScreen>;
}
function Optimizer({ crewDirectory = mockData.crew }) {
  const state=useJuneKpiRange('Scenario A Cost');
  const scenarioRows=[{metric:'Open trips',base:19,optimized:3},{metric:'Overtime hrs',base:420,optimized:278},{metric:'Standby days',base:188,optimized:172},{metric:'Free weekends equity',base:'61%',optimized:'83%'},{metric:'Line checks due',base:14,optimized:4}];
  const fatigueRows=state.range.exceptions.filter(row => ['Rest risk','Medical review'].includes(row.type));
  const preferenceRows=crewDirectory.map(crew => ({crewId:crew.crewId,name:crew.name,rank:crew.rank,base:crew.base,preference:'Granted',stability:`${state.range.avgStability}%`}));
  const items=[{label:'Scenario A Cost',value:'MYR 1.82M',note:`${state.range.days.length} June day(s) baseline`,tone:'info'},{label:'Scenario B Cost',value:'MYR 1.75M',note:'4.1% saving',tone:'ok'},{label:'Preference Grant',value:'74%',note:'within stability cap',tone:'info'},{label:'Fatigue Risk',value:fatigueRows.length,note:'warnings in range',tone:'warn'}];
  const tableConfigs={
    'Scenario A Cost': { title:'Scenario A Baseline Results', columns:['metric','base','optimized'], rows:scenarioRows },
    'Scenario B Cost': { title:'Scenario B Optimized Results', columns:['metric','base','optimized'], rows:scenarioRows },
    'Preference Grant': { title:'Preference Grant Results', columns:['crewId','name','rank','base','preference','stability'], rows:preferenceRows },
    'Fatigue Risk': { title:'Fatigue Risk Results', columns:['date','type','crew','flight','sla','priority','owner'], rows:fatigueRows }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><MiniChart title="Annual Block Hours Distribution"/><Gantt title="Optimization Impact Preview" rows={5}/></div></KpiDrivenScreen>;
}
function Rules() {
  const state=useJuneKpiRange('Rules Checked');
  const hardBlocks=mockData.rules.filter(rule => rule.severity === 'Hard' && rule.result === 'Fail');
  const softWarnings=mockData.rules.filter(rule => rule.severity === 'Soft' || rule.result === 'Warn');
  const overrides=state.range.exceptions.filter(row => row.priority === 'Med').slice(0, 20).map(row => ({...row, overrideReason:'Supervisor approval'}));
  const items=[{label:'Rules Checked',value:state.range.flights.length + state.range.checkins.length,note:'selected June roster build',tone:'info'},{label:'Hard Blocks',value:hardBlocks.length,note:'must resolve',tone:'risk'},{label:'Soft Warnings',value:softWarnings.length,note:'review required',tone:'warn'},{label:'Overrides',value:overrides.length,note:'reason captured',tone:'info'}];
  const tableConfigs={
    'Rules Checked': { title:'Rules Checked Results', columns:['rule','result','action','severity'], rows:mockData.rules },
    'Hard Blocks': { title:'Hard Block Results', columns:['rule','result','action','severity'], rows:hardBlocks },
    'Soft Warnings': { title:'Soft Warning Results', columns:['rule','result','action','severity'], rows:softWarnings },
    'Overrides': { title:'Override Results', columns:['date','type','crew','flight','priority','owner','overrideReason'], rows:overrides }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><Table title="Rule Configuration Preview" columns={['parameter','value','type']} rows={[{parameter:'Min rest',value:'12h',type:'Hard'},{parameter:'Expiry alert',value:'90 days',type:'Soft'},{parameter:'Max consecutive duty',value:'6',type:'Hard'},{parameter:'Check-in window',value:'90m',type:'Soft'}]}/></KpiDrivenScreen>;
}
function Reports({ crewDirectory = mockData.crew }) {
  const state=useJuneKpiRange('Utilization');
  const utilizationRows=crewDirectory.map((crew, index) => ({crewId:crew.crewId,name:crew.name,rank:crew.rank,base:crew.base,utilization:`${72 + index * 3}%`}));
  const overtimeRows=state.range.exceptions.filter(row => row.type === 'Rest risk');
  const unassignedRows=state.range.flights.filter(row => ['Missing CC','Open trip'].includes(row.status));
  const payrollRows=state.range.checkins.filter(row => row.status !== 'Pending');
  const items=[{label:'Utilization',value:'76%',note:'fleet weighted',tone:'info'},{label:'Overtime',value:overtimeRows.length,note:'rest risk proxy',tone:'ok'},{label:'Unassigned Trips',value:unassignedRows.length,note:'after optimizer',tone:'warn'},{label:'Payroll Ready',value:`${Math.round((payrollRows.length/state.range.checkins.length)*100)}%`,note:'selected range',tone:'ok'}];
  const tableConfigs={
    'Utilization': { title:'Crew Utilization Results', columns:['crewId','name','rank','base','utilization'], rows:utilizationRows },
    'Overtime': { title:'Overtime / Rest Risk Results', columns:['date','type','crew','flight','sla','priority','owner'], rows:overtimeRows },
    'Unassigned Trips': { title:'Unassigned Trip Results', columns:['date','flight','sector','std','sta','aircraft','need','status'], rows:unassignedRows },
    'Payroll Ready': { title:'Payroll Ready Check-in Results', columns:['date','crew','flight','report','actual','status','evidence'], rows:payrollRows }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><MiniChart title="Crew Utilization by Rank"/><MiniChart title="Standby and Overtime Trend"/></div></KpiDrivenScreen>;
}
function Backend({apiUrl,setApiUrlState,saveUrl, crewDirectory = mockData.crew}) {
  const state=useJuneKpiRange('Webhook Calls');
  const sheetRows=[{sheet:'Crew_Master',records:crewDirectory.length,status:'OK'},{sheet:'Roster_Published',records:state.range.flights.length,status:'OK'},{sheet:'CheckIns',records:state.range.checkins.length,status:'OK'},{sheet:'Recovery_Cases',records:state.range.exceptions.length,status:'OK'},{sheet:'Audit_Log',records:state.range.days.length * 42,status:'OK'}];
  const apiRows=[{endpoint:'/crew/login',latency:'280ms',status:'OK'},{endpoint:'/roster/get',latency:'310ms',status:'OK'},{endpoint:'/checkin/post',latency:'255ms',status:'OK'},{endpoint:'/absence/post',latency:'420ms',status:'OK'},{endpoint:'/notify',latency:'Retry',status:'Warn'}];
  const failedRows=apiRows.filter(row => row.status !== 'OK');
  const items=[{label:'Webhook Calls',value:state.range.days.length * 161,note:'selected June range',tone:'info'},{label:'Failed Jobs',value:failedRows.length,note:'retry queued',tone:'risk'},{label:'Sheets Sync',value:'Live',note:'June workbook sync',tone:'ok'},{label:'Active Users',value:crewDirectory.length + 31,note:'web + mobile',tone:'info'}];
  const tableConfigs={
    'Webhook Calls': { title:'Webhook Call Results', columns:['endpoint','latency','status'], rows:apiRows },
    'Failed Jobs': { title:'Failed Job Results', columns:['endpoint','latency','status'], rows:failedRows },
    'Sheets Sync': { title:'Database + API Sync Results', columns:['sheet','records','status'], rows:sheetRows },
    'Active Users': { title:'Active User Results', columns:['crewId','name','rank','base','fleet','status'], rows:crewDirectory }
  };
  return <KpiDrivenScreen state={state} items={items} tableConfigs={tableConfigs}><div className="grid two"><Table title="Database Map" columns={['sheet','records','status']} rows={sheetRows}/><Table title="Api Monitor" columns={['endpoint','latency','status']} rows={apiRows}/></div></KpiDrivenScreen>;
}
function buildCopilotAnswer(question, crewDirectory = mockData.crew) {
  const text = question.trim().toLowerCase();
  const glossaryHit = glossaryAnswer(question);
  const range = getOpsRange('2026-06-01', '2026-06-30');
  const gapFlights = range.flights.filter(flight => ['Missing CC','Open trip','Delay risk'].includes(flight.status));
  const priorityExceptions = range.exceptions.filter(exception => exception.priority !== 'Low');
  const expiringCrew = crewDirectory.filter(crew => crew.status.includes('expiring') || crew.medical === 'Expiring' || crew.training.includes('due'));
  const readyCrew = crewDirectory.filter(crew => ['Ready','Standby'].includes(crew.status));

  if (!question.trim()) return 'Ask about flights, crew, exceptions, recovery, KPIs, users or ACMS acronyms.';
  if (!glossaryHit.includes('could not find') && (text.includes('mean') || glossaryTerms.some(item => text.includes(item.acronym.toLowerCase())))) return glossaryHit;
  if (text.includes('missing') || text.includes('gap') || text.includes('unassigned')) return `Fast answer: ${gapFlights.length} crew-risk flights need action. Prioritize ${gapFlights.slice(0, 5).map(flight => `${flight.flight} (${flight.status}, ${flight.need})`).join(', ')}. Use ready/standby crew from ${readyCrew.length} available records, validate legality, then publish the affected roster.`;
  if (text.includes('exception') || text.includes('summarize')) return `Fast answer: ${priorityExceptions.length} high/medium exceptions across June. Top queues: ${priorityExceptions.slice(0, 6).map(item => `${item.type} for ${item.crew} on ${item.flight}`).join('; ')}. Work high-priority no-shows first, then rest and aircraft-swap risks.`;
  if (text.includes('license') || text.includes('expir') || text.includes('document') || text.includes('training')) return `Fast answer: ${expiringCrew.length} crew records need document or qualification review: ${expiringCrew.map(crew => `${crew.crewId} ${crew.name} (${crew.status}, ${crew.training})`).join('; ') || 'none'}.`;
  if (text.includes('recovery') || text.includes('fy3124')) return 'Fast answer: for FY3124, open a recovery case, call the same-base standby CPT first, confirm rest and fleet legality, notify OCC, then republish the roster once the replacement accepts.';
  if (text.includes('brief') || text.includes('occ')) return `OCC briefing draft: ${range.flights.length} June sectors loaded, ${gapFlights.length} crew-risk flights, ${priorityExceptions.length} priority exceptions and ${readyCrew.length} ready/standby crew available. Focus on no-shows, rest risks and missing cabin crew before departure banks.`;
  if (text.includes('user') || text.includes('admin')) return `Fast answer: Admin can provision users and crew members. The current directory has ${crewDirectory.length} crew-visible user records that flow into Crew 360, Roster, Recovery, Analytics and Backend active-user views.`;
  return `Fast answer: I found ${crewDirectory.length} crew records, ${range.flights.length} June flight rows, ${priorityExceptions.length} priority exceptions and ${readyCrew.length} ready/standby crew. Ask for missing crew, exceptions, recovery, expiring documents, users or an acronym for a targeted answer.`;
}

function Copilot({ crewDirectory = mockData.crew }) {
  const [q,setQ]=useState('Show flights with missing crew and recommend recovery');
  const [answer,setAnswer]=useState('Ask a question to search instantly across roster, crew, check-ins, exceptions, users and the acronym glossary.');
  function ask(){
    const instantAnswer = buildCopilotAnswer(q, crewDirectory);
    setAnswer(instantAnswer);
    callAcms('aiCopilot',{question:q, glossary: glossaryTerms, crew: crewDirectory})
      .then(res => { if (res?.answer) setAnswer(res.answer); })
      .catch(() => {});
  }
  return <div className="card copilot"><div className="cardTitle">AI Copilot · Fast Answers</div><div className="searchbar"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about rosters, recovery, KPIs, users or an acronym..."/><button onClick={ask}>Ask</button></div><div className="answer">{answer}</div><div className="quickQs">{['What does FDP mean?','Summarize open exceptions','Who has license expiring in 30 days?','Explain recovery option for FY3124','How many users are crew-visible?','Draft OCC briefing'].map(x=><button key={x} onClick={()=>setQ(x)}>{x}</button>)}</div></div>;
}

function Glossary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [question, setQuestion] = useState('What does FDP mean?');
  const [answer, setAnswer] = useState('Ask the glossary copilot to explain any acronym, category or operational phrase.');
  const categories = ['All', ...Array.from(new Set(glossaryTerms.map(item => item.category))).sort()];
  const filtered = glossaryTerms.filter(item => {
    const haystack = [item.acronym, item.term, item.category, item.detail].join(' ').toLowerCase();
    return (category === 'All' || item.category === category) && haystack.includes(query.toLowerCase());
  });
  function askGlossary() { setAnswer(glossaryAnswer(question)); }
  return <>
    <div className="glossaryHero card">
      <div><div className="cardTitle">Acronym Dictionary</div><p>Search every acronym used across ACMS screens, roster codes, crew roles, flight timing, compliance controls, airports and backend integrations.</p></div>
      <div className="glossarySearch"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search acronym, meaning, category or detail..."/></div>
    </div>
    <div className="filters glossaryFilters">{categories.map(item => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="grid two glossaryLayout">
      <div className="glossaryGrid">{filtered.map(item => <article className="card glossaryTerm" key={item.acronym}><span>{item.category}</span><h3>{item.acronym}</h3><b>{item.term}</b><p>{item.detail}</p></article>)}</div>
      <div className="card copilot glossaryCopilot"><div className="cardTitle">Glossary AI Copilot</div><div className="searchbar"><Bot size={18}/><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask what an acronym means..."/><button onClick={askGlossary}>Ask</button></div><div className="answer">{answer}</div><div className="quickQs">{['What does FB mean?','What is RBAC?','Show roster codes','What does STD mean?'].map(x=><button key={x} onClick={()=>setQuestion(x)}>{x}</button>)}</div></div>
    </div>
  </>;
}

function Admin({ crewDirectory = mockData.crew, setCrewDirectory }) {
  const [form, setForm] = useState({ name:'', role:'Crew', rank:'CC', base:'KUL', fleet:'ATR', status:'Ready' });
  const userRows = [
    {role:'Crew',users:crewDirectory.length,scope:'Self service + Crew 360'},
    {role:'Planner',users:24,scope:'Roster build'},
    {role:'OCC',users:18,scope:'Ops control'},
    {role:'Admin',users:7,scope:'System'}
  ];
  function updateForm(field, value) { setForm(current => ({ ...current, [field]: value })); }
  function addUser(event) {
    event.preventDefault();
    if (!form.name.trim() || !setCrewDirectory) return;
    const prefix = form.role === 'Crew' ? form.rank : form.role.toUpperCase().slice(0, 3);
    const newCrew = {
      crewId: `${prefix}-${Date.now().toString().slice(-4)}`,
      name: form.name.trim(),
      rank: form.role === 'Crew' ? form.rank : form.role,
      base: form.base,
      fleet: form.fleet,
      status: form.status,
      medical: 'Valid',
      license: form.rank === 'CC' ? 'N/A' : 'Valid',
      training: 'Valid'
    };
    setCrewDirectory(current => [...current, newCrew]);
    setForm(current => ({ ...current, name:'' }));
  }
  return <>
    <div className="grid two">
      <div className="card adminProvision">
        <div className="cardTitle">Add User / Crew Member</div>
        <form onSubmit={addUser}>
          <label>Name<input value={form.name} onChange={e=>updateForm('name', e.target.value)} placeholder="Enter user or crew name"/></label>
          <label>Access role<select value={form.role} onChange={e=>updateForm('role', e.target.value)}>{['Crew','Planner','OCC','Admin'].map(role => <option key={role}>{role}</option>)}</select></label>
          <label>Rank<select value={form.rank} onChange={e=>updateForm('rank', e.target.value)}>{['CC','FO','CPT'].map(rank => <option key={rank}>{rank}</option>)}</select></label>
          <label>Base<select value={form.base} onChange={e=>updateForm('base', e.target.value)}>{['KUL','PEN','BKI','SZB','JHB'].map(base => <option key={base}>{base}</option>)}</select></label>
          <label>Fleet<select value={form.fleet} onChange={e=>updateForm('fleet', e.target.value)}>{['ATR','B737'].map(fleet => <option key={fleet}>{fleet}</option>)}</select></label>
          <label>Status<select value={form.status} onChange={e=>updateForm('status', e.target.value)}>{['Ready','Standby','Training','Leave','Unavailable'].map(status => <option key={status}>{status}</option>)}</select></label>
          <button className="downloadBtn" type="submit">Add to system</button>
        </form>
      </div>
      <Table title="Users & RBAC" columns={['role','users','scope']} rows={userRows}/>
      <Table title="Rule Configuration" columns={['parameter','value','type']} rows={[{parameter:'Min rest',value:'12h',type:'Hard'},{parameter:'Max FDP',value:'13h',type:'Hard'},{parameter:'Medical expiry alert',value:'90/60/30d',type:'Soft'},{parameter:'Geo check-in',value:'Enabled',type:'Control'}]}/>
      <Table title="Provisioned Crew Directory" columns={['crewId','name','rank','base','fleet','status']} rows={crewDirectory}/>
    </div>
    <div className="card checklist"><div className="cardTitle">System Health Checklist</div>{['Daily trigger installed','Backup scheduled','Webhook deployment active','Protected ranges enabled','Audit logging enabled'].map(x=><p key={x}><CheckCircle2 size={16}/>{x}</p>)}</div>
  </>;
}
function MiniChart({title}) { const bars=[30,62,48,82,68,96,74]; return <div className="card chart"><div className="cardTitle">{title}</div><div className="bars">{bars.map((b,i)=><span key={i} style={{height:b+'%'}}><small>W{i+1}</small></span>)}</div></div>; }

function Screen(props) { const m = { command:<Command setActive={props.setActive}/>, flightsDetail:<DetailScreen type="flightsDetail"/>, exceptionsDetail:<DetailScreen type="exceptionsDetail"/>, checkinsDetail:<DetailScreen type="checkinsDetail"/>, stabilityDetail:<DetailScreen type="stabilityDetail"/>, roster:<Roster crewDirectory={props.crewDirectory}/>, demand:<Demand/>, crew:<Crew crewDirectory={props.crewDirectory}/>, ops:<Ops/>, allowances:<AllowanceModule/>, attendance:<AttendanceModule/>, policies:<PoliciesModule/>, recovery:<Recovery crewDirectory={props.crewDirectory}/>, optimizer:<Optimizer crewDirectory={props.crewDirectory}/>, rules:<Rules/>, reports:<Reports crewDirectory={props.crewDirectory}/>, backend:<Backend {...props}/>, copilot:<Copilot crewDirectory={props.crewDirectory}/>, admin:<Admin crewDirectory={props.crewDirectory} setCrewDirectory={props.setCrewDirectory}/>, glossary:<Glossary/> }; return <section className="screen">{m[props.active]}</section>; }

createRoot(document.getElementById('root')).render(<Shell />);
