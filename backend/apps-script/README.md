# ACMS Apps Script Backend - Allowances, Attendance and HR Policies

This backend extends the existing ACMS `text/plain` JSON webhook pattern. It creates and governs the tables needed by the new modules, calculates crew allowances from actual roster rows, stores attendance, maintains policy versions and acknowledgements, and records every write in an audit log.

## Deploy

1. Create or open the Google Sheet used as the ACMS database.
2. Open **Extensions > Apps Script** and replace `Code.gs` and `appsscript.json` with the files in this folder.
3. Run `initializeAcmsBackend_()` once from the editor and authorize access. It creates the tables and starter rate/policy rows.
4. Deploy as **Web app**, execute as the deploying user, and grant access appropriate to your environment.
5. Copy the `/exec` URL into the frontend `.env` as `VITE_APPS_SCRIPT_URL`, or paste it under **Admin > API URL**.
6. Optionally set script properties:
   - `ACMS_SPREADSHEET_ID` when the script is standalone rather than bound to the database Sheet.
   - `ACMS_REPORT_FOLDER_ID` to store generated allowance PDFs in a controlled Drive folder.

## Database tables

| Sheet | Purpose |
|---|---|
| `Crew_Master` | Crew identity, type, grade, base, fleet, email and allowance attributes. |
| `Roster_Actual` | Daily actual activity matching the cabin and flight crew allowance statement layout. |
| `Allowance_Rates` | Effective-dated, versioned rate register. |
| `Allowance_Adjustments` | Prior-period discrepancies and manual approved corrections. |
| `Allowance_Statements` | Monthly calculation and approval status. |
| `Allowance_Distributions` | PDF/email delivery history. |
| `Attendance_Records` | Crew-submitted duty attendance and evidence. |
| `HR_Policies` | Published policy metadata and key governed rules. |
| `Policy_Acknowledgements` | Crew/version-specific acceptance records. |
| `Audit_Log` | Immutable action history for creates, approvals, distribution and acknowledgements. |

The exact headers are defined in `ACMS_TABLES` at the top of `Code.gs`. Keep them unchanged unless the frontend adapter is updated at the same time.

## Supported webhook actions

- `ping`
- `setup.initialize`
- `allowance.workspace.get`
- `allowance.adjustment.save`
- `allowance.statement.approve`
- `allowance.statement.distribute`
- `attendance.list`
- `attendance.save`
- `policy.list`
- `policy.acknowledge`

## Production hardening

Before production, replace public web-app access with the organization-approved authentication pattern, validate user roles server-side, protect rate and policy sheets, use a controlled report folder, configure sender quotas, and connect `Roster_Actual` and `Crew_Master` to the authoritative ACMS interfaces rather than starter rows.
