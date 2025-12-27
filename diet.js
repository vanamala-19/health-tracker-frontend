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

function isCurrentMonth(dateStr) {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return false;

  const d = new Date(iso);
  const now = new Date();

  return (
    d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
}

function normalizeDateToISO(dateStr) {
  if (!dateStr) return "";

  // Already ISO (YYYY-MM-DD)
  if (dateStr.includes("-")) return dateStr;

  // Sheet format (DD/MM/YYYY)
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";

    const [day, month, year] = parts;
    if (!day || !month || !year) return "";

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

// =====================
// DATE FILTER
// =====================
function applyDateFilter() {
  const selectedDate = document.getElementById("filterDate").value;
  if (!selectedDate) return;

  filteredRows = currentRows.filter((r) => {
    const rowDateISO = normalizeDateToISO(r[0]);
    return rowDateISO === selectedDate;
  });

  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
}

function clearDateFilter() {
  document.getElementById("filterDate").value = "";

  filteredRows = currentRows.filter((r) => isCurrentMonth(r[0]));

  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
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
// FORM SUBMIT
// =====================
document.getElementById("dietForm").addEventListener("submit", async (e) => {
  e.preventDefault();

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

  try {
    const res = await fetch(`${API_BASE_URL}/diet-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) return alert("❌ Failed to save meal");

    document.getElementById("dietForm").reset();
    loadMeals();
  } catch {
    alert("❌ Network error");
  }
});

// =====================
// LOAD MEALS
// =====================
async function loadMeals() {
  try {
    const res = await fetch(`${API_BASE_URL}/diet-log`);
    const rows = await res.json();

    currentRows = rows.map(normalizeRow);

    // 🔥 DEFAULT: show only current month
    filteredRows = currentRows.filter((r) => isCurrentMonth(r[0]));

    renderTable(filteredRows);
    renderDailyTotals(filteredRows);
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

// =====================
// INIT
// =====================
loadMeals();
