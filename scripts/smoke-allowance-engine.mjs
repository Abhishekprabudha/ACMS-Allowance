import { createAllowanceWorkspace } from '../src/crewModuleData.js';

const workspace = createAllowanceWorkspace('2026-06');
if (!workspace.statements.length) throw new Error('No allowance statements generated.');
for (const statement of workspace.statements) {
  if (!Number.isFinite(statement.grandTotal) || statement.grandTotal < 0) throw new Error(`Invalid grand total for ${statement.statementId}`);
  if (!statement.records.length) throw new Error(`No roster records for ${statement.statementId}`);
}
console.log(`Allowance engine smoke test passed for ${workspace.statements.length} statements. Payroll total: RM ${workspace.statements.reduce((sum, item) => sum + item.grandTotal, 0).toFixed(2)}`);
