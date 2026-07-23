# AIonOS ACMS Advanced Crew Management

ACMS is a React + Vite crew operations application covering planning, OCC, recovery, crew records, rules, analytics and administration. Version 2 adds production-oriented **Crew Allowances**, **Crew Attendance** and **HR Policies** modules based on the supplied Firefly cabin-crew and pilot requirements.

## New advanced modules

### Crew Allowances

- Separate cabin-crew and flight-crew rule profiles.
- Actual-roster-driven daily activity matrix aligned to the supplied allowance statement tables.
- Productivity allowance, incentive, excess block hours, layover credit, meals by region, FDP extension, training, instructor/examiner, ground duty, night stop, transportation and other entitlements.
- Prior-period discrepancy adjustments with positive or negative amounts.
- Maker-checker approval, policy-version audit, printable/PDF-ready statement and email-distribution workflow.
- Payroll-month dashboard, crew-level status queue and CSV export.

### Crew Attendance

- Mobile-friendly self-service submission by crew member.
- Duty date, flight/assignment, duty code, scheduled report and actual check-in.
- Automatic on-time/late/pending status.
- Consent-based browser location capture plus network, device, evidence URL and notes.
- Backend storage in `Attendance_Records`, OCC review queue and audit logging.

### HR Policies

- Searchable published policy library for compensation, duty travel, attendance, grounding, FTL and leave.
- Audience, version, effective date, publication status and source metadata.
- Rule-to-system traceability and version-specific crew acknowledgements.
- Allowance calculations display the policy version used.

## Architecture

```text
React / Vite frontend
  -> src/backendServices.js
  -> src/api.js (text/plain JSON webhook)
  -> Google Apps Script Web App
  -> Google Sheets database + Drive report folder + MailApp
```

The frontend first attempts the configured backend. When the new backend actions are not available, it runs in a clearly identified demo mode and persists attendance, adjustments, approvals, distributions and policy acknowledgements in browser storage. This makes the complete UX testable before backend deployment.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Demo login:

- User ID: `AIONOS`
- Password: `AIONOS123`

## Quality checks

```bash
npm run test:engine
npm run build
npm run preview
```

`test:engine` validates the cabin and flight allowance calculation engine without any external dependencies.

## Connect the backend

The complete Google Apps Script backend is included in [`backend/apps-script`](backend/apps-script).

1. Open the ACMS Google Sheets database.
2. Open **Extensions > Apps Script**.
3. copy `backend/apps-script/Code.gs` and `appsscript.json`.
4. Run `initializeAcmsBackend_()` once.
5. Deploy as a Web App and copy its `/exec` URL.
6. Create `.env` from `.env.example`:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

The endpoint can also be changed at runtime from **Admin > API URL**.

### Backend tables

- `Crew_Master`
- `Roster_Actual`
- `Allowance_Rates`
- `Allowance_Adjustments`
- `Allowance_Statements`
- `Allowance_Distributions`
- `Attendance_Records`
- `HR_Policies`
- `Policy_Acknowledgements`
- `Audit_Log`

Exact headers and deployment instructions are documented in [`backend/apps-script/README.md`](backend/apps-script/README.md).

## Existing ACMS capabilities retained

- Operations command center and date-filtered KPI drill-down.
- Modern roster editor and flight-demand board.
- Crew 360, absence/no-show desk and recovery workbench.
- Optimizer scenario lab and legality/rule console.
- Analytics, backend monitor, AI copilot, administration and glossary.
- GitHub Pages build and fallback routes.

## GitHub Pages

Upload this repository to GitHub, enable GitHub Pages from GitHub Actions, and run the included deployment workflow. The Vite base path and Pages fallbacks are already configured.

## Production notes

The supplied rule values are implemented as a configurable baseline from the attached guidebooks and requirement slides. Before production payroll use, HR/Finance should approve the effective-date register, clarify any individual contract exceptions, validate the authoritative definitions of duty versus block time, confirm meal-window derivation and integrate `Crew_Master` and `Roster_Actual` with the existing ACMS backend interfaces. Server-side RBAC and corporate authentication should replace demo access.
