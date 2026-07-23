/**
 * ACMS Advanced Modules backend for Google Apps Script.
 * Deploy as a Web App and set VITE_APPS_SCRIPT_URL to the /exec endpoint.
 * The frontend sends text/plain JSON to avoid browser preflight issues.
 */

var ACMS_TABLES = {
  crew: ['Crew_ID','Staff_ID','Name','Crew_Type','Rank','Grade','Base','Fleet','Email','Instructor','Designation','Dual_Rated','Functional_Status','Active'],
  roster: ['Record_ID','Crew_ID','Duty_Date','Flight_Numbers','Duty','Sectors','Operating_Min','Paxing_Min','Diversion_ATB_Min','Return_To_Chock_Min','Block_Min','FDP_Extension_Min','Layover_Min','Night_Stop_Region','Breakfast_Count','Lunch_Count','Dinner_Count','Night_Stop_First_Day','Night_Stop_Subsequent_Days','Check_Flight_Min','Associate_Instructor_Days','Crew_Pool_Days','Talent_Event_Min','Sim_Trainee_Min','Sim_Trainer_Min','Line_Training_Min','Qualifying_Training','Instruction_Min','Examiner_Min','Ground_Duty_Days','Compass_Wing_Min','Management_Allowance','Other_Amount','Other_Detail','Remarks'],
  rates: ['Rate_ID','Crew_Type','Grade','Allowance_Type','Rate','Unit','Threshold','Effective_From','Effective_To','Version','Active'],
  adjustments: ['Adjustment_ID','Crew_ID','Period','Effective_Date','Details','Amount','Status','Created_By','Created_At'],
  statements: ['Statement_ID','Crew_ID','Period','Policy_Version','Current_Month_Total','Adjustment_Total','Grand_Total','Status','Calculated_At','Approved_By','Approved_At'],
  distributions: ['Distribution_ID','Statement_ID','Crew_ID','Period','Recipient','Mode','Delivery_Status','Report_File_ID','Distributed_By','Distributed_At'],
  attendance: ['Attendance_ID','Crew_ID','Crew_Name','Duty_Date','Flight_No','Duty_Code','Scheduled_Report','Actual_Check_In','Attendance_Status','Latitude','Longitude','Accuracy_M','Geo_Status','Wifi_Status','Device_Status','Evidence_URL','Notes','Submitted_By','Submitted_At','Source','Approval_Status'],
  policies: ['Policy_ID','Title','Category','Audience','Version','Effective_Date','Status','Acknowledgement_Required','Summary','Key_Rules_JSON','Source','Updated_At'],
  acknowledgements: ['Acknowledgement_ID','Policy_ID','Crew_ID','Version','Acknowledged_At','Source'],
  audit: ['Audit_ID','Entity_Type','Entity_ID','Action','Actor','Payload_JSON','Created_At']
};

var SHEET_NAMES = {
  crew: 'Crew_Master', roster: 'Roster_Actual', rates: 'Allowance_Rates', adjustments: 'Allowance_Adjustments',
  statements: 'Allowance_Statements', distributions: 'Allowance_Distributions', attendance: 'Attendance_Records',
  policies: 'HR_Policies', acknowledgements: 'Policy_Acknowledgements', audit: 'Audit_Log'
};

var POLICY_VERSION = 'FY-ALLOW-2026.01';

