// =====================
// CONFIG
// =====================
const MODE = "Prod"; // "local" or "Prod"

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

// =====================
// USER TARGETS
// =====================
const TARGETS = {
  caloriesPerDay: 1800,
  proteinPerDay: 120,
};

// =====================
// STATE
// =====================
let sortColumn = null;
let sortAsc = true;
let currentRows = [];
let filteredRows = [];

// =====================
// HELPERS
// =====================
function normalizeRow(row, length = 18) {
  const out = [...row];
  while (out.length < length) out.push(0);
  return out;
}

function normalizeDateToISO(dateStr) {
  if (!dateStr) return "";

  if (dateStr.includes("-")) return dateStr; // YYYY-MM-DD

  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return "";
}

function getMonthKey(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekKey(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return null;

  const d = new Date(iso);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor((d - start) / 86400000);
  const week = Math.ceil((diff + start.getDay() + 1) / 7);

  return `${d.getFullYear()}-W${week}`;
}

function formatWeekLabel(key) {
  return `Week ${key.split("-W")[1]}`;
}

// =====================
// MONTH SELECTOR
// =====================
function populateMonthSelect(rows) {
  const select = document.getElementById("monthSelect");
  if (!select) return;

  const months = [
    ...new Set(rows.map((r) => getMonthKey(r[0])).filter(Boolean)),
  ]
    .sort()
    .reverse();

  select.innerHTML = "";

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

  const key = select.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r[0]) === key);

  document.getElementById("filterDate").value = "";
  renderAll();
}

// =====================
// DATE FILTER
// =====================
function applyDateFilter() {
  const date = document.getElementById("filterDate").value;
  if (!date) return;

  filteredRows = currentRows.filter((r) => normalizeDateToISO(r[0]) === date);

  renderAll();
}

function clearDateFilter() {
  document.getElementById("filterDate").value = "";
  applyMonthFilter();
}

// =====================
// SORTING
// =====================
function sortByColumn(index) {
  sortAsc = sortColumn === index ? !sortAsc : true;
  sortColumn = index;

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
  const res = await fetch(`${API_BASE_URL}/diet-log`);
  const rows = await res.json();

  currentRows = rows.map(normalizeRow);
  populateMonthSelect(currentRows);
  applyMonthFilter();
}

// =====================
// DAILY TOTALS
// =====================
function renderDailyTotals(rows) {
  const box = document.getElementById("dailyTotals");
  if (!rows.length) {
    box.style.display = "none";
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

  box.style.display = "block";
  box.innerHTML = `
    <h3>📊 Daily Totals</h3>
    <p>Calories: <strong>${c}</strong> kcal</p>
    <p>Protein: <strong>${p}</strong> g</p>
    <p>Carbs: <strong>${cb}</strong> g</p>
    <p>Fats: <strong>${f}</strong> g</p>
  `;
}

// =====================
// WEEKLY BREAKDOWN
// =====================
function renderWeeklyBreakdown(rows) {
  const container = document.getElementById("weeklyBreakdown");
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = "<p>No data</p>";
    return;
  }

  const weeks = {};

  rows.forEach((r) => {
    const key = getWeekKey(r[0]);
    if (!key) return;

    if (!weeks[key]) {
      weeks[key] = { calories: 0, protein: 0, days: new Set() };
    }

    weeks[key].calories += Number(r[14]) || 0;
    weeks[key].protein += Number(r[15]) || 0;
    weeks[key].days.add(r[0]);
  });

  container.innerHTML = "";

  Object.keys(weeks)
    .sort()
    .forEach((wk) => {
      const w = weeks[wk];
      const days = w.days.size || 1;

      const calTarget = TARGETS.caloriesPerDay * days;
      const proTarget = TARGETS.proteinPerDay * days;

      const calPct = Math.min(100, Math.round((w.calories / calTarget) * 100));
      const proPct = Math.min(100, Math.round((w.protein / proTarget) * 100));

      container.innerHTML += `
        <div class="card">
          <h4>${formatWeekLabel(wk)}</h4>

          <p>Calories: ${w.calories} / ${calTarget}</p>
          <div class="progress-bg">
            <div class="progress-bar" style="width:${calPct}%">${calPct}%</div>
          </div>

          <p style="margin-top:8px">Protein: ${w.protein} / ${proTarget}</p>
          <div class="progress-bg">
            <div class="progress-bar protein" style="width:${proPct}%">${proPct}%</div>
          </div>
        </div>
      `;
    });
}

