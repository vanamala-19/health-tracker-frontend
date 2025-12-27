// =====================
// CONFIG
// =====================
const MODE = "Prod"; // change to "prod" when deploying
let sortColumn = null;
let sortAsc = true;
let currentRows = [];

const API_BASE_URL =
  MODE === "local"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

function normalizeRow(row, length = 18) {
  const normalized = [...row];
  while (normalized.length < length) {
    normalized.push(0);
  }
  return normalized;
}

function sortByColumn(index) {
  if (sortColumn === index) {
    sortAsc = !sortAsc; // toggle direction
  } else {
    sortColumn = index;
    sortAsc = true;
  }

  currentRows.sort((a, b) => {
    const x = a[index];
    const y = b[index];

    // numeric sort
    if (!isNaN(x) && !isNaN(y)) {
      return sortAsc ? x - y : y - x;
    }

    // string sort
    return sortAsc
      ? String(x).localeCompare(String(y))
      : String(y).localeCompare(String(x));
  });

  renderTable(currentRows);
}

/* ---------------------------
   SUBMIT DIET FORM
---------------------------- */
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

    if (!data.success) {
      alert("❌ Failed to save meal");
      return;
    }

    document.getElementById("dietForm").reset();
    loadMeals();
  } catch (err) {
    console.error(err);
    alert("❌ Network error while saving meal");
  }
});

/* ---------------------------
   LOAD MEALS
---------------------------- */
async function loadMeals() {
  try {
    const res = await fetch(`${API_BASE_URL}/diet-log`);
    const rows = await res.json();

    currentRows = rows.map((r) => normalizeRow(r));
    renderTable(currentRows);
  } catch (err) {
    console.error(err);
  }
}

/* ---------------------------
   RENDER TABLE
---------------------------- */
function renderTable(rows) {
  const headers = [
    { label: "Date", index: 0 },
    { label: "Day", index: 1 },
    { label: "Meal", index: 3 },
    { label: "Protein Source", index: 5 },
    { label: "Calories", index: 14 },
    { label: "Protein (g)", index: 15 },
    { label: "Carbs (g)", index: 16 },
    { label: "Fats (g)", index: 17 },
  ];

  let html = "<tr>";

  headers.forEach((h) => {
    const arrow = sortColumn === h.index ? (sortAsc ? " ▲" : " ▼") : "";

    html += `
      <th onclick="sortByColumn(${h.index})" style="cursor:pointer">
        ${h.label}${arrow}
      </th>
    `;
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

/* ---------------------------
   INITIAL LOAD
---------------------------- */
loadMeals();
