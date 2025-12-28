const API = "https://health-tracker-backend-z131.onrender.com";

let inventory = [];
let mealItems = [];

/* ---------- HELPERS ---------- */
function num(v) {
  const n = String(v || "").match(/[\d.]+/);
  return n ? Number(n[0]) : 0;
}

/* ---------- LOAD INVENTORY ---------- */
async function loadInventory() {
  const res = await fetch(`${API}/inventory`);
  const rows = await res.json();

  inventory = rows.map((r, i) => ({
    row: i + 2,
    name: r[0],
    calories: num(r[4]),
    protein: num(r[5]),
    carbs: num(r[6]),
    fats: num(r[7]),
  }));

  const select = document.getElementById("itemSelect");
  select.innerHTML = inventory
    .map((i, idx) => `<option value="${idx}">${i.name}</option>`)
    .join("");
}

loadInventory();

/* ---------- ADD ITEM ---------- */
function addItem() {
  const idx = itemSelect.value;
  const qty = num(itemQty.value);

  if (!qty) return alert("Quantity required");

  const item = inventory[idx];

  mealItems.push({
    ...item,
    qty,
  });

  itemQty.value = "";
  renderMeal();
}

/* ---------- CALCULATE ---------- */
function renderMeal() {
  let html = `
    <tr>
      <th>Item</th><th>Qty</th><th>Calories</th><th>Protein</th><th></th>
    </tr>
  `;

  let c = 0,
    p = 0,
    cb = 0,
    f = 0;

  mealItems.forEach((i, idx) => {
    const cal = i.calories * i.qty;
    const prot = i.protein * i.qty;
    const carbs = i.carbs * i.qty;
    const fats = i.fats * i.qty;

    c += cal;
    p += prot;
    cb += carbs;
    f += fats;

    html += `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>${cal.toFixed(0)}</td>
        <td>${prot.toFixed(1)}</td>
        <td><button onclick="removeItem(${idx})">❌</button></td>
      </tr>
    `;
  });

  mealTable.innerHTML = html;

  totalCalories.innerText = c.toFixed(0);
  totalProtein.innerText = p.toFixed(1);
  totalCarbs.innerText = cb.toFixed(1);
  totalFats.innerText = f.toFixed(1);

  proteinDensity.innerText = c ? ((p * 100) / c).toFixed(1) : 0;
  satietyScore.innerText = c ? ((p * 4 + cb * 1 + f * 2) / c).toFixed(2) : 0;
}

/* ---------- REMOVE ---------- */
function removeItem(idx) {
  mealItems.splice(idx, 1);
  renderMeal();
}

/* ---------- SAVE ---------- */
async function saveMeal() {
  if (!mealItems.length) return alert("Meal is empty");

  const payload = {
    date: mealDate.value,
    mealType: mealType.value,
    context: "Meal Builder",
    proteinSource: mealItems.map((i) => i.name).join(", "),
    veggies: "",
    carbsFood: "",
    fatsFood: "",
    portionNotes: "Built from inventory",
    hunger: "",
    fullness: "",
    notes: "",
    calories: totalCalories.innerText,
    protein: totalProtein.innerText,
    carbs: totalCarbs.innerText,
    fats: totalFats.innerText,
  };

  await fetch(`${API}/diet-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  alert("Meal saved ✔");
  mealItems = [];
  renderMeal();
}
