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
let currentRows = [];
let filteredRows = [];
let editRowNumber = null;

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
  const [d, m, y] = dateStr.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function getMonthKey(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
// MONTH FILTER
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

  select.value = months[0];
}

function applyMonthFilter() {
  const key = monthSelect.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r[0]) === key);
  renderAll();
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
// WEEKLY + TODAY SUMMARY
// (Mon–Fri only, Sat/Sun = rest)
// =====================
function renderWeeklyBreakdown(rows) {
  const box = document.getElementById("weeklyBreakdown");
  box.innerHTML = "";

  const todayISO = new Date().toISOString().slice(0, 10);

  let todayCalories = 0;
  let todayProtein = 0;

  const weekdays = {};

  rows.forEach((r) => {
    const dateISO = normalizeDateToISO(r[0]);
    if (!dateISO) return;

    const d = new Date(dateISO);
    const day = d.getDay(); // 0 Sun, 6 Sat

    const calories = Number(r[14]) || 0;
    const protein = Number(r[15]) || 0;

    // ---- TODAY ----
    if (dateISO === todayISO) {
      todayCalories += calories;
      todayProtein += protein;
    }

    // ---- MON–FRI ONLY ----
    if (day === 0 || day === 6) return;

    if (!weekdays[dateISO]) {
      weekdays[dateISO] = { calories: 0, protein: 0 };
    }

    weekdays[dateISO].calories += calories;
    weekdays[dateISO].protein += protein;
  });

  const days = Object.keys(weekdays);
  const activeDays = days.length || 1;

  let weekCalories = 0;
  let weekProtein = 0;
  let proteinHitDays = 0;

  days.forEach((d) => {
    weekCalories += weekdays[d].calories;
    weekProtein += weekdays[d].protein;
    if (weekdays[d].protein >= TARGETS.proteinPerDay) {
      proteinHitDays++;
    }
  });

  const calorieTarget = TARGETS.caloriesPerDay * activeDays;
  const proteinTarget = TARGETS.proteinPerDay * activeDays;

  box.innerHTML = `
    <div class="card">
      <h3>📍 Today</h3>
      <p>Calories: <strong>${todayCalories}</strong></p>
      <p>
        Protein: <strong>${todayProtein}</strong>
        ${
          todayProtein >= TARGETS.proteinPerDay
            ? "✅ Target Hit"
            : "⚠️ Below Target"
        }
      </p>

      <hr />

      <h3>📅 This Week (Mon–Fri)</h3>
      <p><strong>Active Days:</strong> ${activeDays}</p>

      <p><strong>Calories</strong></p>
      <div class="progress-bg">
        <div class="progress-bar" style="width:${Math.min(
          (weekCalories / calorieTarget) * 100,
          100
        )}%">
          ${weekCalories} / ${calorieTarget}
        </div>
      </div>

      <p><strong>Protein</strong></p>
      <div class="progress-bg">
        <div class="progress-bar protein" style="width:${Math.min(
          (weekProtein / proteinTarget) * 100,
          100
        )}%">
          ${weekProtein} / ${proteinTarget}
        </div>
      </div>

      <p><strong>🎯 Protein Consistency</strong></p>
      <p>${proteinHitDays} / ${activeDays} weekdays hit target</p>
    </div>
  `;
}

// =====================
// TABLE
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
  editRowNumber = null;
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