// =====================
// TABLE (WITH ACTIONS)
// =====================
function renderTable(rows) {
  const headers = [
    { label: "Date", index: 0 },
    { label: "Day", index: 1 },
    { label: "Meal", index: 3 },
    { label: "Calories", index: 14 },
    { label: "Protein", index: 15 },
    { label: "Actions", index: -1 },
  ];

  let html = "<tr>";
  headers.forEach((h) => {
    if (h.index >= 0) {
      const arrow = sortColumn === h.index ? (sortAsc ? " ▲" : " ▼") : "";
      html += `<th onclick="sortByColumn(${h.index})">${h.label}${arrow}</th>`;
    } else {
      html += `<th>${h.label}</th>`;
    }
  });
  html += "</tr>";

  rows.forEach((r) => {
    const sheetRow = currentRows.indexOf(r) + 2;

    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[3]}</td>
        <td>${r[14]}</td>
        <td>${r[15]}</td>
        <td>
          <button onclick="editMeal(${sheetRow})">✏️</button>
          <button onclick="deleteMeal(${sheetRow})">🗑️</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("dietTable").innerHTML = html;
}

// =====================
// EDIT / DELETE
// =====================
async function deleteMeal(row) {
  if (!confirm("Delete this meal?")) return;

  await fetch(`${API_BASE_URL}/diet-log/${row}`, { method: "DELETE" });
  loadMeals();
}

function editMeal(row) {
  const r = currentRows[row - 2];
  if (!r) return;

  document.getElementById("date").value = normalizeDateToISO(r[0]);
  document.getElementById("mealType").value = r[3];
  document.getElementById("context").value = r[4];
  document.getElementById("proteinSource").value = r[5];
  document.getElementById("veggies").value = r[6];
  document.getElementById("carbsFood").value = r[7];
  document.getElementById("fatsFood").value = r[8];
  document.getElementById("portionNotes").value = r[9];
  document.getElementById("hunger").value = r[10];
  document.getElementById("fullness").value = r[11];
  document.getElementById("notes").value = r[13];
  document.getElementById("calories").value = r[14];
  document.getElementById("protein").value = r[15];
  document.getElementById("carbs").value = r[16];
  document.getElementById("fats").value = r[17];

  document.getElementById("dietForm").dataset.editRow = row;
}

// =====================
// FORM SUBMIT
// =====================
document.getElementById("dietForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const editRow = form.dataset.editRow;

  const payload = {
    date: document.getElementById("date").value,
    mealType: document.getElementById("mealType").value,
    context: document.getElementById("context").value,
    proteinSource: document.getElementById("proteinSource").value,
    veggies: document.getElementById("veggies").value,
    carbsFood: document.getElementById("carbsFood").value,
    fatsFood: document.getElementById("fatsFood").value,
    portionNotes: document.getElementById("portionNotes").value,
    hunger: document.getElementById("hunger").value,
    fullness: document.getElementById("fullness").value,
    notes: document.getElementById("notes").value,
    calories: document.getElementById("calories").value,
    protein: document.getElementById("protein").value,
    carbs: document.getElementById("carbs").value,
    fats: document.getElementById("fats").value,
  };

  const url = editRow
    ? `${API_BASE_URL}/diet-log/${editRow}`
    : `${API_BASE_URL}/diet-log`;

  const method = editRow ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  delete form.dataset.editRow;
  form.reset();
  loadMeals();
});

// =====================
// RENDER ALL
// =====================
function renderAll() {
  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
  renderWeeklyBreakdown(filteredRows);
}

// =====================
// INIT
// =====================
loadMeals();
