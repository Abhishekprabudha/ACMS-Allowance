import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Banknote, Calculator, CheckCircle2, ChevronRight, CircleDollarSign, Download, FileCheck2, History, Mail, Plus, Printer, RefreshCw, Search, Send, SlidersHorizontal, Users, WalletCards, X } from 'lucide-react';
import { calculateAllowanceStatement, formatHours, MEAL_RATES, POLICY_VERSION } from '../allowanceEngine.js';
import { approveAllowanceStatement, distributeAllowanceStatement, loadAllowanceWorkspace, saveAllowanceAdjustment } from '../backendServices.js';

const money = value => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(Number(value || 0));
const readableDate = value => value ? new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`statusPill ${tone}`}>{children}</span>;
}

function Metric({ icon: Icon, label, value, note, tone = 'blue' }) {
  return <article className={`moduleMetric ${tone}`}><div className="metricIcon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

function ProgressRail({ status }) {
  const steps = ['Roster imported', 'Validated', 'Calculated', 'Reviewed', 'Approved', 'Distributed', 'Payroll'];
  const index = status === 'Distributed' ? 5 : status === 'Approved' ? 4 : status === 'Ready for review' ? 2 : 1;
  return <div className="progressRail">{steps.map((step, stepIndex) => <React.Fragment key={step}><div className={stepIndex <= index ? 'progressStep done' : 'progressStep'}><span>{stepIndex < index ? '✓' : stepIndex + 1}</span><b>{step}</b></div>{stepIndex < steps.length - 1 ? <ChevronRight size={16}/> : null}</React.Fragment>)}</div>;
}

function SummaryBreakdown({ statement }) {
  const rows = [
    ['Productivity allowance', statement.breakdown.productivity],
    ['Productivity incentive', statement.breakdown.incentive],
    ['FDP extension', statement.breakdown.fdpExtension],
    ['Meal allowance', statement.breakdown.meals],
    ['Night-stop allowance', statement.breakdown.nightStop],
    ['Instructor / examiner', statement.breakdown.instructor],
    ['Training productivity', statement.breakdown.training],
    ['Management assignment', statement.breakdown.management],
    ['Transportation', statement.breakdown.transport],
    ['Other entitlements', statement.breakdown.other]
  ];
  return <div className="allowanceBreakdown">
    {rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{money(value)}</b></div>)}
    <div className="subtotal"><span>Current month total</span><b>{money(statement.currentMonthTotal)}</b></div>
    <div><span>Prior-period adjustments</span><b>{money(statement.adjustmentTotal)}</b></div>
    <div className="grandTotal"><span>Final grand total</span><b>{money(statement.grandTotal)}</b></div>
  </div>;
}

