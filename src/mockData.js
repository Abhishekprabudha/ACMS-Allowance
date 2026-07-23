

const routes = ['KUL-PEN','PEN-JHB','SZB-BKI','KUL-LGK','JHB-KUL','PEN-SZ','KUL-BKI','LGK-PEN'];
const aircraft = ['ATR72','ATR72','B737','ATR72','B737'];
const crews = ['CPT-204','FO-872','CC-519','CPT-355','FO-111','CC-644','CPT-718','FO-226','CC-390','CC-812'];
const exceptionTypes = ['No-show','Rest risk','Missing CC','License expiry','Aircraft swap','Late check-in','Route qualification','Medical review'];
const priorities = ['High','Med','Low'];
const statuses = ['Crewed','Crewed','Crewed','Missing CC','Delay risk','Open trip'];

export const juneOpsData = Array.from({ length: 30 }, (_, dayIndex) => {
  const day = String(dayIndex + 1).padStart(2, '0');
  const date = `2026-06-${day}`;
  const flightCount = 118 + ((dayIndex * 7) % 39);
  const exceptionCount = 8 + ((dayIndex * 5) % 18);
  const lateCheckIns = 1 + ((dayIndex * 3) % 9);
  const stability = 78 + ((dayIndex * 2) % 18);
  const flights = Array.from({ length: 16 }, (_, i) => {
    const route = routes[(dayIndex + i) % routes.length];
    const hour = 5 + ((i * 2 + dayIndex) % 16);
    const minute = (10 + i * 7 + dayIndex * 3) % 60;
    const flight = `FY${String(2000 + dayIndex * 37 + i * 11).padStart(4, '0')}`;
    return {
      date,
      flight,
      sector: route,
      std: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      sta: `${String(hour + 1 + (i % 2)).padStart(2, '0')}:${String((minute + 18) % 60).padStart(2, '0')}`,
      aircraft: aircraft[(dayIndex + i) % aircraft.length],
      need: aircraft[(dayIndex + i) % aircraft.length] === 'B737' ? 'CPT/FO/4CC' : 'CPT/FO/2CC',
      status: statuses[(dayIndex + i * 2) % statuses.length],
      gate: `A${1 + ((dayIndex + i) % 12)}`,
      crewedPercent: `${88 + ((dayIndex + i) % 11)}%`
    };
  });
  const exceptions = Array.from({ length: 10 }, (_, i) => ({
    date,
    type: exceptionTypes[(dayIndex + i) % exceptionTypes.length],
    crew: crews[(dayIndex + i * 2) % crews.length],
    flight: flights[i % flights.length].flight,
    sla: `${8 + ((dayIndex + i * 6) % 80)}m`,
    priority: priorities[(dayIndex + i) % priorities.length],
    owner: ['OCC Desk','Planner','Recovery','Training'][i % 4]
  }));
  const checkins = Array.from({ length: 12 }, (_, i) => ({
    date,
    crew: crews[(dayIndex + i) % crews.length],
    flight: flights[(i * 2) % flights.length].flight,
    report: `${String(4 + ((i * 2 + dayIndex) % 17)).padStart(2, '0')}:${String((i * 9 + 15) % 60).padStart(2, '0')}`,
    actual: `${String(4 + ((i * 2 + dayIndex) % 17)).padStart(2, '0')}:${String((i * 9 + 15 + ((dayIndex + i) % 24))).padStart(2, '0')}`,
    status: (i + dayIndex) % 5 === 0 ? 'Late' : (i + dayIndex) % 7 === 0 ? 'Pending' : 'Checked-in',
    evidence: ['Geo OK','Wi-Fi OK','Device OK','Manual review'][i % 4]
  }));
  return { date, flightCount, exceptionCount, lateCheckIns, stability, flights, exceptions, checkins };
});

export function getOpsRange(startDate = '2026-06-01', endDate = startDate) {
  const start = startDate || '2026-06-01';
  const end = endDate || start;
  const days = juneOpsData.filter(day => day.date >= start && day.date <= end);
  const flights = days.flatMap(day => day.flights);
  const exceptions = days.flatMap(day => day.exceptions);
  const checkins = days.flatMap(day => day.checkins);
  const avgStability = days.length ? Math.round(days.reduce((sum, day) => sum + day.stability, 0) / days.length) : 0;
  return { days, flights, exceptions, checkins, avgStability };
}

