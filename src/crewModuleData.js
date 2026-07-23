import { calculateAllowanceStatement } from './allowanceEngine.js';

export const allowanceCrew = [
  { crewId: 'CPT-204', staffId: 'FY0204', name: 'A. Rahman', crewType: 'Flight', rank: 'Captain', grade: 'F-C2-P', base: 'KUL', fleet: 'ATR72', email: 'a.rahman@example.com', instructor: true, designation: 'Flight Instructor', functionalStatus: true },
  { crewId: 'FO-872', staffId: 'FY0872', name: 'S. Tan', crewType: 'Flight', rank: 'First Officer', grade: 'F-C1-P', base: 'PEN', fleet: 'ATR72', email: 's.tan@example.com', instructor: false, designation: 'Line Pilot', functionalStatus: true },
  { crewId: 'SO-226', staffId: 'FY0226', name: 'J. Wong', crewType: 'Flight', rank: 'Second Officer', grade: 'F-D2-P', base: 'KUL', fleet: 'B737', email: 'j.wong@example.com', instructor: false, designation: 'Line Pilot', functionalStatus: true },
  { crewId: 'CDT-118', staffId: 'FY0118', name: 'M. Hafiz', crewType: 'Flight', rank: 'Cadet Pilot', grade: 'F-D1-P', base: 'KUL', fleet: 'ATR72', email: 'm.hafiz@example.com', instructor: false, designation: 'Line Training', functionalStatus: false },
  { crewId: 'CC-519', staffId: 'FY0519', name: 'N. Lim', crewType: 'Cabin', rank: 'Cabin Crew', grade: 'F-E3-CC', base: 'KUL', fleet: 'ATR72', email: 'n.lim@example.com', dualRated: false, instructor: false, designation: 'Cabin Crew' },
  { crewId: 'CC-644', staffId: 'FY0644', name: 'F. Aisyah', crewType: 'Cabin', rank: 'Cabin Crew In-Charge', grade: 'F-E4-CC', base: 'PEN', fleet: 'ATR72', email: 'f.aisyah@example.com', dualRated: true, instructor: true, designation: 'Associate Instructor' },
  { crewId: 'CC-390', staffId: 'FY0390', name: 'K. Devi', crewType: 'Cabin', rank: 'Supervisor', grade: 'F-D1', base: 'BKI', fleet: 'B737', email: 'k.devi@example.com', dualRated: true, instructor: false, designation: 'Inflight Supervisor' },
  { crewId: 'CC-812', staffId: 'FY0812', name: 'R. Ismail', crewType: 'Cabin', rank: 'Cabin Crew', grade: 'F-E3-CC', base: 'SZB', fleet: 'ATR72', email: 'r.ismail@example.com', dualRated: false, instructor: false, designation: 'Cabin Crew' }
];

const routes = [
  ['KUL', 'PEN', 'Malaysia'], ['PEN', 'JHB', 'Malaysia'], ['SZB', 'BKI', 'Malaysia'],
  ['KUL', 'SIN', 'South East Asia'], ['KUL', 'BKK', 'South East Asia'], ['KUL', 'HKG', 'East Asia'],
  ['KUL', 'DEL', 'South Asia'], ['KUL', 'DXB', 'Middle East'], ['KUL', 'PER', 'Australia / New Zealand']
];

function dateFor(month, day) {
  return `${month}-${String(day).padStart(2, '0')}`;
}