function AllowanceMatrix({ statement }) {
  return <div className="allowanceMatrixWrap">
    <table className="allowanceMatrix">
      <thead>
        <tr>
          <th rowSpan="2">Date</th><th rowSpan="2">Flight numbers</th><th rowSpan="2">Duty</th><th rowSpan="2">Sector(s)</th>
          <th colSpan="4">Flying duty (min)</th><th rowSpan="2">Block</th><th rowSpan="2">FDP extension</th>
          <th colSpan="5">Layover / night stop</th><th colSpan="5">Training / instructor</th><th colSpan="3">Misc.</th>
        </tr>
        <tr>
          <th>Operating</th><th>Paxing</th><th>Diversion / ATB</th><th>Return to chock</th>
          <th>Layover</th><th>Region</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th>
          <th>Check flight</th><th>Sim trainee</th><th>Sim trainer</th><th>Instruction</th><th>Ground duty</th>
          <th>Others</th><th>Detail</th><th>Remarks</th>
        </tr>
      </thead>
      <tbody>{statement.records.map(row => <tr key={row.recordId}>
        <td>{row.dutyDate}</td><td>{row.flightNumbers}</td><td>{row.duty}</td><td>{row.sectors}</td>
        <td>{row.operatingMinutes}</td><td>{row.paxingMinutes || '—'}</td><td>{row.diversionAtbMinutes || '—'}</td><td>{row.returnToChockMinutes || '—'}</td>
        <td>{row.blockMinutes}</td><td>{row.fdpExtensionMinutes || '—'}</td><td>{row.layoverMinutes || '—'}</td><td>{row.nightStopRegion}</td>
        <td>{row.breakfast || '—'}</td><td>{row.lunch || '—'}</td><td>{row.dinner || '—'}</td>
        <td>{row.checkFlightMinutes || '—'}</td><td>{row.simTraineeMinutes || '—'}</td><td>{row.simTrainerMinutes || '—'}</td><td>{row.instructionMinutes || row.examinerMinutes || '—'}</td><td>{row.groundDutyDays || '—'}</td>
        <td>{row.otherAmount ? money(row.otherAmount) : '—'}</td><td>{row.otherDetail || '—'}</td><td>{row.remarks || '—'}</td>
      </tr>)}</tbody>
      <tfoot><tr><td colSpan="4">Monthly totals</td><td>{formatHours(statement.records.reduce((sum, item) => sum + Number(item.operatingMinutes || 0), 0))}</td><td>{formatHours(statement.records.reduce((sum, item) => sum + Number(item.paxingMinutes || 0), 0))}</td><td colSpan="2">—</td><td>{formatHours(statement.breakdown.blockMinutes)}</td><td>{formatHours(statement.records.reduce((sum, item) => sum + Number(item.fdpExtensionMinutes || 0), 0))}</td><td colSpan="14">Policy {statement.policyVersion}</td></tr></tfoot>
    </table>
  </div>;
}

function AdjustmentDialog({ statement, onClose, onSaved }) {
  const [form, setForm] = useState({ date: `${statement.period}-28`, details: '', amount: '', status: 'Approved' });
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!form.details.trim() || Number.isNaN(Number(form.amount))) return;
    setSaving(true);
    const result = await saveAllowanceAdjustment({ ...form, amount: Number(form.amount), crewId: statement.crew.crewId, period: statement.period });
    setSaving(false);
    if (result.ok) onSaved(result.data);
  }
  return <div className="modalBackdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="moduleModal">
    <header><div><span>Adjustment control</span><h3>Add discrepancy or prior-period adjustment</h3></div><button onClick={onClose}><X size={18}/></button></header>
    <form onSubmit={submit} className="moduleForm">
      <label>Effective date<input type="date" value={form.date} onChange={event => setForm({...form, date: event.target.value})}/></label>
      <label>Amount (MYR)<input type="number" step="0.01" value={form.amount} onChange={event => setForm({...form, amount: event.target.value})} placeholder="Use negative value for recovery"/></label>
      <label className="wide">Reason and calculation detail<textarea value={form.details} onChange={event => setForm({...form, details: event.target.value})} placeholder="Reference the discrepancy, source period and approved calculation basis."/></label>
      <label>Status<select value={form.status} onChange={event => setForm({...form, status: event.target.value})}><option>Draft</option><option>Approved</option></select></label>
      <div className="wide modalActions"><button type="button" className="secondaryAction" onClick={onClose}>Cancel</button><button className="primaryAction" disabled={saving}>{saving ? 'Saving…' : 'Save adjustment'}</button></div>
    </form>
  </section></div>;
}

