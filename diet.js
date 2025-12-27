// =====================
// CONFIG
// =====================
const MODE = "Prod"; // "local" or "Prod"
let sortColumn = null;
let sortAsc = true;
let currentRows = [];
let filteredRows = [];

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

// =====================
// HELPERS
// =====================
function normalizeRow(row, length = 18) {
  const normalized = [...row];
  while (normalized.length < length) normalized.push(0);
  return normalized;
}

function normalizeDateToISO(dateStr) {
  if (!dateStr) return "";

  // Already ISO (YYYY-MM-DD)
  if (dateStr.includes("-")) return dateStr;

  // Sheet format (DD/MM/YYYY)
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year) return "";
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function getWeekKey(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return null;

  const d = new Date(iso);
  const firstDay = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d - firstDay) / 86400000 + firstDay.getDay() + 1) / 7
  );

  return `${d.getFullYear()}-W${week}`;
}

function formatWeekLabel(weekKey) {
  return `Week ${weekKey.split("-W")[1]}`;
}

function getMonthKey(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// =====================
// MONTH SELECTOR
// =====================
function populateMonthSelect(rows) {
  const select = document.getElementById("monthSelect");
  if (!select) return;

  select.innerHTML = "";

  const months = [
    ...new Set(rows.map((r) => getMonthKey(r[0])).filter(Boolean)),
  ]
    .sort()
    .reverse();

  months.forEach((m) => {
    const [y, mo] = m.split("-");
    const label = new Date(y, mo - 1).toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = label;
    select.appendChild(opt);
  });

  select.value = months.includes(getCurrentMonthKey())
    ? getCurrentMonthKey()
    : months[0];
}

function applyMonthFilter() {
  const select = document.getElementById("monthSelect");
  if (!select) return;

  const monthKey = select.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r[0]) === monthKey);

  document.getElementById("filterDate").value = "";
  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
  renderWeeklyBreakdown(filteredRows);
}

// =====================
// DATE FILTER
// =====================
function applyDateFilter() {
  const selectedDate = document.getElementById("filterDate").value;
  if (!selectedDate) return;

  filteredRows = currentRows.filter(
    (r) => normalizeDateToISO(r[0]) === selectedDate
  );

  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
  renderWeeklyBreakdown(filteredRows);
}

function clearDateFilter() {
  document.getElementById("filterDate").value = "";
  applyMonthFilter();
}

// =====================
// SORTING
// =====================
function sortByColumn(index) {
  if (sortColumn === index) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = index;
    sortAsc = true;
  }

  filteredRows.sort((a, b) => {
    const x = a[index];
    const y = b[index];

    if (!isNaN(x) && !isNaN(y)) {
      return sortAsc ? x - y : y - x;
    }

    return sortAsc
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  renderTable(filteredRows);
}

// =====================
// LOAD MEALS
// =====================
async function loadMeals() {
  try {
    const res = await fetch(`${API_BASE_URL}/diet-log`);
    const rows = await res.json();

    currentRows = rows.map(normalizeRow);

    populateMonthSelect(currentRows);
    applyMonthFilter();
  } catch (err) {
    console.error(err);
  }
}

// =====================
// DAILY TOTALS
// =====================
function renderDailyTotals(rows) {
  if (!rows.length) {
    document.getElementById("dailyTotals").style.display = "none";
    return;
  }

  let c = 0,
    p = 0,
    cb = 0,
    f = 0;

  rows.forEach((r) => {
    c += Number(r[14]) || 0;
    p += Number(r[15]) || 0;
    cb += Number(r[16]) || 0;
    f += Number(r[17]) || 0;
  });

  const div = document.getElementById("dailyTotals");
  div.style.display = "block";
  div.innerHTML = `
    <h3>📊 Daily Totals</h3>
    <p><strong>Calories:</strong> ${c} kcal</p>
    <p><strong>Protein:</strong> ${p} g</p>
    <p><strong>Carbs:</strong> ${cb} g</p>
    <p><strong>Fats:</strong> ${f} g</p>
  `;
}

// =====================
// TABLE RENDER
// =====================
function renderTable(rows) {
  const headers = [
    { label: "Date", index: 0 },
    { label: "Day", index: 1 },
    { label: "Meal", index: 3 },
    { label: "Protein Source", index: 5 },
    { label: "Calories", index: 14 },
    { label: "Protein", index: 15 },
    { label: "Carbs", index: 16 },
    { label: "Fats", index: 17 },
  ];

  let html = "<tr>";
  headers.forEach((h) => {
    const arrow = sortColumn === h.index ? (sortAsc ? " ▲" : " ▼") : "";
    html += `<th onclick="sortByColumn(${h.index})">${h.label}${arrow}</th>`;
  });
  html += "</tr>";

  rows.forEach((r) => {
    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[3]}</td>
        <td>${r[5]}</td>
        <td>${r[14]}</td>
        <td>${r[15]}</td>
        <td>${r[16]}</td>
        <td>${r[17]}</td>
      </tr>
    `;
  });

  document.getElementById("dietTable").innerHTML = html;
}

function renderWeeklyBreakdown(rows) {
  const container = document.getElementById("weeklyBreakdown");
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = "";
    return;
  }

  const weeks = {};

  rows.forEach((r) => {
    const key = getWeekKey(r[0]);
    if (!key) return;

    if (!weeks[key]) {
      weeks[key] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }

    weeks[key].calories += Number(r[14]) || 0;
    weeks[key].protein += Number(r[15]) || 0;
    weeks[key].carbs += Number(r[16]) || 0;
    weeks[key].fats += Number(r[17]) || 0;
  });

  container.innerHTML = "<h3>📅 Weekly Breakdown</h3>";

  Object.keys(weeks)
    .sort()
    .forEach((wk) => {
      const w = weeks[wk];
      container.innerHTML += `
        <div class="card" style="margin-top:10px">
          <strong>${formatWeekLabel(wk)}</strong>
          <p>Calories: ${w.calories} kcal</p>
          <p>Protein: ${w.protein} g</p>
          <p>Carbs: ${w.carbs} g</p>
          <p>Fats: ${w.fats} g</p>
        </div>
      `;
    });
}

// =====================
// INIT
// =====================
loadMeals();