export function createDemoRosterRows(crew, month = '2026-06') {
  const rows = [];
  const flightCrew = crew.crewType === 'Flight';
  const seed = Number(crew.staffId.replace(/\D/g, '').slice(-3)) || 1;
  const dutyDays = flightCrew ? 14 : 17;
  for (let index = 0; index < dutyDays; index += 1) {
    const day = 1 + ((index * 2 + seed) % 29);
    const route = routes[(index + seed) % routes.length];
    const operatingMinutes = flightCrew ? 115 + ((index * 19 + seed) % 145) : 230 + ((index * 17 + seed) % 260);
    const paxingMinutes = index % 6 === 0 ? 55 + ((index * 7) % 75) : 0;
    const blockMinutes = flightCrew ? operatingMinutes + (index % 4 === 0 ? 70 : 0) : Math.round(operatingMinutes * 0.72);
    const layoverMinutes = !flightCrew && index % 5 === 1 ? (index % 10 === 1 ? 150 : 240) : 0;
    const fdpExtensionMinutes = flightCrew && index % 7 === 3 ? 35 + ((seed + index) % 70) : 0;
    const hasNightStop = index % 8 === 4;
    rows.push({
      recordId: `RAR-${crew.crewId}-${day}-${index}`,
      crewId: crew.crewId,
      dutyDate: dateFor(month, day),
      flightNumbers: `FY${2100 + ((seed * 7 + index * 31) % 6800)}`,
      duty: index % 9 === 2 ? 'Positioning + Operating' : index % 11 === 5 ? 'Training' : 'Operating',
      sectors: `${route[0]}-${route[1]}`,
      operatingMinutes,
      paxingMinutes,
      diversionAtbMinutes: index % 13 === 6 ? 25 : 0,
      returnToChockMinutes: index % 12 === 7 ? 18 : 0,
      blockMinutes,
      fdpExtensionMinutes,
      layoverMinutes,
      nightStopRegion: hasNightStop ? route[2] : 'Malaysia',
      breakfast: hasNightStop || index % 6 === 1 ? 1 : 0,
      lunch: hasNightStop || index % 5 === 2 ? 1 : 0,
      dinner: hasNightStop || index % 7 === 3 ? 1 : 0,
      nightStopFirstDay: hasNightStop ? 1 : 0,
      nightStopSubsequentDays: index % 16 === 12 ? 1 : 0,
      checkFlightMinutes: !flightCrew && crew.designation === 'Inflight Supervisor' && index % 6 === 0 ? blockMinutes : 0,
      associateInstructorDays: !flightCrew && crew.instructor && index % 9 === 1 ? 1 : 0,
      crewPoolDays: !flightCrew && index % 13 === 4 ? 1 : 0,
      talentEventMinutes: !flightCrew && index % 17 === 6 ? 300 : 0,
      simTraineeMinutes: flightCrew && index % 10 === 2 ? 240 : 0,
      lineTrainingMinutes: flightCrew && index % 10 === 3 ? blockMinutes : 0,
      qualifyingTraining: flightCrew && (index % 10 === 2 || index % 10 === 3),
      instructionMinutes: flightCrew && crew.instructor && index % 8 === 2 ? 180 : 0,
      examinerMinutes: flightCrew && crew.designation.includes('Examiner') && index % 8 === 2 ? 180 : 0,
      groundDutyDays: flightCrew && !crew.instructor && index % 14 === 5 ? 1 : 0,
      compassWingMinutes: flightCrew && index % 18 === 9 ? 135 : 0,
      managementAllowance: flightCrew && crew.designation === 'Management Pilot' ? 1200 : 0,
      otherAmount: index % 15 === 5 ? 85 : 0,
      otherDetail: index % 15 === 5 ? 'Manual operational entitlement' : '',
      remarks: hasNightStop ? 'Night stop and meal windows derived from actual roster' : index % 7 === 3 ? 'FDP extension validated against actual duty' : ''
    });
  }
  return rows.sort((a, b) => a.dutyDate.localeCompare(b.dutyDate));
}

export function createAllowanceWorkspace(month = '2026-06') {
  const statements = allowanceCrew.map((crew, index) => {
    const records = createDemoRosterRows(crew, month);
    const adjustments = index % 3 === 0 ? [{ adjustmentId: `ADJ-${crew.crewId}`, date: `${month}-28`, details: 'Previous month discrepancy correction', amount: index % 2 ? -75 : 120, status: 'Approved' }] : [];
    const statement = calculateAllowanceStatement(crew, records, adjustments);
    const states = ['Ready for review', 'Approved', 'Draft', 'Distributed'];
    return { ...statement, status: states[index % states.length], reportReady: index % 4 !== 2, discrepancy: index % 5 === 0 };
  });
  return { month, crew: allowanceCrew, statements };
}