function doGet() {
  return jsonOutput_({ ok: true, service: 'ACMS Advanced Modules', version: POLICY_VERSION, timestamp: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'ping';
    var result;
    switch (action) {
      case 'ping': result = { ok: true, data: { timestamp: new Date().toISOString(), tables: Object.keys(SHEET_NAMES).length } }; break;
      case 'setup.initialize': result = initializeAcmsBackend_(); break;
      case 'allowance.workspace.get': result = getAllowanceWorkspace_(body.month); break;
      case 'allowance.adjustment.save': result = saveAllowanceAdjustment_(body.adjustment || {}); break;
      case 'allowance.statement.approve': result = approveAllowanceStatement_(body); break;
      case 'allowance.statement.distribute': result = distributeAllowanceStatement_(body.statement || {}, body.mode || 'email'); break;
      case 'attendance.list': result = listAttendance_(body); break;
      case 'attendance.save': result = saveAttendance_(body.attendance || {}); break;
      case 'policy.list': result = listPolicies_(); break;
      case 'policy.acknowledge': result = acknowledgePolicy_(body); break;
      default: result = { ok: false, message: 'Unsupported action: ' + action };
    }
    return jsonOutput_(result);
  } catch (error) {
    return jsonOutput_({ ok: false, message: error.message, stack: error.stack });
  }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function workbook_() {
  var id = PropertiesService.getScriptProperties().getProperty('ACMS_SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet_(key) {
  var ss = workbook_();
  var name = SHEET_NAMES[key];
  var headers = ACMS_TABLES[key];
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  else {
    var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    var mismatch = headers.some(function(header, index) { return existing[index] !== header; });
    if (mismatch) throw new Error('Header mismatch in ' + name + '. Expected the schema documented in backend/apps-script/README.md.');
  }
  sheet.setFrozenRows(1);
  return sheet;
}

function initializeAcmsBackend_() {
  Object.keys(SHEET_NAMES).forEach(ensureSheet_);
  seedCrew_();
  seedRates_();
  seedPolicies_();
  return { ok: true, data: { spreadsheetId: workbook_().getId(), initializedAt: new Date().toISOString(), sheets: SHEET_NAMES } };
}

function rows_(key) {
  var sheet = ensureSheet_(key);
  if (sheet.getLastRow() < 2) return [];
  var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  var headers = values.shift();
  return values.filter(function(row) { return row.some(function(value) { return value !== ''; }); }).map(function(row) {
    var object = {};
    headers.forEach(function(header, index) { object[header] = row[index]; });
    return object;
  });
}

function append_(key, object) {
  var sheet = ensureSheet_(key);
  var headers = ACMS_TABLES[key];
  sheet.appendRow(headers.map(function(header) { return object[header] === undefined ? '' : object[header]; }));
  return object;
}

function upsert_(key, idHeader, object) {
  var sheet = ensureSheet_(key);
  var headers = ACMS_TABLES[key];
  var idColumn = headers.indexOf(idHeader) + 1;
  var idValue = object[idHeader];
  if (!idValue) throw new Error(idHeader + ' is required.');
  var finder = sheet.getRange(2, idColumn, Math.max(sheet.getLastRow() - 1, 1), 1).createTextFinder(String(idValue)).matchEntireCell(true).findNext();
  var rowValues = headers.map(function(header) { return object[header] === undefined ? '' : object[header]; });
  if (finder) sheet.getRange(finder.getRow(), 1, 1, headers.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  return object;
}

function audit_(entityType, entityId, action, payload) {
  append_('audit', {
    Audit_ID: 'AUD-' + Utilities.getUuid(), Entity_Type: entityType, Entity_ID: entityId, Action: action,
    Actor: Session.getActiveUser().getEmail() || 'web-user', Payload_JSON: JSON.stringify(payload || {}), Created_At: new Date()
  });
}

function toIsoDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value).slice(0, 10);
}

function camel_(header) {
  var parts = header.toLowerCase().split('_');
  return parts[0] + parts.slice(1).map(function(value) { return value.charAt(0).toUpperCase() + value.slice(1); }).join('');
}

function camelObject_(row) {
  var result = {};
  Object.keys(row).forEach(function(key) { result[camel_(key)] = row[key]; });
  return result;
}

function number_(value) { return Number(value || 0); }
function hours_(minutes) { return number_(minutes) / 60; }
function money_(value) { return Math.round((number_(value) + Number.EPSILON) * 100) / 100; }
function total_(records, field) { return records.reduce(function(sum, record) { return sum + number_(record[field]); }, 0); }

function getAllowanceWorkspace_(month) {
  month = month || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
  var crewRows = rows_('crew').filter(function(row) { return row.Active !== false && String(row.Active).toLowerCase() !== 'false'; });
  var rosterRows = rows_('roster').filter(function(row) { return String(toIsoDate_(row.Duty_Date)).slice(0, 7) === month; });
  var adjustments = rows_('adjustments').filter(function(row) { return String(row.Period) === month; });
  var approvals = rows_('statements').filter(function(row) { return String(row.Period) === month; });
  var distributions = rows_('distributions').filter(function(row) { return String(row.Period) === month; });
  var statements = crewRows.map(function(row) {
    var crew = {
      crewId: row.Crew_ID, staffId: row.Staff_ID, name: row.Name, crewType: row.Crew_Type, rank: row.Rank, grade: row.Grade,
      base: row.Base, fleet: row.Fleet, email: row.Email, instructor: Boolean(row.Instructor), designation: row.Designation,
      dualRated: Boolean(row.Dual_Rated), functionalStatus: Boolean(row.Functional_Status)
    };
    var records = rosterRows.filter(function(item) { return item.Crew_ID === crew.crewId; }).map(rosterToFrontend_);
    var crewAdjustments = adjustments.filter(function(item) { return item.Crew_ID === crew.crewId; }).map(function(item) {
      return { adjustmentId: item.Adjustment_ID, crewId: item.Crew_ID, period: item.Period, date: toIsoDate_(item.Effective_Date), details: item.Details, amount: number_(item.Amount), status: item.Status, createdAt: item.Created_At };
    });
    var statement = calculateStatement_(crew, records, crewAdjustments, month);
    var approval = approvals.filter(function(item) { return item.Statement_ID === statement.statementId; })[0];
    var distribution = distributions.filter(function(item) { return item.Statement_ID === statement.statementId; })[0];
    statement.status = distribution ? 'Distributed' : approval && (approval.Status === 'Approved' || approval.Status === 'Distributed') ? approval.Status : 'Ready for review';
    statement.approvedAt = approval ? approval.Approved_At : '';
    statement.distributedAt = distribution ? distribution.Distributed_At : '';
    statement.reportReady = records.length > 0;
    statement.discrepancy = statement.warnings.length > 0;
    return statement;
  });
  return { ok: true, data: { month: month, crew: crewRows.map(camelObject_), statements: statements } };
}

function rosterToFrontend_(row) {
  return {
    recordId: row.Record_ID, crewId: row.Crew_ID, dutyDate: toIsoDate_(row.Duty_Date), flightNumbers: row.Flight_Numbers,
    duty: row.Duty, sectors: row.Sectors, operatingMinutes: number_(row.Operating_Min), paxingMinutes: number_(row.Paxing_Min),
    diversionAtbMinutes: number_(row.Diversion_ATB_Min), returnToChockMinutes: number_(row.Return_To_Chock_Min), blockMinutes: number_(row.Block_Min),
    fdpExtensionMinutes: number_(row.FDP_Extension_Min), layoverMinutes: number_(row.Layover_Min), nightStopRegion: row.Night_Stop_Region || 'Malaysia',
    breakfast: number_(row.Breakfast_Count), lunch: number_(row.Lunch_Count), dinner: number_(row.Dinner_Count), nightStopFirstDay: number_(row.Night_Stop_First_Day),
    nightStopSubsequentDays: number_(row.Night_Stop_Subsequent_Days), checkFlightMinutes: number_(row.Check_Flight_Min), associateInstructorDays: number_(row.Associate_Instructor_Days),
    crewPoolDays: number_(row.Crew_Pool_Days), talentEventMinutes: number_(row.Talent_Event_Min), simTraineeMinutes: number_(row.Sim_Trainee_Min), simTrainerMinutes: number_(row.Sim_Trainer_Min),
    lineTrainingMinutes: number_(row.Line_Training_Min), qualifyingTraining: String(row.Qualifying_Training).toLowerCase() === 'true', instructionMinutes: number_(row.Instruction_Min),
    examinerMinutes: number_(row.Examiner_Min), groundDutyDays: number_(row.Ground_Duty_Days), compassWingMinutes: number_(row.Compass_Wing_Min), managementAllowance: number_(row.Management_Allowance),
    otherAmount: number_(row.Other_Amount), otherDetail: row.Other_Detail, remarks: row.Remarks
  };
}

function mealRates_() {
  return {
    'Australia / New Zealand':[120,180,300], 'North America':[88,132,220], 'Western Europe':[110,165,275],
    'Central and Eastern Europe':[86,129,215], 'South America':[94,141,235], 'East Asia':[86,129,215],
    'South East Asia':[84,126,210], 'South Asia':[62,93,155], 'Central Asia':[94,141,235], 'Middle East':[110,165,275],
    'Pacific Islands':[98,147,245], 'South Africa':[80,120,200], 'Malaysia':[26,39,65]
  };
}

function calculateStatement_(crew, records, adjustments, month) {
  var breakdown = crew.crewType === 'Flight' ? calculateFlight_(crew, records) : calculateCabin_(crew, records);
  var adjustmentTotal = money_(adjustments.reduce(function(sum, item) { return sum + number_(item.amount); }, 0));
  var monetaryKeys = ['productivity','incentive','fdpExtension','meals','nightStop','instructor','training','management','transport','other'];
  var currentMonthTotal = money_(monetaryKeys.reduce(function(sum, key) { return sum + number_(breakdown[key]); }, 0));
  var warnings = [];
  if (!records.length) warnings.push('No actual roster rows were found for this crew member.');
  if (breakdown.excessBlockMinutes > 0) warnings.push('Excess block-hour rate applied above 80:00.');
  return {
    statementId: 'ALS-' + crew.crewId + '-' + month.replace('-', ''), crew: crew, period: month, policyVersion: POLICY_VERSION,
    records: records, adjustments: adjustments, breakdown: breakdown, currentMonthTotal: currentMonthTotal, adjustmentTotal: adjustmentTotal,
    grandTotal: money_(currentMonthTotal + adjustmentTotal), warnings: warnings, status: 'Draft', calculatedAt: new Date().toISOString()
  };
}

function calculateMeals_(records) {
  var rates = mealRates_();
  return money_(records.reduce(function(sum, record) {
    var values = rates[record.nightStopRegion] || rates.Malaysia;
    return sum + number_(record.breakfast) * values[0] + number_(record.lunch) * values[1] + number_(record.dinner) * values[2];
  }, 0));
}

function calculateNightStop_(records) { return money_(records.reduce(function(sum, record) { return sum + number_(record.nightStopFirstDay) * 75 + number_(record.nightStopSubsequentDays) * 30; }, 0)); }

function calculateCabin_(crew, records) {
  var rates = { 'F-D1':[35,45,14,49], 'F-E4-CC':[35,45,14,49], 'F-E3-CC':[30,40,14,44] };
  var rate = rates[crew.grade] || rates['F-E3-CC'];
  var productive = total_(records,'operatingMinutes') + total_(records,'paxingMinutes') + total_(records,'diversionAtbMinutes') + total_(records,'returnToChockMinutes');
  var block = total_(records,'blockMinutes');
  var layover = records.reduce(function(sum, row) { return sum + (row.layoverMinutes >= 180 && row.layoverMinutes <= 660 ? 180 : row.layoverMinutes >= 120 ? 60 : 0); }, 0);
  var excess = Math.max(0, block - 4800);
  var baseMinutes = productive + layover;
  var instructor = total_(records,'associateInstructorDays') * 200 + Math.min(8,total_(records,'crewPoolDays')) * 200 + hours_(total_(records,'checkFlightMinutes')) * rate[0];
  return { productiveDutyMinutes: productive, blockMinutes: block, excessBlockMinutes: excess, layoverCreditMinutes: layover,
    productivity: money_(hours_(baseMinutes) * rate[0] + hours_(excess) * rate[1]), incentive: money_(hours_(baseMinutes) * rate[2]), fdpExtension: 0,
    meals: calculateMeals_(records), nightStop: calculateNightStop_(records), instructor: money_(instructor), training: 0, management: 0,
    transport: crew.dualRated ? 200 : 0, other: money_(total_(records,'otherAmount') + Math.min(6,hours_(total_(records,'talentEventMinutes'))) * rate[3]) };
}

function calculateFlight_(crew, records) {
  var rates = { 'F-C2-P':[210,60,180,50,840], 'F-C1-P':[140,15,120,10,560], 'F-D2-P':[75,15,80,10,300], 'F-D1-P':[0,0,0,0,0] };
  var rate = rates[crew.grade] || rates['F-C1-P'];
  var block = total_(records,'blockMinutes') || total_(records,'operatingMinutes') + total_(records,'paxingMinutes');
  var excess = Math.max(0, block - 4800); var base = block - excess;
  var cadet = crew.grade === 'F-D1-P' && !crew.functionalStatus;
  var eligibleTraining = records.reduce(function(sum,row){ return sum + (row.qualifyingTraining ? number_(row.simTraineeMinutes) + number_(row.lineTrainingMinutes) : 0); },0);
  return { productiveDutyMinutes:block, blockMinutes:block, excessBlockMinutes:excess, layoverCreditMinutes:0,
    productivity: money_(cadet ? 1200 : hours_(base)*rate[0] + hours_(excess)*rate[2]), incentive: money_(cadet ? 0 : hours_(base)*rate[1] + hours_(excess)*rate[3]),
    fdpExtension: money_(cadet ? 0 : hours_(total_(records,'fdpExtensionMinutes'))*(rate[0]+rate[1])), meals:calculateMeals_(records), nightStop:calculateNightStop_(records),
    instructor:money_(hours_(total_(records,'instructionMinutes'))*100 + hours_(total_(records,'examinerMinutes'))*150), training:money_(cadet ? 0 : hours_(eligibleTraining)*rate[0]),
    management:money_(total_(records,'managementAllowance')), transport:0, other:money_(total_(records,'otherAmount') + total_(records,'groundDutyDays')*rate[4] + hours_(Math.max(total_(records,'compassWingMinutes'), total_(records,'compassWingMinutes') > 0 ? 120 : 0))*rate[0]) };
}

function saveAllowanceAdjustment_(adjustment) {
  var id = adjustment.adjustmentId || 'ADJ-' + Utilities.getUuid();
  var row = { Adjustment_ID:id, Crew_ID:adjustment.crewId, Period:adjustment.period, Effective_Date:adjustment.date, Details:adjustment.details,
    Amount:number_(adjustment.amount), Status:adjustment.status || 'Draft', Created_By:Session.getActiveUser().getEmail() || 'web-user', Created_At:new Date() };
  append_('adjustments', row); audit_('Allowance_Adjustment', id, 'CREATE', row);
  return { ok:true, data:{ adjustmentId:id, crewId:row.Crew_ID, period:row.Period, date:toIsoDate_(row.Effective_Date), details:row.Details, amount:row.Amount, status:row.Status, createdAt:row.Created_At } };
}

function approveAllowanceStatement_(body) {
  var statementId = body.statementId; var now = new Date();
  var row = { Statement_ID:statementId, Crew_ID:body.crewId, Period:body.period, Policy_Version:POLICY_VERSION, Status:'Approved', Approved_By:Session.getActiveUser().getEmail() || 'web-approver', Approved_At:now, Calculated_At:now };
  upsert_('statements','Statement_ID',row); audit_('Allowance_Statement',statementId,'APPROVE',row);
  return { ok:true, data:{ statementId:statementId, approvedAt:now.toISOString(), approvedBy:row.Approved_By } };
}

function distributeAllowanceStatement_(statement, mode) {
  if (!statement || !statement.statementId || !statement.crew) throw new Error('A complete statement payload is required.');
  var report = createAllowancePdf_(statement);
  var recipient = statement.crew.email;
  var deliveryStatus = 'Recorded';
  if (mode === 'email' && recipient) {
    MailApp.sendEmail({ to:recipient, subject:'Crew allowance statement - ' + statement.period, htmlBody:'<p>Dear ' + statement.crew.name + ',</p><p>Your crew allowance statement for <b>' + statement.period + '</b> is attached.</p><p>Statement ID: ' + statement.statementId + '</p>', attachments:[report.blob] });
    deliveryStatus = 'Sent';
  }
  var now = new Date();
  var id = 'DST-' + Utilities.getUuid();
  var row = { Distribution_ID:id, Statement_ID:statement.statementId, Crew_ID:statement.crew.crewId, Period:statement.period, Recipient:recipient, Mode:mode,
    Delivery_Status:deliveryStatus, Report_File_ID:report.fileId, Distributed_By:Session.getActiveUser().getEmail() || 'web-user', Distributed_At:now };
  append_('distributions',row); audit_('Allowance_Statement',statement.statementId,'DISTRIBUTE',row);
  return { ok:true, data:{ distributionId:id, statementId:statement.statementId, recipient:recipient, mode:mode, deliveryStatus:deliveryStatus, distributedAt:now.toISOString(), reportFileId:report.fileId } };
}

function createAllowancePdf_(statement) {
  var document = DocumentApp.create(statement.statementId + ' - Allowance Statement');
  var body = document.getBody();
  body.appendParagraph('Firefly Crew Productivity Allowances').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Period: ' + statement.period + ' | Statement: ' + statement.statementId);
  body.appendTable([
    ['Name', statement.crew.name || ''], ['Staff ID', statement.crew.staffId || ''], ['Rank / Grade',(statement.crew.rank || '') + ' / ' + (statement.crew.grade || '')],
    ['Base / Fleet',(statement.crew.base || '') + ' / ' + (statement.crew.fleet || '')], ['Policy version', statement.policyVersion || POLICY_VERSION]
  ]);
  body.appendParagraph('Calculated entitlement').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var b = statement.breakdown || {};
  body.appendTable([
    ['Productivity',formatMoney_(b.productivity)], ['Incentive',formatMoney_(b.incentive)], ['FDP extension',formatMoney_(b.fdpExtension)], ['Meals',formatMoney_(b.meals)],
    ['Night stop',formatMoney_(b.nightStop)], ['Instructor / examiner',formatMoney_(b.instructor)], ['Training',formatMoney_(b.training)], ['Management',formatMoney_(b.management)],
    ['Transportation',formatMoney_(b.transport)], ['Other',formatMoney_(b.other)], ['Adjustments',formatMoney_(statement.adjustmentTotal)], ['FINAL GRAND TOTAL',formatMoney_(statement.grandTotal)]
  ]);
  body.appendParagraph('Daily breakdown').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var rows = [['Date','Flight','Duty','Sectors','Operating min','Block min','FDP ext.','B/L/D']];
  (statement.records || []).forEach(function(record){ rows.push([record.dutyDate,record.flightNumbers,record.duty,record.sectors,String(record.operatingMinutes||0),String(record.blockMinutes||0),String(record.fdpExtensionMinutes||0),(record.breakfast||0)+'/'+(record.lunch||0)+'/'+(record.dinner||0)]); });
  body.appendTable(rows);
  body.appendParagraph('Generated by ACMS. This statement is traceable to actual roster rows, effective rates, adjustments, approvals and distribution history.');
  document.saveAndClose();
  var file = DriveApp.getFileById(document.getId());
  var pdf = file.getAs(MimeType.PDF).setName(statement.statementId + '.pdf');
  var folderId = PropertiesService.getScriptProperties().getProperty('ACMS_REPORT_FOLDER_ID');
  var pdfFile = folderId ? DriveApp.getFolderById(folderId).createFile(pdf) : DriveApp.createFile(pdf);
  file.setTrashed(true);
  return { blob:pdf, fileId:pdfFile.getId() };
}

function formatMoney_(value) { return 'RM ' + money_(value).toFixed(2); }

function listAttendance_(filters) {
  var records = rows_('attendance').map(function(row){ return { attendanceId:row.Attendance_ID, crewId:row.Crew_ID, crewName:row.Crew_Name, dutyDate:toIsoDate_(row.Duty_Date), flightNo:row.Flight_No,
    dutyCode:row.Duty_Code, scheduledReport:row.Scheduled_Report, actualCheckIn:row.Actual_Check_In, status:row.Attendance_Status, latitude:row.Latitude, longitude:row.Longitude,
    accuracyM:row.Accuracy_M, geoStatus:row.Geo_Status, wifiStatus:row.Wifi_Status, deviceStatus:row.Device_Status, evidenceUrl:row.Evidence_URL, notes:row.Notes,
    submittedBy:row.Submitted_By, submittedAt:row.Submitted_At, source:row.Source, approvalStatus:row.Approval_Status }; });
  records = records.filter(function(record){ return (!filters.crewId || record.crewId === filters.crewId) && (!filters.from || record.dutyDate >= filters.from) && (!filters.to || record.dutyDate <= filters.to); });
  return { ok:true, data:records.sort(function(a,b){ return String(b.submittedAt).localeCompare(String(a.submittedAt)); }) };
}

function saveAttendance_(attendance) {
  var id = attendance.attendanceId || 'ATT-' + Utilities.getUuid(); var now = new Date();
  var row = { Attendance_ID:id, Crew_ID:attendance.crewId, Crew_Name:attendance.crewName, Duty_Date:attendance.dutyDate, Flight_No:attendance.flightNo, Duty_Code:attendance.dutyCode,
    Scheduled_Report:attendance.scheduledReport, Actual_Check_In:attendance.actualCheckIn, Attendance_Status:attendance.status, Latitude:attendance.latitude, Longitude:attendance.longitude,
    Accuracy_M:attendance.accuracyM, Geo_Status:attendance.geoStatus, Wifi_Status:attendance.wifiStatus, Device_Status:attendance.deviceStatus, Evidence_URL:attendance.evidenceUrl,
    Notes:attendance.notes, Submitted_By:attendance.submittedBy || attendance.crewId, Submitted_At:now, Source:attendance.source || 'web', Approval_Status:attendance.status === 'Late' ? 'Needs review' : 'Accepted' };
  append_('attendance',row); audit_('Attendance',id,'CREATE',row);
  var result = camelObject_(row); result.attendanceId=id; result.status=row.Attendance_Status; result.approvalStatus=row.Approval_Status; result.submittedAt=now.toISOString(); result.dutyDate=toIsoDate_(row.Duty_Date);
  return { ok:true, data:result };
}

function listPolicies_() {
  var policies = rows_('policies').map(function(row){ return { policyId:row.Policy_ID,title:row.Title,category:row.Category,audience:row.Audience,version:row.Version,effectiveDate:toIsoDate_(row.Effective_Date),status:row.Status,
    acknowledgementRequired:String(row.Acknowledgement_Required).toLowerCase()==='true',summary:row.Summary,keyRules:JSON.parse(row.Key_Rules_JSON||'[]'),source:row.Source }; });
  var acknowledgements = rows_('acknowledgements').map(function(row){ return { policyId:row.Policy_ID,crewId:row.Crew_ID,version:row.Version,acknowledgedAt:row.Acknowledged_At }; });
  return { ok:true, data:{ policies:policies, acknowledgements:acknowledgements } };
}

function acknowledgePolicy_(body) {
  var now = new Date(); var id='ACK-'+Utilities.getUuid();
  var row={ Acknowledgement_ID:id,Policy_ID:body.policyId,Crew_ID:body.crewId,Version:body.version,Acknowledged_At:now,Source:'web' };
  append_('acknowledgements',row); audit_('HR_Policy',body.policyId,'ACKNOWLEDGE',row);
  return { ok:true,data:{ acknowledgementId:id,policyId:body.policyId,crewId:body.crewId,version:body.version,acknowledgedAt:now.toISOString() } };
}

function seedCrew_() {
  if (rows_('crew').length) return;
  var seed = [
    ['CPT-204','FY0204','A. Rahman','Flight','Captain','F-C2-P','KUL','ATR72','a.rahman@example.com',true,'Flight Instructor',false,true,true],
    ['FO-872','FY0872','S. Tan','Flight','First Officer','F-C1-P','PEN','ATR72','s.tan@example.com',false,'Line Pilot',false,true,true],
    ['CC-519','FY0519','N. Lim','Cabin','Cabin Crew','F-E3-CC','KUL','ATR72','n.lim@example.com',false,'Cabin Crew',false,true,true],
    ['CC-644','FY0644','F. Aisyah','Cabin','Cabin Crew In-Charge','F-E4-CC','PEN','ATR72','f.aisyah@example.com',true,'Associate Instructor',true,true,true]
  ];
  var sheet=ensureSheet_('crew'); sheet.getRange(2,1,seed.length,seed[0].length).setValues(seed);
}

function seedRates_() {
  if (rows_('rates').length) return;
  var values = [
    ['CAB-E4-PA','Cabin','F-E4-CC','Productivity',35,'RM/hour','Base','2025-08-01','',POLICY_VERSION,true],
    ['CAB-E3-PA','Cabin','F-E3-CC','Productivity',30,'RM/hour','Base','2025-08-01','',POLICY_VERSION,true],
    ['CAB-PI','Cabin','ALL','Incentive',14,'RM/hour','Base','2025-08-01','',POLICY_VERSION,true],
    ['FLT-CPT-PA','Flight','F-C2-P','Productivity',210,'RM/hour','Base','2026-06-30','',POLICY_VERSION,true],
    ['FLT-CPT-PI','Flight','F-C2-P','Incentive',60,'RM/hour','Base','2026-06-30','',POLICY_VERSION,true],
    ['FLT-FO-PA','Flight','F-C1-P','Productivity',140,'RM/hour','Base','2026-06-30','',POLICY_VERSION,true],
    ['FLT-FO-PI','Flight','F-C1-P','Incentive',15,'RM/hour','Base','2026-06-30','',POLICY_VERSION,true]
  ];
  var sheet=ensureSheet_('rates'); sheet.getRange(2,1,values.length,values[0].length).setValues(values);
}

function seedPolicies_() {
  if (rows_('policies').length) return;
  var now=new Date();
  var values=[
    ['POL-ALLOW-CABIN-001','Cabin Crew Allowance Scheme','Compensation & Benefits','Cabin Crew','1.0.0','2025-08-01','Published',true,'Cabin crew productivity, incentive, layover, meal, assignment, night-stop and transportation entitlements.',JSON.stringify(['Productivity is based on actual duty hours.','Excess block-hour rate applies above 80 monthly hours.','Layover credit is one or three hours by duration.']),'FY Cabin Crew Guidebook',now],
    ['POL-ALLOW-FLIGHT-001','Flight Crew Allowance Scheme','Compensation & Benefits','Flight Crew','Issue 1 Revision 2','2026-06-30','Published',true,'Pilot productivity, incentive, FDP extension, cadet, meal, training, night-stop and instructor entitlements.',JSON.stringify(['Rates are based on operating and positioning block time.','Excess rate applies above 80 monthly hours.','Eligible FDP extension is separately payable.']),'FY Pilot Guidebook',now],
    ['POL-ATT-001','Crew Attendance & Check-in Control','Operations','All Crew','2.1','2026-05-01','Published',true,'Crew self-service reporting with timing and evidence controls.',JSON.stringify(['Attendance is submitted against assigned duty.','Late and pending records route to OCC review.','Evidence is retained in the audit trail.']),'ACMS Operations Control Policy',now]
  ];
  var sheet=ensureSheet_('policies'); sheet.getRange(2,1,values.length,values[0].length).setValues(values);
}
