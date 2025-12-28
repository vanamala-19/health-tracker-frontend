const API = "https://health-tracker-backend-z131.onrender.com";

let inventory = [];
let sortColumn = null;
let sortAsc = true;

const num = (v) => Number(v) || 0;

/* ---------- METRICS ---------- */
function fiberPer100Cal(i) {
  return i.calories ? (i.fiber * 100) / i.calories : 0;
}

function proteinPer100Cal(i) {
  return i.calories ? (i.protein * 100) / i.calories : 0;
}

function satietyScore(i) {
  return i.calories
    ? (i.protein * 4 + i.fiber * 3 + i.fats * 2 + i.carbs) / i.calories
    : 0;
}

/* ---------- LABELS ---------- */
function getLabels(i) {
  const labels = [];
  if (fiberPer100Cal(i) >= 5) labels.push("🥦 High Fiber");
  if (proteinPer100Cal(i) >= 8) labels.push("💪 Protein Dense");
  if (i.calories <= 120) labels.push("🔥 Low Cal");
  if (i.calories >= 250) labels.push("⚠️ High Cal");
  if (satietyScore(i) >= 0.4) labels.push("🍽️ High Satiety");
  return labels;
}

/* ---------- LOAD ---------- */
async function loadInventory() {
  const res = await fetch(`${API}/inventory`);
  const rows = await res.json();

  inventory = rows.map((r) => ({
    name: r[0],
    category: r[1],
    calories: num(r[4]),
    protein: num(r[5]),
    carbs: num(r[6]),
    fats: num(r[7]),
    fiber: num(r[8]),
  }));

  renderTable();
}

loadInventory();

/* ---------- SORT ---------- */
function sortBy(column) {
  if (sortColumn === column) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = column;
    sortAsc = true;
  }
  renderTable();
}

/* ---------- RENDER ---------- */
function renderTable() {
  const filter = document.getElementById("smartFilter").value;

  let data = inventory.filter((i) => {
    if (filter === "highFiber") return fiberPer100Cal(i) >= 5;
    if (filter === "proteinDense") return proteinPer100Cal(i) >= 8;
    if (filter === "lowCal") return i.calories <= 120;
    if (filter === "highCal") return i.calories >= 250;
    if (filter === "highSatiety") return satietyScore(i) >= 0.4;
    return true;
  });

  if (sortColumn) {
    data.sort((a, b) => {
      let x, y;

      switch (sortColumn) {
        case "calories":
          x = a.calories;
          y = b.calories;
          break;
        case "protein":
          x = a.protein;
          y = b.protein;
          break;
        case "fiber":
          x = a.fiber;
          y = b.fiber;
          break;
        case "fiberDensity":
          x = fiberPer100Cal(a);
          y = fiberPer100Cal(b);
          break;
        case "satiety":
          x = satietyScore(a);
          y = satietyScore(b);
          break;
        default:
          x = a.name;
          y = b.name;
      }

      if (typeof x === "string") {
        return sortAsc ? x.localeCompare(y) : y.localeCompare(x);
      }
      return sortAsc ? x - y : y - x;
    });
  }

  const arrow = (c) => (sortColumn === c ? (sortAsc ? " ▲" : " ▼") : "");

  let html = `
    <tr>
      <th onclick="sortBy('name')">Item${arrow("name")}</th>
      <th onclick="sortBy('calories')">Calories${arrow("calories")}</th>
      <th onclick="sortBy('protein')">Protein${arrow("protein")}</th>
      <th onclick="sortBy('fiber')">Fiber${arrow("fiber")}</th>
      <th onclick="sortBy('fiberDensity')">Fiber / 100kcal${arrow(
        "fiberDensity"
      )}</th>
      <th onclick="sortBy('satiety')">Satiety${arrow("satiety")}</th>
      <th>Labels</th>
    </tr>
  `;

  data.forEach((i) => {
    const labels = getLabels(i)
      .map((l) => `<span class="badge">${l}</span>`)
      .join(" ");

    html += `
      <tr>
        <td>${i.name}</td>
        <td>${i.calories}</td>
        <td>${i.protein}</td>
        <td>${i.fiber}</td>
        <td>${fiberPer100Cal(i).toFixed(1)}</td>
        <td>${satietyScore(i).toFixed(2)}</td>
        <td>${labels}</td>
      </tr>
    `;
  });

  document.getElementById("inventoryTable").innerHTML = html;
}

document.getElementById("smartFilter").onchange = renderTable;