export const demoAttendanceRecords = [
  { attendanceId: 'ATT-1001', crewId: 'CPT-204', crewName: 'A. Rahman', dutyDate: '2026-06-18', flightNo: 'FY3124', dutyCode: 'FB', scheduledReport: '06:10', actualCheckIn: '06:03', status: 'On time', geoStatus: 'Verified', wifiStatus: 'Approved network', deviceStatus: 'Trusted device', approvalStatus: 'Accepted', submittedAt: '2026-06-18T06:03:00+08:00', notes: '' },
  { attendanceId: 'ATT-1002', crewId: 'CC-519', crewName: 'N. Lim', dutyDate: '2026-06-18', flightNo: 'FY2176', dutyCode: 'FB', scheduledReport: '08:20', actualCheckIn: '08:31', status: 'Late', geoStatus: 'Verified', wifiStatus: 'Mobile data', deviceStatus: 'Trusted device', approvalStatus: 'Needs review', submittedAt: '2026-06-18T08:31:00+08:00', notes: 'Apron shuttle delay' },
  { attendanceId: 'ATT-1003', crewId: 'FO-872', crewName: 'S. Tan', dutyDate: '2026-06-18', flightNo: 'FY4020', dutyCode: 'SBY', scheduledReport: '10:00', actualCheckIn: '09:53', status: 'On time', geoStatus: 'Verified', wifiStatus: 'Approved network', deviceStatus: 'Trusted device', approvalStatus: 'Accepted', submittedAt: '2026-06-18T09:53:00+08:00', notes: '' },
  { attendanceId: 'ATT-1004', crewId: 'CC-644', crewName: 'F. Aisyah', dutyDate: '2026-06-17', flightNo: 'FY1108', dutyCode: 'TRN', scheduledReport: '12:30', actualCheckIn: '12:29', status: 'On time', geoStatus: 'Manual', wifiStatus: 'Training centre', deviceStatus: 'Trusted device', approvalStatus: 'Accepted', submittedAt: '2026-06-17T12:29:00+08:00', notes: 'Physical class session' },
  { attendanceId: 'ATT-1005', crewId: 'SO-226', crewName: 'J. Wong', dutyDate: '2026-06-17', flightNo: 'FY5520', dutyCode: 'FB', scheduledReport: '16:00', actualCheckIn: '', status: 'Pending', geoStatus: 'Not captured', wifiStatus: 'Not captured', deviceStatus: 'Known device', approvalStatus: 'Open', submittedAt: '', notes: '' }
];

