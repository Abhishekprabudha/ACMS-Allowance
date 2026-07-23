export const MEAL_RATES = [
  { region: 'Australia / New Zealand', daily: 600, breakfast: 120, lunch: 180, dinner: 300 },
  { region: 'North America', daily: 440, breakfast: 88, lunch: 132, dinner: 220 },
  { region: 'Western Europe', daily: 550, breakfast: 110, lunch: 165, dinner: 275 },
  { region: 'Central and Eastern Europe', daily: 430, breakfast: 86, lunch: 129, dinner: 215 },
  { region: 'South America', daily: 470, breakfast: 94, lunch: 141, dinner: 235 },
  { region: 'East Asia', daily: 430, breakfast: 86, lunch: 129, dinner: 215 },
  { region: 'South East Asia', daily: 420, breakfast: 84, lunch: 126, dinner: 210 },
  { region: 'South Asia', daily: 310, breakfast: 62, lunch: 93, dinner: 155 },
  { region: 'Central Asia', daily: 470, breakfast: 94, lunch: 141, dinner: 235 },
  { region: 'Middle East', daily: 550, breakfast: 110, lunch: 165, dinner: 275 },
  { region: 'Pacific Islands', daily: 490, breakfast: 98, lunch: 147, dinner: 245 },
  { region: 'South Africa', daily: 400, breakfast: 80, lunch: 120, dinner: 200 },
  { region: 'Malaysia', daily: 130, breakfast: 26, lunch: 39, dinner: 65 }
];

export const CABIN_RATES = {
  'F-D1': { productivity: 35, excessProductivity: 45, incentive: 14, talent: 49 },
  'F-E4-CC': { productivity: 35, excessProductivity: 45, incentive: 14, talent: 49 },
  'F-E3-CC': { productivity: 30, excessProductivity: 40, incentive: 14, talent: 44 }
};

export const FLIGHT_RATES = {
  'F-C2-P': { productivity: 210, incentive: 60, excessProductivity: 180, excessIncentive: 50, groundDay: 840 },
  'F-C1-P': { productivity: 140, incentive: 15, excessProductivity: 120, excessIncentive: 10, groundDay: 560 },
  'F-D2-P': { productivity: 75, incentive: 15, excessProductivity: 80, excessIncentive: 10, groundDay: 300 },
  'F-D1-P': { fixed: 1200, productivity: 0, incentive: 0, excessProductivity: 0, excessIncentive: 0, groundDay: 0 }
};

export const POLICY_VERSION = 'FY-ALLOW-2026.01';

export function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function minutesToHours(minutes) {
  return Number(minutes || 0) / 60;
}

export function formatHours(minutes) {
  const value = Number(minutes || 0);
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
}

function getMealRate(region) {
  return MEAL_RATES.find(item => item.region === region) || MEAL_RATES.find(item => item.region === 'Malaysia');
}

function sum(records, field) {
  return records.reduce((total, record) => total + Number(record[field] || 0), 0);
}

function calculateMeals(records) {
  return roundMoney(records.reduce((total, record) => {
    const rate = getMealRate(record.nightStopRegion || 'Malaysia');
    return total + Number(record.breakfast || 0) * rate.breakfast + Number(record.lunch || 0) * rate.lunch + Number(record.dinner || 0) * rate.dinner;
  }, 0));
}

function calculateNightStop(records) {
  return roundMoney(records.reduce((total, record) => {
    const first = Number(record.nightStopFirstDay || 0);
    const subsequent = Number(record.nightStopSubsequentDays || 0);
    return total + Math.min(first * 75, first * 75) + Math.min(subsequent * 30, subsequent * 30);
  }, 0));
}

function calculateCabin(crew, records) {
  const rate = CABIN_RATES[crew.grade] || CABIN_RATES['F-E3-CC'];
  const operating = sum(records, 'operatingMinutes');
  const paxing = sum(records, 'paxingMinutes');
  const diversion = sum(records, 'diversionAtbMinutes');
  const returnToChock = sum(records, 'returnToChockMinutes');
  const blockMinutes = sum(records, 'blockMinutes');
  const productiveDutyMinutes = operating + paxing + diversion + returnToChock;
  const layoverCreditMinutes = records.reduce((total, record) => {
    const layover = Number(record.layoverMinutes || 0);
    if (layover >= 180 && layover <= 660) return total + 180;
    if (layover >= 120) return total + 60;
    return total;
  }, 0);
  const baseMinutes = productiveDutyMinutes + layoverCreditMinutes;
  const excessBlockMinutes = Math.max(0, blockMinutes - 80 * 60);
  const productivity = minutesToHours(baseMinutes) * rate.productivity;
  const excessProductivity = minutesToHours(excessBlockMinutes) * rate.excessProductivity;
  const incentive = minutesToHours(baseMinutes) * rate.incentive;
  const checkFlight = minutesToHours(sum(records, 'checkFlightMinutes')) * rate.productivity;
  const physicalClassDays = sum(records, 'associateInstructorDays');
  const crewPoolDays = Math.min(8, sum(records, 'crewPoolDays'));
  const instructor = physicalClassDays * 200 + crewPoolDays * 200 + checkFlight;
  const talentHours = Math.min(6, minutesToHours(sum(records, 'talentEventMinutes')));
  const talentEvent = talentHours * rate.talent;
  const transport = crew.dualRated ? 200 : 0;
  const meals = calculateMeals(records);
  const nightStop = calculateNightStop(records);
  const other = sum(records, 'otherAmount');

  return {
    productiveDutyMinutes,
    blockMinutes,
    excessBlockMinutes,
    layoverCreditMinutes,
    productivity: roundMoney(productivity + excessProductivity),
    incentive: roundMoney(incentive),
    fdpExtension: 0,
    meals,
    nightStop,
    instructor: roundMoney(instructor),
    training: 0,
    management: 0,
    transport: roundMoney(transport),
    other: roundMoney(other)
  };
}

