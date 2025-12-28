// =====================
// CONFIG
// =====================
const MODE = "Prod";

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
let editRowNumber = null; // 🔥 null = new meal (used for duplicate)

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
  if (dateStr.includes("-")) return dateStr;
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
  const key = monthSelect.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r[0]) === key);
  filterDate.value = "";
  renderAll();
}

// =====================
// DATE FILTER
// =====================
function applyDateFilter() {
  if (!filterDate.value) return;
  filteredRows = currentRows.filter(
    (r) => normalizeDateToISO(r[0]) === filterDate.value
  );
  renderAll();
}

function clearDateFilter() {
  filterDate.value = "";
  applyMonthFilter();
}

// =====================
// SORT
// =====================
function sortByColumn(index) {
  sortAsc = sortColumn === index ? !sortAsc : true;
  sortColumn = index;

  filteredRows.sort((a, b) => {
    const x = a[index];
    const y = b[index];
    if (!isNaN(x) && !isNaN(y)) return sortAsc ? x - y : y - x;
    return sortAsc
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  renderTable(filteredRows);
}

// =====================
// LOAD
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
  if (!rows.length) {
    dailyTotals.style.display = "none";
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

  dailyTotals.style.display = "block";
  dailyTotals.innerHTML = `
    <h3>📊 Daily Totals</h3>
    <p>Calories: <strong>${c}</strong></p>
    <p>Protein: <strong>${p}</strong></p>
    <p>Carbs: <strong>${cb}</strong></p>
    <p>Fats: <strong>${f}</strong></p>
  `;
}

// =====================
// WEEKLY
// =====================
function renderWeeklyBreakdown(rows) {
  weeklyBreakdown.innerHTML = "";
  const weeks = {};

  rows.forEach((r) => {
    const key = getWeekKey(r[0]);
    if (!key) return;
    if (!weeks[key]) weeks[key] = { c: 0, p: 0, d: new Set() };
    weeks[key].c += Number(r[14]) || 0;
    weeks[key].p += Number(r[15]) || 0;
    weeks[key].d.add(r[0]);
  });

  Object.keys(weeks).forEach((k) => {
    const w = weeks[k];
    const days = w.d.size || 1;
    weeklyBreakdown.innerHTML += `
      <div class="card">
        <h4>${formatWeekLabel(k)}</h4>
        <p>Calories: ${w.c}/${TARGETS.caloriesPerDay * days}</p>
        <p>Protein: ${w.p}/${TARGETS.proteinPerDay * days}</p>
      </div>
    `;
  });
}

// =====================
// TABLE (WITH DUPLICATE)
// =====================
function renderTable(rows) {
  let html = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Meal</th>
      <th>Calories</th>
      <th>Protein</th>
      <th>Actions</th>
    </tr>
  `;

  rows.forEach((r) => {
    const rowNum = currentRows.indexOf(r) + 2;

    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[3]}</td>
        <td>${r[14]}</td>
        <td>${r[15]}</td>
        <td>
          <button onclick="editMeal(${rowNum})">✏️</button>
          <button onclick="duplicateMeal(${rowNum})">🧬</button>
          <button onclick="deleteMeal(${rowNum})">🗑️</button>
        </td>
      </tr>
    `;
  });

  dietTable.innerHTML = html;
}

// =====================
// EDIT / DUPLICATE / DELETE
// =====================
function fillFormFromRow(r) {
  date.value = normalizeDateToISO(r[0]);
  mealType.value = r[3];
  context.value = r[4];
  proteinSource.value = r[5];
  veggies.value = r[6];
  carbsFood.value = r[7];
  fatsFood.value = r[8];
  portionNotes.value = r[9];
  hunger.value = r[10];
  fullness.value = r[11];
  notes.value = r[13];
  calories.value = r[14];
  protein.value = r[15];
  carbs.value = r[16];
  fats.value = r[17];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function editMeal(row) {
  editRowNumber = row;
  fillFormFromRow(currentRows[row - 2]);
}

function duplicateMeal(row) {
  editRowNumber = null; // 🔥 force new save
  fillFormFromRow(currentRows[row - 2]);
}

async function deleteMeal(row) {
  if (!confirm("Delete this meal?")) return;
  await fetch(`${API_BASE_URL}/diet-log/${row}`, { method: "DELETE" });
  loadMeals();
}

// =====================
// FORM SUBMIT
// =====================
dietForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    date: date.value,
    mealType: mealType.value,
    context: context.value,
    proteinSource: proteinSource.value,
    veggies: veggies.value,
    carbsFood: carbsFood.value,
    fatsFood: fatsFood.value,
    portionNotes: portionNotes.value,
    hunger: hunger.value,
    fullness: fullness.value,
    notes: notes.value,
    calories: calories.value,
    protein: protein.value,
    carbs: carbs.value,
    fats: fats.value,
  };

  const url = editRowNumber
    ? `${API_BASE_URL}/diet-log/${editRowNumber}`
    : `${API_BASE_URL}/diet-log`;

  const method = editRowNumber ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  editRowNumber = null;
  dietForm.reset();
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