export const mockData = {
  "kpis": [
    {
      "label": "Flights Today",
      "value": "138",
      "note": "92% crewed",
      "tone": "ok"
    },
    {
      "label": "Open Exceptions",
      "value": "17",
      "note": "6 high priority",
      "tone": "risk"
    },
    {
      "label": "Late Check-ins",
      "value": "4",
      "note": "auto-escalated",
      "tone": "warn"
    },
    {
      "label": "Roster Stability",
      "value": "87%",
      "note": "+4 pts vs last week",
      "tone": "info"
    }
  ],
  "crew": [
    {
      "crewId": "CPT-204",
      "name": "A. Rahman",
      "rank": "CPT",
      "base": "KUL",
      "fleet": "ATR",
      "status": "Ready",
      "medical": "Valid",
      "license": "Valid",
      "training": "SEP due 42d"
    },
    {
      "crewId": "FO-872",
      "name": "S. Tan",
      "rank": "FO",
      "base": "PEN",
      "fleet": "ATR",
      "status": "Training",
      "medical": "Valid",
      "license": "Valid",
      "training": "Line check"
    },
    {
      "crewId": "CC-519",
      "name": "N. Lim",
      "rank": "CC",
      "base": "KUL",
      "fleet": "ATR",
      "status": "Ready",
      "medical": "Valid",
      "license": "N/A",
      "training": "CRM valid"
    },
    {
      "crewId": "CPT-355",
      "name": "R. Kumar",
      "rank": "CPT",
      "base": "BKI",
      "fleet": "B737",
      "status": "Med expiring",
      "medical": "Expiring",
      "license": "Valid",
      "training": "Valid"
    },
    {
      "crewId": "FO-111",
      "name": "M. Lee",
      "rank": "FO",
      "base": "KUL",
      "fleet": "ATR",
      "status": "Ready",
      "medical": "Valid",
      "license": "Valid",
      "training": "Valid"
    }
  ],
  "flights": [
    {
      "flight": "FY3124",
      "sector": "KUL-PEN",
      "std": "08:10",
      "sta": "09:10",
      "aircraft": "ATR72",
      "need": "CPT/FO/2CC",
      "status": "Crewed"
    },
    {
      "flight": "FY2176",
      "sector": "PEN-JHB",
      "std": "10:30",
      "sta": "11:45",
      "aircraft": "ATR72",
      "need": "CPT/FO/2CC",
      "status": "Missing CC"
    },
    {
      "flight": "FY4020",
      "sector": "SZB-BKI",
      "std": "12:40",
      "sta": "15:15",
      "aircraft": "B737",
      "need": "CPT/FO/4CC",
      "status": "Delay risk"
    },
    {
      "flight": "FY1108",
      "sector": "KUL-LGK",
      "std": "16:05",
      "sta": "17:00",
      "aircraft": "ATR72",
      "need": "CPT/FO/2CC",
      "status": "Crewed"
    }
  ],
  "exceptions": [
    {
      "type": "No-show",
      "crew": "CPT-204",
      "sla": "12m",
      "priority": "High"
    },
    {
      "type": "Rest risk",
      "crew": "FO-872",
      "sla": "28m",
      "priority": "High"
    },
    {
      "type": "Missing CC",
      "crew": "CC-519",
      "sla": "43m",
      "priority": "Med"
    },
    {
      "type": "License expiry",
      "crew": "FO-355",
      "sla": "2h",
      "priority": "Med"
    }
  ],
  "recoveryCases": [
    {
      "caseId": "RC-204",
      "issue": "No-show CPT",
      "flight": "FY3124",
      "priority": "High",
      "status": "Open"
    },
    {
      "caseId": "RC-205",
      "issue": "Delay duty risk",
      "flight": "FY4020",
      "priority": "High",
      "status": "Open"
    },
    {
      "caseId": "RC-206",
      "issue": "Aircraft swap",
      "flight": "FY2176",
      "priority": "Med",
      "status": "Ranked"
    },
    {
      "caseId": "RC-207",
      "issue": "CC shortage",
      "flight": "FY1108",
      "priority": "Med",
      "status": "Open"
    }
  ],
  "rules": [
    {
      "rule": "Min Rest",
      "result": "Fail",
      "action": "Replace crew",
      "severity": "Hard"
    },
    {
      "rule": "Max FDP",
      "result": "Pass",
      "action": "No action",
      "severity": "Hard"
    },
    {
      "rule": "Medical Validity",
      "result": "Fail",
      "action": "Block",
      "severity": "Hard"
    },
    {
      "rule": "Route Qualification",
      "result": "Warn",
      "action": "Supervisor approval",
      "severity": "Soft"
    },
    {
      "rule": "Consecutive Days",
      "result": "Pass",
      "action": "No action",
      "severity": "Hard"
    }
  ]
};