function calculateFlight(crew, records) {
  const rate = FLIGHT_RATES[crew.grade] || FLIGHT_RATES['F-C1-P'];
  const blockMinutes = sum(records, 'blockMinutes') || sum(records, 'operatingMinutes') + sum(records, 'paxingMinutes');
  const excessBlockMinutes = Math.max(0, blockMinutes - 80 * 60);
  const baseBlockMinutes = Math.max(0, blockMinutes - excessBlockMinutes);
  const cadetFixed = crew.grade === 'F-D1-P' && crew.functionalStatus !== true ? rate.fixed : 0;
  const productivity = cadetFixed || minutesToHours(baseBlockMinutes) * rate.productivity + minutesToHours(excessBlockMinutes) * rate.excessProductivity;
  const incentive = cadetFixed ? 0 : minutesToHours(baseBlockMinutes) * rate.incentive + minutesToHours(excessBlockMinutes) * rate.excessIncentive;
  const fdpMinutes = sum(records, 'fdpExtensionMinutes');
  const fdpExtension = cadetFixed ? 0 : minutesToHours(fdpMinutes) * (rate.productivity + rate.incentive);
  const qualifyingTrainingMinutes = records.reduce((total, record) => record.qualifyingTraining ? total + Number(record.simTraineeMinutes || 0) + Number(record.lineTrainingMinutes || 0) : total, 0);
  const training = cadetFixed ? 0 : minutesToHours(qualifyingTrainingMinutes) * rate.productivity;
  const flightInstructorMinutes = sum(records, 'instructionMinutes');
  const examinerMinutes = sum(records, 'examinerMinutes');
  const instructor = minutesToHours(flightInstructorMinutes) * 100 + minutesToHours(examinerMinutes) * 150;
  const groundDays = sum(records, 'groundDutyDays');
  const groundDuty = groundDays * rate.groundDay;
  const compassMinutes = sum(records, 'compassWingMinutes');
  const compassWing = minutesToHours(Math.max(compassMinutes, compassMinutes > 0 ? 120 : 0)) * rate.productivity;
  const meals = calculateMeals(records);
  const nightStop = calculateNightStop(records);
  const management = sum(records, 'managementAllowance');
  const other = sum(records, 'otherAmount') + groundDuty + compassWing;

  return {
    productiveDutyMinutes: blockMinutes,
    blockMinutes,
    excessBlockMinutes,
    layoverCreditMinutes: 0,
    productivity: roundMoney(productivity),
    incentive: roundMoney(incentive),
    fdpExtension: roundMoney(fdpExtension),
    meals,
    nightStop,
    instructor: roundMoney(instructor),
    training: roundMoney(training),
    management: roundMoney(management),
    transport: 0,
    other: roundMoney(other)
  };
}

export function calculateAllowanceStatement(crew, records = [], adjustments = []) {
  const breakdown = crew.crewType === 'Flight' ? calculateFlight(crew, records) : calculateCabin(crew, records);
  const adjustmentTotal = roundMoney(adjustments.reduce((total, item) => total + Number(item.amount || 0), 0));
  const currentMonthTotal = roundMoney(Object.entries(breakdown)
    .filter(([key]) => !key.endsWith('Minutes'))
    .reduce((total, [, value]) => total + Number(value || 0), 0));
  const grandTotal = roundMoney(currentMonthTotal + adjustmentTotal);
  const warnings = [];
  if (!records.length) warnings.push('No actual roster rows were found for this crew member.');
  if (breakdown.blockMinutes > 80 * 60) warnings.push(`Excess block-hour rate applied to ${formatHours(breakdown.excessBlockMinutes)} above 80:00.`);
  if (records.some(record => !record.dutyDate)) warnings.push('One or more roster rows are missing a duty date.');
  if (records.some(record => Number(record.fdpExtensionMinutes || 0) > 0) && crew.crewType === 'Cabin') warnings.push('Cabin FDP extension is visible for audit but not automatically payable under the supplied rule set.');

  return {
    statementId: `ALS-${crew.crewId}-${records[0]?.dutyDate?.slice(0, 7)?.replace('-', '') || 'PERIOD'}`,
    crew,
    period: records[0]?.dutyDate?.slice(0, 7) || '',
    policyVersion: POLICY_VERSION,
    records,
    adjustments,
    breakdown,
    currentMonthTotal,
    adjustmentTotal,
    grandTotal,
    warnings,
    status: 'Draft',
    calculatedAt: new Date().toISOString()
  };
}