export const hrPolicies = [
  { policyId: 'POL-ALLOW-CABIN-001', title: 'Cabin Crew Allowance Scheme', category: 'Compensation & Benefits', audience: 'Cabin Crew', version: '1.0.0', effectiveDate: '2025-08-01', status: 'Published', acknowledgementRequired: true, summary: 'Defines cabin crew productivity, incentive, layover, meal, instructor, crew-pool, talent/event, unscheduled night-stop and transportation entitlements.', keyRules: ['Productivity is based on applicable actual duty hours.', 'Excess block-hour rate is applied above 80 monthly block hours.', 'Layover credit: 1 hour from 2:00 to 2:59 and 3 hours from 3:00 to 11:00.', 'Dual-rated cabin crew receive a fixed RM200 transportation allowance.'], source: 'FY Cabin Crew Guidebook' },
  { policyId: 'POL-ALLOW-FLIGHT-001', title: 'Flight Crew Allowance Scheme', category: 'Compensation & Benefits', audience: 'Flight Crew', version: 'Issue 1 Revision 2', effectiveDate: '2026-06-30', status: 'Published', acknowledgementRequired: true, summary: 'Defines pilot productivity and incentive, excess block hours, FDP extension, cadet, meal, training, night-stop, management and instructor/examiner entitlements.', keyRules: ['Productivity and incentive are based on operating and positioning block time.', 'Excess rate is calculated on minutes above 80 monthly block hours.', 'Cadet fixed allowance is RM1,200 from line training until functional status.', 'FDP extension is payable for eligible two- or three-person operations.'], source: 'FY Pilot Guidebook' },
  { policyId: 'POL-MEAL-001', title: 'Duty Travel Meal Entitlement', category: 'Duty Travel', audience: 'All Crew', version: '2026.01', effectiveDate: '2026-01-01', status: 'Published', acknowledgementRequired: false, summary: 'Applies regional breakfast, lunch and dinner rates when the eligible station period encroaches the defined local meal window.', keyRules: ['Breakfast window: 07:01-09:00 local time.', 'Lunch window: 12:01-14:00 local time.', 'Dinner window: 19:01-21:00 local time.', 'Rates are maintained by region and effective date.'], source: 'GHCCP Duty Travel Benefits' },
  { policyId: 'POL-ATT-001', title: 'Crew Attendance & Check-in Control', category: 'Operations', audience: 'All Crew', version: '2.1', effectiveDate: '2026-05-01', status: 'Published', acknowledgementRequired: true, summary: 'Defines scheduled report time, self-service attendance capture, accepted evidence, lateness thresholds, no-show escalation and manager review.', keyRules: ['Crew submits attendance against the assigned duty or flight.', 'Time, location, device and network evidence are retained in the audit trail.', 'Late and pending records route to OCC review.', 'No-show status may trigger recovery workflow.'], source: 'ACMS Operations Control Policy' },
  { policyId: 'POL-GROUND-001', title: 'Grounding & Flying Allowance Suspension', category: 'Employment', audience: 'All Crew', version: '1.0', effectiveDate: '2025-08-01', status: 'Published', acknowledgementRequired: true, summary: 'Allows management to assign ground duties and review or cease flying-related allowances during the grounding period.', keyRules: ['Ground assignment is recorded with effective dates and reason.', 'Flying-related allowances may cease during the grounding period.', 'Approved ground-duty entitlements remain separately configurable.'], source: 'Crew Guidebooks' },
  { policyId: 'POL-FTL-001', title: 'Flight and Duty Time Limitations', category: 'Safety & Compliance', audience: 'All Crew', version: '2026.02', effectiveDate: '2026-06-01', status: 'Published', acknowledgementRequired: true, summary: 'Links actual duty and rest records to the applicable FTL scheme and prevents allowance calculations from overriding legality controls.', keyRules: ['Allowance eligibility never overrides crew legality.', 'Actual duty and extension minutes are traceable to roster and FTL validation.', 'Exceptions require authorized review and reason capture.'], source: 'Company FTL Scheme' },
  { policyId: 'POL-LEAVE-001', title: 'Crew Leave Principles', category: 'Leave', audience: 'All Crew', version: '2026.01', effectiveDate: '2026-01-01', status: 'Published', acknowledgementRequired: false, summary: 'Provides a policy reference for leave, pregnancy leave and the interaction between leave, regulatory days off and flying-related allowances.', keyRules: ['Leave records are sourced from HR or crew self-service.', 'Long leave periods may interact with regulatory day-off rules.', 'Flying allowances follow the applicable policy during leave or temporary ground employment.'], source: 'GHCCP Leave Policy' }
];

export function policyAcknowledgements() {
  return [
    { policyId: 'POL-ALLOW-CABIN-001', crewId: 'CC-519', acknowledgedAt: '2026-06-02T09:12:00+08:00', version: '1.0.0' },
    { policyId: 'POL-ATT-001', crewId: 'CC-519', acknowledgedAt: '2026-06-02T09:14:00+08:00', version: '2.1' },
    { policyId: 'POL-ALLOW-FLIGHT-001', crewId: 'CPT-204', acknowledgedAt: '2026-07-01T08:40:00+08:00', version: 'Issue 1 Revision 2' }
  ];
}