function PrintableStatement({ statement }) {
  const printStatement = () => {
    const rows = statement.records.map(record => `<tr><td>${record.dutyDate}</td><td>${record.flightNumbers}</td><td>${record.duty}</td><td>${record.sectors}</td><td>${record.operatingMinutes}</td><td>${record.blockMinutes}</td><td>${record.fdpExtensionMinutes || 0}</td><td>${record.nightStopRegion}</td><td>${record.breakfast || 0}/${record.lunch || 0}/${record.dinner || 0}</td><td>${record.remarks || ''}</td></tr>`).join('');
    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${statement.statementId}</title><style>body{font-family:Arial,sans-serif;color:#0b2545;padding:32px}header{display:flex;justify-content:space-between;border-bottom:3px solid #0b4f86;padding-bottom:18px}h1{margin:0;font-size:25px}small{color:#5f6f82}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.meta div{border:1px solid #ccd7e3;padding:10px;border-radius:8px}.meta b,.meta span{display:block}.meta span{font-size:11px;color:#63758a;margin-bottom:4px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#0b4f86;color:white}th,td{border:1px solid #cdd7e2;padding:7px;text-align:left}.totals{margin-left:auto;margin-top:18px;width:420px}.totals div{display:flex;justify-content:space-between;padding:7px;border-bottom:1px solid #dbe3ec}.totals .grand{font-size:18px;font-weight:bold;background:#e9f4ff}.foot{margin-top:28px;color:#68798d;font-size:10px}@media print{button{display:none}}</style></head><body><header><div><h1>Firefly Crew Productivity Allowances</h1><small>Governed ACMS allowance statement</small></div><div><b>${statement.period}</b><br/><small>${statement.statementId}</small></div></header><section class="meta"><div><span>Name</span><b>${statement.crew.name}</b></div><div><span>Staff ID</span><b>${statement.crew.staffId}</b></div><div><span>Rank / Grade</span><b>${statement.crew.rank} · ${statement.crew.grade}</b></div><div><span>Base / Fleet</span><b>${statement.crew.base} · ${statement.crew.fleet}</b></div></section><table><thead><tr><th>Date</th><th>Flight</th><th>Duty</th><th>Sectors</th><th>Operating min</th><th>Block min</th><th>FDP ext.</th><th>Region</th><th>B/L/D</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Productivity</span><b>${money(statement.breakdown.productivity)}</b></div><div><span>Incentive</span><b>${money(statement.breakdown.incentive)}</b></div><div><span>Meals</span><b>${money(statement.breakdown.meals)}</b></div><div><span>Night stop</span><b>${money(statement.breakdown.nightStop)}</b></div><div><span>Other allowances</span><b>${money(statement.currentMonthTotal-statement.breakdown.productivity-statement.breakdown.incentive-statement.breakdown.meals-statement.breakdown.nightStop)}</b></div><div><span>Adjustments</span><b>${money(statement.adjustmentTotal)}</b></div><div class="grand"><span>Final grand total</span><b>${money(statement.grandTotal)}</b></div></section><p class="foot">Policy version: ${statement.policyVersion}. Generated ${readableDate(statement.calculatedAt)}. This statement retains traceability to actual roster rows, rates, adjustments, approvals and distribution history.</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };
  return <button className="secondaryAction" onClick={printStatement}><Printer size={16}/> Print / save PDF</button>;
}

export default function AllowanceModule() {
  const [month, setMonth] = useState('2026-06');
  const [crewType, setCrewType] = useState('All');
  const [query, setQuery] = useState('');
  const [workspace, setWorkspace] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('demo');
  const [adjusting, setAdjusting] = useState(false);

  async function refresh() {
    setLoading(true); setMessage('');
    const result = await loadAllowanceWorkspace(month);
    setWorkspace(result.data);
    setSource(result.source);
    setSelectedId(current => current || result.data?.statements?.[0]?.statementId || '');
    setLoading(false);
  }
  useEffect(() => { refresh(); }, [month]);

  const statements = useMemo(() => (workspace?.statements || []).filter(statement => {
    if (crewType !== 'All' && statement.crew.crewType !== crewType) return false;
    const haystack = `${statement.crew.name} ${statement.crew.crewId} ${statement.crew.grade}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [workspace, crewType, query]);
  const selected = statements.find(statement => statement.statementId === selectedId) || statements[0] || workspace?.statements?.[0];
  useEffect(() => { if (statements.length && !statements.some(item => item.statementId === selectedId)) setSelectedId(statements[0].statementId); }, [statements, selectedId]);

  const payrollTotal = workspace?.statements?.reduce((total, item) => total + Number(item.grandTotal || 0), 0) || 0;
  const reviewCount = workspace?.statements?.filter(item => ['Draft', 'Ready for review'].includes(item.status)).length || 0;
  const discrepancyCount = workspace?.statements?.filter(item => item.discrepancy || item.warnings?.length).length || 0;
  const distributedCount = workspace?.statements?.filter(item => item.status === 'Distributed').length || 0;

  function updateStatement(next) {
    setWorkspace(current => ({ ...current, statements: current.statements.map(item => item.statementId === next.statementId ? next : item) }));
  }
  async function addAdjustment(adjustment) {
    const recalculated = calculateAllowanceStatement(selected.crew, selected.records, [...selected.adjustments, adjustment]);
    updateStatement({ ...selected, ...recalculated, status: 'Ready for review', reportReady: true });
    setAdjusting(false); setMessage('Adjustment saved with a complete audit reference.');
  }
  async function approve() {
    setMessage('Approving statement…');
    const result = await approveAllowanceStatement(selected.statementId, selected.crew.crewId, month);
    if (result.ok) { updateStatement({ ...selected, status: 'Approved', approvedAt: result.data.approvedAt }); setMessage(`Approved ${selected.statementId}.`); }
  }
  async function distribute() {
    setMessage('Generating and recording distribution…');
    const result = await distributeAllowanceStatement(selected, 'email');
    if (result.ok) { updateStatement({ ...selected, status: 'Distributed', distributedAt: result.data.distributedAt }); setMessage(source === 'backend' ? `Report sent to ${selected.crew.email}.` : `Distribution recorded in demo mode for ${selected.crew.email}.`); }
  }
  function exportRows() {
    if (!selected) return;
    const columns = Object.keys(selected.records[0] || {});
    const csv = [columns.join(','), ...selected.records.map(row => columns.map(column => `"${String(row[column] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `${selected.statementId}-daily-breakdown.csv`;
    link.click(); URL.revokeObjectURL(link.href);
  }

  if (loading || !workspace) return <div className="moduleLoading"><RefreshCw className="spin"/> Loading roster, rates and allowance statements…</div>;

  return <div className="advancedModule allowanceModule">
    <section className="moduleHero allowanceHero">
      <div><span className="eyebrow"><WalletCards size={16}/> Allowance control tower</span><h2>From actual roster to payroll-ready crew statements</h2><p>Configurable calculations for cabin and flight crew, with discrepancy management, maker-checker approval, report distribution and policy-version auditability.</p></div>
      <div className="moduleHeroActions"><label>Payroll month<input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label><button className="secondaryAction" onClick={refresh}><RefreshCw size={16}/> Sync backend</button></div>
    </section>

    <div className="moduleMetrics">
      <Metric icon={CircleDollarSign} label="Projected crew payroll" value={money(payrollTotal)} note={`${workspace.statements.length} individual statements`} tone="green"/>
      <Metric icon={FileCheck2} label="Awaiting review" value={reviewCount} note="Maker-checker queue" tone="amber"/>
      <Metric icon={AlertTriangle} label="Exceptions / warnings" value={discrepancyCount} note="Requires evidence or review" tone="red"/>
      <Metric icon={Send} label="Reports distributed" value={distributedCount} note={`Data source: ${source === 'backend' ? 'live backend' : 'demo persistence'}`} tone="blue"/>
    </div>

    <ProgressRail status={selected?.status}/>
    {message ? <div className="moduleToast"><CheckCircle2 size={17}/>{message}<button onClick={() => setMessage('')}><X size={15}/></button></div> : null}

    <section className="allowanceWorkspace">
      <aside className="crewStatementList">
        <div className="listToolbar"><div className="moduleSearch"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search crew, ID or grade"/></div><div className="segmented"><button className={crewType === 'All' ? 'active' : ''} onClick={() => setCrewType('All')}>All</button><button className={crewType === 'Cabin' ? 'active' : ''} onClick={() => setCrewType('Cabin')}>Cabin</button><button className={crewType === 'Flight' ? 'active' : ''} onClick={() => setCrewType('Flight')}>Flight</button></div></div>
        <div className="statementCards">{statements.map(statement => <button key={statement.statementId} className={statement.statementId === selected?.statementId ? 'statementCard active' : 'statementCard'} onClick={() => setSelectedId(statement.statementId)}>
          <div className="crewAvatar">{statement.crew.name.split(' ').map(item => item[0]).join('').slice(0,2)}</div><div><b>{statement.crew.name}</b><span>{statement.crew.crewId} · {statement.crew.grade}</span><small>{statement.crew.base} · {statement.crew.fleet}</small></div><div className="statementAmount"><strong>{money(statement.grandTotal)}</strong><StatusPill tone={statement.status === 'Distributed' ? 'success' : statement.status === 'Approved' ? 'info' : statement.status === 'Draft' ? 'neutral' : 'warning'}>{statement.status}</StatusPill></div>
        </button>)}</div>
      </aside>

      {selected ? <section className="statementDetail">
        <header className="statementHeader"><div><span>{selected.crew.crewType} crew allowance statement</span><h3>{selected.crew.name}</h3><p>{selected.crew.staffId} · {selected.crew.rank} · {selected.crew.grade} · {selected.crew.base} · {selected.crew.fleet}</p></div><div className="statementHeaderRight"><StatusPill tone={selected.status === 'Distributed' ? 'success' : selected.status === 'Approved' ? 'info' : 'warning'}>{selected.status}</StatusPill><b>{selected.statementId}</b><small>Policy {selected.policyVersion || POLICY_VERSION}</small></div></header>
        <nav className="moduleTabs">{[['summary','Summary'],['daily','Daily breakdown'],['adjustments','Adjustments'],['rules','Rates & rules'],['audit','Audit & distribution']].map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>

        {tab === 'summary' ? <div className="statementGrid"><section className="statementPanel"><div className="panelTitle"><Banknote size={18}/> Calculated entitlement</div><SummaryBreakdown statement={selected}/></section><section className="statementPanel"><div className="panelTitle"><Calculator size={18}/> Calculation intelligence</div><div className="calculationFacts"><div><span>Actual productive duty</span><b>{formatHours(selected.breakdown.productiveDutyMinutes)}</b></div><div><span>Actual block time</span><b>{formatHours(selected.breakdown.blockMinutes)}</b></div><div><span>Excess above 80 hours</span><b>{formatHours(selected.breakdown.excessBlockMinutes)}</b></div><div><span>Layover credited</span><b>{formatHours(selected.breakdown.layoverCreditMinutes)}</b></div></div>{selected.warnings?.length ? <div className="warningList">{selected.warnings.map(item => <p key={item}><AlertTriangle size={15}/>{item}</p>)}</div> : <div className="successPanel"><CheckCircle2 size={18}/> All source rows passed calculation validation.</div>}</section></div> : null}

        {tab === 'daily' ? <section className="statementPanel full"><div className="panelTitleRow"><div className="panelTitle"><Users size={18}/> Daily activity breakdown</div><button className="secondaryAction" onClick={exportRows}><Download size={15}/> Export CSV</button></div><AllowanceMatrix statement={selected}/></section> : null}

        {tab === 'adjustments' ? <section className="statementPanel full"><div className="panelTitleRow"><div className="panelTitle"><Plus size={18}/> Discrepancy adjustment register</div><button className="primaryAction" onClick={() => setAdjusting(true)}><Plus size={15}/> Add adjustment</button></div>{selected.adjustments.length ? <div className="simpleTable"><div className="simpleTableHead"><span>Date</span><span>Details</span><span>Status</span><span>Amount</span></div>{selected.adjustments.map(item => <div className="simpleTableRow" key={item.adjustmentId || `${item.date}-${item.details}`}><span>{item.date}</span><span>{item.details}</span><span><StatusPill tone={item.status === 'Approved' ? 'success' : 'warning'}>{item.status}</StatusPill></span><b>{money(item.amount)}</b></div>)}</div> : <div className="emptyState"><History size={30}/><b>No adjustment entries</b><span>The current statement contains only current-month calculated entitlements.</span></div>}</section> : null}

        {tab === 'rules' ? <div className="statementGrid"><section className="statementPanel"><div className="panelTitle"><SlidersHorizontal size={18}/> Applied rule profile</div><div className="ruleCards">{selected.crew.crewType === 'Cabin' ? <><article><b>Productivity</b><span>Duty-based rate by grade; excess block rate above 80 hours.</span></article><article><b>Layover</b><span>1-hour credit at 2:00-2:59; 3-hour credit at 3:00-11:00.</span></article><article><b>Instructor & assignments</b><span>Daily or hourly entitlement with role-specific limits.</span></article><article><b>Transportation</b><span>RM200 fixed allowance when dual-rated.</span></article></> : <><article><b>Productivity + incentive</b><span>Block-time rate by pilot grade and functional status.</span></article><article><b>FDP extension</b><span>Additional eligible minutes at the applicable grade rate.</span></article><article><b>Training</b><span>Qualifying simulator and line-training productivity only.</span></article><article><b>Instructor / examiner</b><span>Assignment rate plus eligible flying productivity.</span></article></>}</div></section><section className="statementPanel"><div className="panelTitle"><CircleDollarSign size={18}/> Regional meal-rate register</div><div className="mealRateList">{MEAL_RATES.map(rate => <div key={rate.region}><b>{rate.region}</b><span>B {money(rate.breakfast)} · L {money(rate.lunch)} · D {money(rate.dinner)}</span></div>)}</div></section></div> : null}

        {tab === 'audit' ? <div className="statementGrid"><section className="statementPanel"><div className="panelTitle"><History size={18}/> Statement audit trail</div><div className="auditTimeline"><div><span>Roster extraction</span><b>{selected.records.length} actual rows imported</b><small>Source: Roster_Actual</small></div><div><span>Calculation</span><b>{readableDate(selected.calculatedAt)}</b><small>Policy version {selected.policyVersion}</small></div><div><span>Approval</span><b>{selected.approvedAt ? readableDate(selected.approvedAt) : 'Pending'}</b><small>Maker-checker approval</small></div><div><span>Distribution</span><b>{selected.distributedAt ? readableDate(selected.distributedAt) : 'Not yet distributed'}</b><small>{selected.crew.email}</small></div></div></section><section className="statementPanel"><div className="panelTitle"><Mail size={18}/> Report distribution</div><p className="panelCopy">Generate the individual statement, retain send history and route the finalized entitlement to payroll. Backend mode can create the PDF and send it to the crew email address.</p><div className="distributionActions"><PrintableStatement statement={selected}/><button className="primaryAction" onClick={distribute} disabled={selected.status === 'Distributed'}><Send size={16}/>{selected.status === 'Distributed' ? 'Distributed' : 'Generate & email report'}</button></div></section></div> : null}

        <footer className="statementActions"><div><span>Final payable amount</span><b>{money(selected.grandTotal)}</b></div><button className="secondaryAction" onClick={() => setAdjusting(true)}><Plus size={16}/> Adjustment</button><PrintableStatement statement={selected}/><button className="primaryAction" onClick={approve} disabled={['Approved','Distributed'].includes(selected.status)}><CheckCircle2 size={16}/>{['Approved','Distributed'].includes(selected.status) ? 'Approved' : 'Approve statement'}</button></footer>
      </section> : <div className="emptyState"><Users size={30}/><b>No crew matches the filters</b></div>}
    </section>
    {adjusting && selected ? <AdjustmentDialog statement={selected} onClose={() => setAdjusting(false)} onSaved={addAdjustment}/> : null}
  </div>;
}
