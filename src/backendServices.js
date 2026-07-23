import { callAcms } from './api.js';
import { createAllowanceWorkspace, demoAttendanceRecords, hrPolicies, policyAcknowledgements } from './crewModuleData.js';
import { calculateAllowanceStatement } from './allowanceEngine.js';

const KEYS = {
  adjustments: 'acms:allowance-adjustments',
  approvals: 'acms:allowance-approvals',
  distributions: 'acms:allowance-distributions',
  attendance: 'acms:attendance-records',
  acknowledgements: 'acms:policy-acknowledgements'
};

function readStorage(key, fallback = []) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

async function liveOrFallback(action, payload, fallback) {
  const response = await callAcms(action, payload);
  if (response?.ok && response?.data !== undefined) return { ...response, source: 'backend' };
  if (response?.ok && response?.items !== undefined) return { ...response, data: response.items, source: 'backend' };
  return { ok: true, data: await fallback(), source: 'demo', backendMessage: response?.message || response?.error || 'Backend action unavailable; demo persistence used.' };
}

export async function loadAllowanceWorkspace(month) {
  return liveOrFallback('allowance.workspace.get', { month }, () => {
    const workspace = createAllowanceWorkspace(month);
    const adjustments = readStorage(KEYS.adjustments, []);
    const approvals = readStorage(KEYS.approvals, []);
    const distributions = readStorage(KEYS.distributions, []);
    workspace.statements = workspace.statements.map(statement => {
      const storedAdjustments = adjustments.filter(item => item.crewId === statement.crew.crewId && item.period === month);
      const approval = approvals.find(item => item.statementId === statement.statementId);
      const distribution = distributions.find(item => item.statementId === statement.statementId);
      const allAdjustments = [...statement.adjustments, ...storedAdjustments];
      const recalculated = calculateAllowanceStatement(statement.crew, statement.records, allAdjustments);
      return {
        ...statement,
        ...recalculated,
        status: distribution ? 'Distributed' : approval ? 'Approved' : statement.status,
        approvedAt: approval?.approvedAt,
        distributedAt: distribution?.distributedAt,
        reportReady: statement.reportReady,
        discrepancy: statement.discrepancy || recalculated.warnings.length > 0
      };
    });
    return workspace;
  });
}

export async function saveAllowanceAdjustment(adjustment) {
  return liveOrFallback('allowance.adjustment.save', { adjustment }, () => {
    const items = readStorage(KEYS.adjustments, []);
    const saved = { ...adjustment, adjustmentId: adjustment.adjustmentId || `ADJ-${Date.now()}`, createdAt: new Date().toISOString(), status: adjustment.status || 'Draft' };
    writeStorage(KEYS.adjustments, [saved, ...items]);
    return saved;
  });
}

export async function approveAllowanceStatement(statementId, crewId, period) {
  return liveOrFallback('allowance.statement.approve', { statementId, crewId, period }, () => {
    const items = readStorage(KEYS.approvals, []);
    const saved = { statementId, crewId, period, approvedAt: new Date().toISOString(), approvedBy: 'AIONOS Demo Approver' };
    writeStorage(KEYS.approvals, [saved, ...items.filter(item => item.statementId !== statementId)]);
    return saved;
  });
}

export async function distributeAllowanceStatement(statement, mode = 'email') {
  return liveOrFallback('allowance.statement.distribute', { statement, mode }, () => {
    const items = readStorage(KEYS.distributions, []);
    const saved = { statementId: statement.statementId, crewId: statement.crew.crewId, period: statement.period, mode, recipient: statement.crew.email, distributedAt: new Date().toISOString(), deliveryStatus: 'Recorded in demo mode' };
    writeStorage(KEYS.distributions, [saved, ...items.filter(item => item.statementId !== statement.statementId)]);
    return saved;
  });
}

export async function loadAttendance(filters = {}) {
  return liveOrFallback('attendance.list', filters, () => {
    const saved = readStorage(KEYS.attendance, []);
    const combined = [...saved, ...demoAttendanceRecords];
    return combined.filter(record => {
      if (filters.crewId && record.crewId !== filters.crewId) return false;
      if (filters.from && record.dutyDate < filters.from) return false;
      if (filters.to && record.dutyDate > filters.to) return false;
      return true;
    });
  });
}

export async function saveAttendance(record) {
  return liveOrFallback('attendance.save', { attendance: record }, () => {
    const items = readStorage(KEYS.attendance, []);
    const saved = {
      ...record,
      attendanceId: record.attendanceId || `ATT-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      approvalStatus: record.status === 'Late' ? 'Needs review' : 'Accepted'
    };
    writeStorage(KEYS.attendance, [saved, ...items]);
    return saved;
  });
}

export async function loadHrPolicies() {
  return liveOrFallback('policy.list', {}, () => ({ policies: hrPolicies, acknowledgements: [...policyAcknowledgements(), ...readStorage(KEYS.acknowledgements, [])] }));
}

export async function acknowledgePolicy(policyId, crewId, version) {
  return liveOrFallback('policy.acknowledge', { policyId, crewId, version }, () => {
    const items = readStorage(KEYS.acknowledgements, []);
    const saved = { policyId, crewId, version, acknowledgedAt: new Date().toISOString() };
    writeStorage(KEYS.acknowledgements, [saved, ...items.filter(item => !(item.policyId === policyId && item.crewId === crewId))]);
    return saved;
  });
}
