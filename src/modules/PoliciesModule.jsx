import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, FileClock, FileText, History, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react';
import { allowanceCrew } from '../crewModuleData.js';
import { acknowledgePolicy, loadHrPolicies } from '../backendServices.js';

function Pill({ children, tone = 'info' }) { return <span className={`statusPill ${tone}`}>{children}</span>; }

export default function PoliciesModule() {
  const [payload, setPayload] = useState({ policies: [], acknowledgements: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [audience, setAudience] = useState('All');
  const [selectedId, setSelectedId] = useState('');
  const [crewId, setCrewId] = useState('CC-519');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('demo');

  useEffect(() => {
    loadHrPolicies().then(result => {
      setPayload(result.data || { policies: [], acknowledgements: [] });
      setSource(result.source);
      setSelectedId(result.data?.policies?.[0]?.policyId || '');
      setLoading(false);
    });
  }, []);

  const categories = ['All', ...new Set(payload.policies.map(item => item.category))];
  const audiences = ['All', ...new Set(payload.policies.map(item => item.audience))];
  const filtered = useMemo(() => payload.policies.filter(item => {
    const matchesQuery = `${item.title} ${item.summary} ${item.category} ${item.audience} ${item.keyRules.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'All' || item.category === category) && (audience === 'All' || item.audience === audience);
  }), [payload, query, category, audience]);
  const selected = filtered.find(item => item.policyId === selectedId) || filtered[0] || payload.policies[0];
  const selectedCrew = allowanceCrew.find(item => item.crewId === crewId) || allowanceCrew[0];
  const acknowledgment = selected ? payload.acknowledgements.find(item => item.policyId === selected.policyId && item.crewId === crewId && item.version === selected.version) : null;
  const required = payload.policies.filter(item => item.acknowledgementRequired).length;
  const acknowledged = payload.acknowledgements.length;

  async function acknowledge() {
    if (!selected) return;
    const result = await acknowledgePolicy(selected.policyId, crewId, selected.version);
    if (result.ok) {
      setPayload(current => ({ ...current, acknowledgements: [result.data, ...current.acknowledgements.filter(item => !(item.policyId === selected.policyId && item.crewId === crewId))] }));
      setMessage(`${selectedCrew.name} acknowledged ${selected.title} version ${selected.version}.`);
    }
  }

  if (loading) return <div className="moduleLoading"><FileClock className="spin"/> Loading published policy register…</div>;

  return <div className="advancedModule policiesModule">
    <section className="moduleHero policiesHero"><div><span className="eyebrow"><BookOpenCheck size={16}/> HR policies & crew governance</span><h2>One governed source for entitlements, attendance and crew obligations</h2><p>Searchable policy library with effective dates, audience targeting, rule traceability, version control and crew acknowledgements. Allowance calculations reference the same published rule versions.</p></div><div className="policySource"><ShieldCheck size={18}/><div><span>Policy registry</span><b>{source === 'backend' ? 'Live backend' : 'Demo persistence'}</b></div></div></section>
    {message ? <div className="moduleToast"><CheckCircle2 size={17}/>{message}<button onClick={() => setMessage('')}><X size={15}/></button></div> : null}

    <div className="policyMetrics"><article><FileText/><div><span>Published policies</span><b>{payload.policies.length}</b><small>Across compensation, operations, leave and safety</small></div></article><article><Users/><div><span>Acknowledgement-required</span><b>{required}</b><small>Targeted by crew audience</small></div></article><article><CheckCircle2/><div><span>Acknowledgement records</span><b>{acknowledged}</b><small>Version-specific audit evidence</small></div></article><article><SlidersHorizontal/><div><span>Calculation-linked</span><b>{payload.policies.filter(item => item.category.includes('Compensation') || item.category === 'Duty Travel').length}</b><small>Referenced by allowance rules</small></div></article></div>

    <section className="policyWorkspace">
      <aside className="policyLibrary">
        <div className="policyFilters"><div className="moduleSearch"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search policy or rule"/></div><div className="policySelects"><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select><select value={audience} onChange={event => setAudience(event.target.value)}>{audiences.map(item => <option key={item}>{item}</option>)}</select></div></div>
        <div className="policyCards">{filtered.map(item => <button key={item.policyId} onClick={() => setSelectedId(item.policyId)} className={selected?.policyId === item.policyId ? 'policyCard active' : 'policyCard'}><div><span>{item.category}</span><h4>{item.title}</h4><p>{item.summary}</p></div><footer><small>{item.audience} · Effective {item.effectiveDate}</small><Pill tone="success">{item.status}</Pill></footer></button>)}</div>
      </aside>

      {selected ? <section className="policyDetail">
        <header><div><span>{selected.policyId}</span><h3>{selected.title}</h3><p>{selected.summary}</p></div><div className="policyVersion"><span>Current version</span><b>{selected.version}</b><small>Effective {selected.effectiveDate}</small></div></header>
        <div className="policyMeta"><div><span>Audience</span><b>{selected.audience}</b></div><div><span>Category</span><b>{selected.category}</b></div><div><span>Source</span><b>{selected.source}</b></div><div><span>Acknowledgement</span><b>{selected.acknowledgementRequired ? 'Required' : 'Optional'}</b></div></div>
        <section className="policyRules"><div className="panelTitle"><SlidersHorizontal size={18}/> Key governed rules</div>{selected.keyRules.map((rule, index) => <article key={rule}><span>{String(index + 1).padStart(2, '0')}</span><p>{rule}</p></article>)}</section>
        <section className="policyTrace"><div className="panelTitle"><History size={18}/> Rule-to-system traceability</div><div className="traceGrid"><div><span>Source system</span><b>{selected.category === 'Compensation & Benefits' ? 'Roster_Actual + Crew_Master' : selected.category === 'Operations' ? 'Attendance_Records' : 'HR policy registry'}</b></div><div><span>Execution point</span><b>{selected.category === 'Compensation & Benefits' ? 'Allowance calculation engine' : selected.category === 'Operations' ? 'Crew check-in and OCC review' : 'Policy acknowledgement workflow'}</b></div><div><span>Audit evidence</span><b>Policy version, user, timestamp and action</b></div><div><span>Change control</span><b>Effective dating and published status</b></div></div></section>
        <section className="acknowledgementPanel"><div><span className="eyebrow"><Users size={15}/> Crew acknowledgement</span><h4>Record version-specific acceptance</h4><p>Choose a crew member to confirm that this published policy version has been read and understood.</p></div><div className="acknowledgementAction"><select value={crewId} onChange={event => setCrewId(event.target.value)}>{allowanceCrew.map(item => <option key={item.crewId} value={item.crewId}>{item.name} · {item.crewId}</option>)}</select>{acknowledgment ? <div className="acknowledged"><CheckCircle2 size={18}/><span><b>Acknowledged</b><small>{new Date(acknowledgment.acknowledgedAt).toLocaleString('en-MY')}</small></span></div> : <button className="primaryAction" onClick={acknowledge}><CheckCircle2 size={16}/> Acknowledge policy</button>}</div></section>
      </section> : <div className="emptyState"><FileText size={30}/><b>No policies match the filters.</b></div>}
    </section>
  </div>;
}
