import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck2, Check, CheckCircle2, Clock3, LocateFixed, MapPin, RefreshCw, Save, Search, ShieldCheck, Smartphone, UploadCloud, UserCheck, Wifi, X } from 'lucide-react';
import { allowanceCrew } from '../crewModuleData.js';
import { loadAttendance, saveAttendance } from '../backendServices.js';

function localDate() { return new Date().toLocaleDateString('en-CA'); }
function localTime() { return new Date().toTimeString().slice(0, 5); }
function minutesOf(value) { if (!value) return null; const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function deriveStatus(scheduled, actual) { const planned = minutesOf(scheduled); const checked = minutesOf(actual); if (planned == null || checked == null) return 'Pending'; return checked > planned + 5 ? 'Late' : 'On time'; }
function tone(status) { return status === 'On time' || status === 'Accepted' || status === 'Verified' ? 'success' : status === 'Late' || status === 'Needs review' ? 'danger' : status === 'Pending' || status === 'Open' ? 'warning' : 'info'; }

function Pill({ children, value }) { return <span className={`statusPill ${tone(value || children)}`}>{children}</span>; }

function AttendanceForm({ onSaved }) {
  const [form, setForm] = useState({ crewId: allowanceCrew[4].crewId, dutyDate: localDate(), flightNo: 'FY3124', dutyCode: 'FB', scheduledReport: '08:00', actualCheckIn: localTime(), latitude: '', longitude: '', accuracyM: '', geoStatus: 'Not captured', wifiStatus: 'Approved network', deviceStatus: 'Trusted browser', evidenceUrl: '', notes: '' });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const crew = allowanceCrew.find(item => item.crewId === form.crewId) || allowanceCrew[0];
  const status = deriveStatus(form.scheduledReport, form.actualCheckIn);
  function update(field, value) { setForm(current => ({ ...current, [field]: value })); }
  function useCurrentTime() { update('actualCheckIn', localTime()); }
  function captureLocation() {
    if (!navigator.geolocation) { update('geoStatus', 'Unavailable'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      setForm(current => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6), accuracyM: Math.round(position.coords.accuracy), geoStatus: 'Verified' }));
      setLocating(false);
    }, () => { update('geoStatus', 'Permission denied'); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000 });
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    const result = await saveAttendance({ ...form, crewName: crew.name, status, source: 'crew-self-service', submittedBy: crew.crewId });
    setSaving(false);
    if (result.ok) onSaved(result.data, result.source);
  }
  return <section className="attendanceCapture">
    <header><div><span className="eyebrow"><UserCheck size={16}/> Crew self-service</span><h3>Record attendance</h3><p>Submit the assigned duty, report time and supporting location/device evidence directly to the attendance database.</p></div><div className={`liveStatus ${status === 'Late' ? 'late' : ''}`}><Clock3 size={18}/><div><span>Calculated status</span><b>{status}</b></div></div></header>
    <form className="attendanceForm" onSubmit={submit}>
      <label>Crew member<select value={form.crewId} onChange={event => update('crewId', event.target.value)}>{allowanceCrew.map(item => <option key={item.crewId} value={item.crewId}>{item.name} · {item.crewId}</option>)}</select></label>
      <label>Duty date<input type="date" value={form.dutyDate} onChange={event => update('dutyDate', event.target.value)}/></label>
      <label>Flight / assignment<input value={form.flightNo} onChange={event => update('flightNo', event.target.value)} placeholder="FY3124 or SIM-04"/></label>
      <label>Duty code<select value={form.dutyCode} onChange={event => update('dutyCode', event.target.value)}>{['FB','SBY','TRN','SIM','GROUND','POSITIONING'].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Scheduled report<input type="time" value={form.scheduledReport} onChange={event => update('scheduledReport', event.target.value)}/></label>
      <label>Actual check-in<div className="inputAction"><input type="time" value={form.actualCheckIn} onChange={event => update('actualCheckIn', event.target.value)}/><button type="button" onClick={useCurrentTime}>Now</button></div></label>
      <div className="evidenceCard wide"><div className="evidenceIcon"><MapPin size={20}/></div><div><b>Location evidence</b><span>{form.geoStatus === 'Verified' ? `${form.latitude}, ${form.longitude} · ±${form.accuracyM}m` : 'Location is stored only when the crew member grants browser permission.'}</span></div><button type="button" className="secondaryAction" onClick={captureLocation} disabled={locating}><LocateFixed size={16}/>{locating ? 'Locating…' : 'Capture location'}</button></div>
      <label>Network evidence<select value={form.wifiStatus} onChange={event => update('wifiStatus', event.target.value)}><option>Approved network</option><option>Mobile data</option><option>Training centre</option><option>Manual verification</option></select></label>
      <label>Device evidence<select value={form.deviceStatus} onChange={event => update('deviceStatus', event.target.value)}><option>Trusted browser</option><option>Registered mobile</option><option>New device</option><option>Manual verification</option></select></label>
      <label className="wide">Notes / exception reason<textarea value={form.notes} onChange={event => update('notes', event.target.value)} placeholder="Provide a reason when late, manually verified or submitting a correction."/></label>
      <div className="attendanceConsent wide"><ShieldCheck size={18}/><span>The submission records timestamp, crew identity, duty reference and supplied evidence in the Attendance_Records and Audit_Log tables.</span></div>
      <button className="primaryAction wide submitAttendance" disabled={saving}><Save size={17}/>{saving ? 'Saving to backend…' : 'Submit attendance'}</button>
    </form>
  </section>;
}

