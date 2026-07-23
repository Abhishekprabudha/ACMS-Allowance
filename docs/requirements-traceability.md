# Requirements Traceability - ACMS Advanced Modules

## Supplied requirements mapped to the application

| Requirement | Frontend implementation | Backend / table |
|---|---|---|
| Replace Excel formula-driven allowance calculations | Cabin and flight rule engine in `src/allowanceEngine.js` | Server calculation in `backend/apps-script/Code.gs` |
| Use actual roster and crew master data | Monthly workspace loads crew profile and daily actual activity | `Crew_Master`, `Roster_Actual` |
| Cabin and pilot calculation differences | Crew-type and grade-specific rate profiles | `Allowance_Rates` plus calculation service |
| Daily allowance statement similar to shared tables | Grouped, horizontally scrollable daily matrix | Daily records retained against each statement |
| Productivity allowance and incentive | Monthly calculated breakdown | `Allowance_Statements` |
| Above-80-hours processing | Excess block minutes displayed and rate applied | Statement calculation audit |
| Meal allowance by region and meal window | Regional breakfast/lunch/dinner register | Effective rates can be stored in `Allowance_Rates` |
| Cabin layover credit | One- or three-hour credit by supplied duration bands | Roster field `Layover_Min` |
| Pilot FDP extension | Separate payable component | Roster field `FDP_Extension_Min` |
| Training / instructor / examiner / ground assignment | Role-specific daily and hourly calculation fields | Corresponding `Roster_Actual` columns |
| Unscheduled night stop | First-day and subsequent-day calculation | Night-stop fields in `Roster_Actual` |
| Prior discrepancy adjustment | Add, approve and recalculate statement | `Allowance_Adjustments` |
| Draft, review, approval and finalization | Workflow rail and statement status actions | `Allowance_Statements`, `Audit_Log` |
| Individual PDF report and email distribution | Print/PDF statement in browser; Apps Script can generate PDF and email | `Allowance_Distributions`, Drive, MailApp |
| Reliable retention and audit trail | All writes capture actor, action, payload and timestamp | `Audit_Log` |
| Role-based access readiness | Existing ACMS Admin/RBAC module retained; backend hardening documented | Corporate authentication required for production |
| Crew attendance self-service | Mobile-friendly attendance capture screen | `Attendance_Records` |
| Attendance evidence | Consent-based geo capture, network, device and evidence URL fields | Stored with each attendance record |
| Late, pending and no-show visibility | Automatic status and OCC review register | Attendance list API and operational queue |
| Additional HR policies | Searchable policy module with versions and effective dates | `HR_Policies` |
| Crew policy acknowledgement | Crew/version-specific acknowledgement action | `Policy_Acknowledgements` |

## Implementation decisions requiring business confirmation

1. The cabin guidebook describes base productivity by actual duty hours and an additional above-80-block-hours rate. The engine preserves those as separate concepts and exposes the excess minutes for review.
2. Pilot above-80 rates in the supplied guidebook are lower than the base rates. The engine uses the supplied values for excess minutes; Finance should confirm that interpretation before payroll use.
3. Meal eligibility counts are expected from the roster/interface layer after applying station-period and local meal-window logic. The application multiplies those eligible counts by the effective regional rates.
4. Individual employment terms, management-pilot assignment letters and policy exceptions must be added as effective-dated overrides rather than embedded in source code.
5. The included Apps Script webhook is a working reference implementation. Production access must enforce corporate identity and server-side role checks.