function AttendanceTimeline({ records }) {
  return <div className="attendanceTimeline">{records.slice(0, 8).map(record => <article key={record.attendanceId}><div className={`timelineDot ${tone(record.status)}`}><Check size={14}/></div><div><div><b>{record.crewName}</b><Pill value={record.status}>{record.status}</Pill></div><span>{record.dutyDate} · {record.flightNo} · Scheduled {record.scheduledReport || '—'} · Actual {record.actualCheckIn || 'Pending'}</span><small>{record.geoStatus} · {record.wifiStatus} · {record.deviceStatus}</small></div></article>)}</div>;
}

export default function AttendanceModule() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('demo');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [message, setMessage] = useState('');

  async function refresh() {
    setLoading(true);
    const result = await loadAttendance({});
    setRecords(result.data || []); setSource(result.source); setLoading(false);
  }
  useEffect(() => { refresh(); }, []);
  function saved(record, savedSource) { setRecords(current => [record, ...current]); setSource(savedSource); setMessage(`Attendance ${record.attendanceId} saved ${savedSource === 'backend' ? 'to the live backend' : 'in demo persistence'}.`); }

  const filtered = useMemo(() => records.filter(record => {
    if (status !== 'All' && record.status !== status) return false;
    return `${record.crewName} ${record.crewId} ${record.flightNo} ${record.dutyCode}`.toLowerCase().includes(query.toLowerCase());
  }), [records, query, status]);
  const onTime = records.filter(item => item.status === 'On time').length;
  const late = records.filter(item => item.status === 'Late').length;
  const pending = records.filter(item => item.status === 'Pending').length;
  const evidence = records.filter(item => item.geoStatus === 'Verified').length;

  return <div className="advancedModule attendanceModule">
    <section className="moduleHero attendanceHero"><div><span className="eyebrow"><CalendarCheck2 size={16}/> Attendance & reporting</span><h2>Fast crew check-in with evidence and OCC visibility</h2><p>A mobile-friendly attendance experience that writes to the backend, validates report timing, captures consented evidence and exposes late or pending attendance for operational action.</p></div><button className="secondaryAction" onClick={refresh}><RefreshCw size={16}/> Refresh records</button></section>
    {message ? <div className="moduleToast"><CheckCircle2 size={17}/>{message}<button onClick={() => setMessage('')}><X size={15}/></button></div> : null}
    <div className="attendanceMetrics"><article><UserCheck/><div><span>On-time submissions</span><b>{onTime}</b><small>Accepted or ready for review</small></div></article><article><AlertTriangle/><div><span>Late attendance</span><b>{late}</b><small>Routed to OCC review</small></div></article><article><Clock3/><div><span>Pending check-ins</span><b>{pending}</b><small>Potential no-show watchlist</small></div></article><article><LocateFixed/><div><span>Geo-verified</span><b>{evidence}</b><small>Source: {source === 'backend' ? 'live backend' : 'demo persistence'}</small></div></article></div>

    <div className="attendanceLayout"><AttendanceForm onSaved={saved}/><section className="attendanceSide"><div className="attendanceEvidencePanel"><div className="panelTitle"><ShieldCheck size={18}/> Evidence controls</div><div className="evidenceStatus"><div><MapPin/><span>Location</span><b>Consent-based</b></div><div><Wifi/><span>Network</span><b>Selectable / integrated</b></div><div><Smartphone/><span>Device</span><b>Trusted-device field</b></div><div><UploadCloud/><span>Attachment</span><b>Backend-ready URL</b></div></div></div><div className="attendanceEvidencePanel"><div className="panelTitle"><Clock3 size={18}/> Latest attendance flow</div>{loading ? <div className="moduleLoading small"><RefreshCw className="spin"/> Loading…</div> : <AttendanceTimeline records={records}/>}</div></section></div>

    <section className="attendanceRegister">
      <header><div><span>Operations attendance register</span><h3>Submitted records and review queue</h3></div><div className="registerFilters"><div className="moduleSearch"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search crew or flight"/></div><select value={status} onChange={event => setStatus(event.target.value)}><option>All</option><option>On time</option><option>Late</option><option>Pending</option></select></div></header>
      <div className="responsiveTable"><table><thead><tr><th>Date</th><th>Crew</th><th>Duty / flight</th><th>Scheduled</th><th>Actual</th><th>Status</th><th>Evidence</th><th>Approval</th><th>Notes</th></tr></thead><tbody>{filtered.map(record => <tr key={record.attendanceId}><td>{record.dutyDate}</td><td><b>{record.crewName}</b><small>{record.crewId}</small></td><td>{record.dutyCode} · {record.flightNo}</td><td>{record.scheduledReport || '—'}</td><td>{record.actualCheckIn || '—'}</td><td><Pill value={record.status}>{record.status}</Pill></td><td><span className="evidenceInline"><MapPin size={13}/>{record.geoStatus}</span><span className="evidenceInline"><Wifi size={13}/>{record.wifiStatus}</span></td><td><Pill value={record.approvalStatus}>{record.approvalStatus}</Pill></td><td>{record.notes || '—'}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
