// =====================
// CONFIG
// =====================
// API_BASE_URL is loaded from api-config.js

// =====================
// USER TARGETS
// =====================
const TARGETS = {
  caloriesPerDay: 1800,
  proteinPerDay: 120,
};

// food database state

let foodDB = [];
let mealItems = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderFoodOptions(query = "") {
  const select = document.getElementById("foodSelect");
  if (!select) return;

  const q = query.trim().toLowerCase();
  const options = foodDB
    .map((f, i) => ({ name: f.name, index: i }))
    .filter((f) => (q ? f.name.toLowerCase().includes(q) : true));

  if (!options.length) {
    select.innerHTML = `<option value="">No matches</option>`;
    return;
  }

  select.innerHTML = options
    .map((f) => `<option value="${f.index}">${escapeHtml(f.name)}</option>`)
    .join("");
}

async function loadFoodDB() {
  try {
    const res = await fetch(`${API_BASE_URL}/food-database`);
    foodDB = await res.json();

    const searchInput = document.getElementById("foodSearch");
    renderFoodOptions(searchInput ? searchInput.value : "");
  } catch (err) {
    console.error("Food DB load failed:", err);
  }
}

loadFoodDB();

const foodSearchInput = document.getElementById("foodSearch");
if (foodSearchInput) {
  foodSearchInput.addEventListener("input", (e) => {
    renderFoodOptions(e.target.value);
  });
}

function addFoodItem() {
  const idxValue = document.getElementById("foodSelect").value;
  const idx = Number(idxValue);
  const grams = Number(document.getElementById("foodQty").value);

  if (!idxValue || Number.isNaN(idx)) return alert("Select a food");
  if (!grams) return alert("Enter grams");

  const food = foodDB[idx];

  mealItems.push({
    name: food.name,
    grams,
    calories: (food.calories * grams) / food.unit,
    protein: (food.protein * grams) / food.unit,
    carbs: (food.carbs * grams) / food.unit,
    fat: (food.fat * grams) / food.unit,
  });

  document.getElementById("foodQty").value = "";
  renderMealItems();
}

function removeFoodItem(idx) {
  mealItems.splice(idx, 1);
  renderMealItems();
}

function renderMealItems() {
  const table = document.getElementById("mealItemsTable");

  let html = `
    <tr>
      <th>Food</th>
      <th>Grams</th>
      <th>Calories</th>
      <th>Protein</th>
      <th></th>
    </tr>
  `;

  let totalC = 0,
    totalP = 0,
    totalCB = 0,
    totalF = 0;

  mealItems.forEach((i, idx) => {
    totalC += i.calories;
    totalP += i.protein;
    totalCB += i.carbs;
    totalF += i.fat;

    html += `
      <tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.grams)}</td>
        <td>${escapeHtml(i.calories.toFixed(0))}</td>
        <td>${escapeHtml(i.protein.toFixed(1))}</td>
        <td><button type="button" onclick="removeFoodItem(${idx})">❌</button></td>
      </tr>
    `;
  });

  table.innerHTML = html;

  // 🔥 IMPORTANT: Auto-fill existing macro inputs
  document.getElementById("calories").value = totalC.toFixed(0);
  document.getElementById("protein").value = totalP.toFixed(1);
  document.getElementById("carbs").value = totalCB.toFixed(1);
  document.getElementById("fats").value = totalF.toFixed(1);
}

// ✅ SMOOTH SCROLL INTO VIEW
function scrollToDietForm() {
  if (!dietFormSection) return;

  dietFormSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// =====================
// STATE
// =====================
let currentRows = [];
let filteredRows = [];
let editRowNumber = null;

// =====================
// ADD DIET FORM TOGGLE
// =====================
const dietFormSection = document.getElementById("dietFormSection");
const toggleDietFormBtn = document.getElementById("toggleDietFormBtn");

if (toggleDietFormBtn) {
  toggleDietFormBtn.addEventListener("click", () => {
    const hidden = dietFormSection.style.display === "none";
    dietFormSection.style.display = hidden ? "block" : "none";
    toggleDietFormBtn.innerHTML = hidden
      ? '<i class="fas fa-times"></i> Close'
      : '<i class="fas fa-plus"></i> Add Diet';
  });
}

// =====================
// HELPERS (STABLE)
// =====================
function normalizeRow(row, length = 18) {
  const out = [...row];
  while (out.length < length) out.push(0);
  return out;
}

function getMonthKey(dateISO) {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Week helpers (ISO safe)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(start) {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

// =====================
// LOAD MEALS (KEY FIX)
// =====================
async function loadMeals() {
  try {
    LoadingState.showOverlay();
    const rows = await offlineAwareFetch(`${API_BASE_URL}/diet-log`);

    // 🔥 Normalize dates ONCE here
    currentRows = rows.map((r) => {
      const values = normalizeRow(Array.isArray(r) ? r : r.values || []);
      values[0] = normalizeSheetDateISO(values[0]);
      return {
        row: Array.isArray(r) ? null : (r.row ?? null),
        values,
      };
    });

    populateMonthSelect(currentRows);
    applyMonthFilter();
    renderWeeklyBreakdown(); // always from full data
  } catch (error) {
    console.error("Failed to load meals:", error);
  } finally {
    LoadingState.hideOverlay();
  }
}

// =====================
// MONTH FILTER
// =====================
function populateMonthSelect(rows) {
  const select = document.getElementById("monthSelect");

  const months = [
    ...new Set(rows.map((r) => getMonthKey(r.values[0])).filter(Boolean)),
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

  if (months.length) select.value = months[0];
}

function applyMonthFilter() {
  const key = monthSelect.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r.values[0]) === key);
  renderAll();
}

// =====================
// EXPORT DIET LOG
// =====================
function exportDietLog() {
  if (!currentRows || currentRows.length === 0) {
    showErrorMessage("❌ No diet data to export");
    return;
  }

  const exportBtn = document.getElementById("exportDietBtn");
  if (exportBtn) {
    LoadingState.disableButton(exportBtn);
  }

  try {
    // Export all data (not just filtered)
    CSVExport.exportDietLog(
      currentRows.map((r) => r.values),
      "diet-log",
    );
  } catch (error) {
    console.error("Failed to export diet log:", error);
    showErrorMessage("❌ Failed to export diet log");
  } finally {
    if (exportBtn) {
      LoadingState.enableButton(exportBtn);
    }
  }
}

// =====================
// DATE FILTER
// =====================
function applyDateFilter() {
  const input = document.getElementById("filterDate");
  if (!input || !input.value) return;

  filteredRows = currentRows.filter((r) => r.values[0] === input.value);
  renderAll();
}

function clearDateFilter() {
  const input = document.getElementById("filterDate");
  if (input) input.value = "";
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
  // track unique dates for 'n'
  const uniqueDates = new Set();

  rows.forEach((r) => {
    const v = r.values;
    c += Number(v[13]) || 0;
    p += Number(v[14]) || 0;
    cb += Number(v[15]) || 0;
    f += Number(v[16]) || 0;
    if (v[0]) uniqueDates.add(v[0]);
  });
  const n = uniqueDates.size || 1;

  dailyTotals.style.display = "block";
  dailyTotals.innerHTML = `
    <h3>📊 Daily Average Totals</h3>
    <p>Calories: <strong>${(c / n).toFixed(2)}</strong></p>
    <p>Protein: <strong>${(p / n).toFixed(2)}</strong></p>
    <p>Carbs: <strong>${(cb / n).toFixed(2)}</strong></p>
    <p>Fats: <strong>${(f / n).toFixed(2)}</strong></p>
  `;
}

// =====================
// WEEKLY BREAKDOWN (FINAL FIX)
// =====================
function renderWeeklyBreakdown() {
  const box = document.getElementById("weeklyBreakdown");
  box.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = getStartOfWeek(today);
  const weekEnd = getEndOfWeek(weekStart);

  let todayCalories = 0;
  let todayProtein = 0;

  const weekdays = {};

  currentRows.forEach((r) => {
    const v = r.values;
    const dateISO = v[0];
    if (!dateISO) return;

    const rowDate = new Date(dateISO);
    rowDate.setHours(0, 0, 0, 0);

    if (rowDate < weekStart || rowDate > weekEnd) return;

    const day = rowDate.getDay();
    const calories = Number(v[13]) || 0;
    const protein = Number(v[14]) || 0;

    // ✅ TODAY FIX
    if (rowDate.getTime() === today.getTime()) {
      todayCalories += calories;
      todayProtein += protein;
    }

    // Mon–Fri only
    if (day === 0 || day === 6) return;

    const key = rowDate.toISOString().slice(0, 10);
    if (!weekdays[key]) weekdays[key] = { calories: 0, protein: 0 };

    weekdays[key].calories += calories;
    weekdays[key].protein += protein;
  });

  const days = Object.keys(weekdays);
  const activeDays = days.length || 1;

  let weekCalories = 0;
  let weekProtein = 0;
  let proteinHitDays = 0;

  days.forEach((d) => {
    weekCalories += weekdays[d].calories;
    weekProtein += weekdays[d].protein;
    if (weekdays[d].protein >= TARGETS.proteinPerDay) proteinHitDays++;
  });

  box.innerHTML = `
    <div class="card">
      <h3>📍 Today</h3>
      <p>Calories: <strong>${todayCalories}</strong></p>
      <p>Protein: <strong>${todayProtein}</strong></p>

      <hr />

      <h3>📅 This Week (Mon–Sun)</h3>
      <p><strong>Active Days:</strong> ${activeDays}</p>

      <p><strong>Calories</strong></p>
      <div class="progress-bg">
        <div class="progress-bar" style="width:${Math.min(
          (weekCalories / (TARGETS.caloriesPerDay * activeDays)) * 100,
          100,
        )}%">
          ${weekCalories}
        </div>
      </div>

      <p><strong>Protein</strong></p>
      <div class="progress-bg">
        <div class="progress-bar protein" style="width:${Math.min(
          (weekProtein / (TARGETS.proteinPerDay * activeDays)) * 100,
          100,
        )}%">
          ${weekProtein}
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
    const v = r.values;
    const rowNum = r.row ?? currentRows.indexOf(r) + 2;
    html += `
      <tr>
        <td data-label="Date">${escapeHtml(v[0])}</td>
        <td data-label="Day">${escapeHtml(v[1])}</td>
        <td data-label="Meal">${escapeHtml(v[3])}</td>
        <td data-label="Calories">${escapeHtml(v[13])}</td>
        <td data-label="Protein">${escapeHtml(v[14])}</td>
        <td data-label="Actions">
          <button onclick="editMeal(${rowNum})"><i class="fas fa-edit"></i></button>
          <button onclick="duplicateMeal(${rowNum})"><i class="fas fa-clone"></i></button>
          <button onclick="deleteMeal(${rowNum})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  dietTable.innerHTML = html;
}

// =====================
// EDIT / DELETE
// =====================
function fillFormFromRow(r) {
  dietFormSection.style.display = "block";
  toggleDietFormBtn.innerHTML = '<i class="fas fa-times"></i> Close';

  date.value = r[0];

  time.value = normalizeSheetTime(r[2]);
  mealType.value = r[3];
  context.value = r[4];
  proteinSource.value = r[5];
  veggies.value = r[6];
  carbsFood.value = r[7];
  fatsFood.value = r[8];
  // portionNotes.value = r[9]  "";
  hunger.value = r[10];
  fullness.value = r[11];

  // ✅ Corrected indexes
  notes.value = r[12];
  calories.value = r[13];
  protein.value = r[14];
  carbs.value = r[15];
  fats.value = r[16];

  // ✅ Rebuild meal items from JSON
  try {
    mealItems = JSON.parse(r[17] || "[]");
  } catch {
    mealItems = [];
  }

  renderMealItems();

  scrollToDietForm();
}

function getEntryByRow(row) {
  return currentRows.find((r) => r.row === row) || currentRows[row - 2];
}

function editMeal(row) {
  editRowNumber = row;
  const entry = getEntryByRow(row);
  if (!entry) return;
  fillFormFromRow(entry.values);
}

function duplicateMeal(row) {
  editRowNumber = null;
  const entry = getEntryByRow(row);
  if (!entry) return;
  fillFormFromRow(entry.values);
}

async function deleteMeal(row) {
  if (!confirm("Delete this meal?")) return;
  try {
    LoadingState.disableAllButtons();
    await safeApiFetch(`${API_BASE_URL}/diet-log/${row}`, { method: "DELETE" });
    showSuccessMessage("✅ Meal deleted successfully");
    loadMeals();
  } catch (error) {
    console.error("Failed to delete meal:", error);
  } finally {
    LoadingState.enableAllButtons();
  }
}

// =====================
// FORM SUBMIT
// =====================
dietForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validate form before submission
  const formData = {
    date: date.value,
    time: time.value,
    mealType: mealType.value,
    context: context.value,
    proteinSource: proteinSource.value,
    veggies: veggies.value,
    carbsFood: carbsFood.value,
    fatsFood: fatsFood.value,
    portionNotes: "",
    hunger: hunger.value,
    fullness: fullness.value,
    notes: notes.value,
    calories: calories.value,
    protein: protein.value,
    carbs: carbs.value,
    fats: fats.value,
  };

  if (!validateDietForm(formData)) {
    return;
  }

  const payload = {
    date: date.value,
    time: time.value,
    mealType: mealType.value,
    context: context.value,
    proteinSource: proteinSource.value,
    veggies: veggies.value,
    carbsFood: carbsFood.value,
    fatsFood: fatsFood.value,
    portionNotes: "",
    hunger: hunger.value,
    fullness: fullness.value,
    notes: notes.value,
    calories: calories.value,
    protein: protein.value,
    carbs: carbs.value,
    fats: fats.value,
    mealItems: mealItems, // include meal items in payload
  };

  try {
    const url = editRowNumber
      ? `${API_BASE_URL}/diet-log/${editRowNumber}`
      : `${API_BASE_URL}/diet-log`;

    await safeApiFetch(url, {
      method: editRowNumber ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showSuccessMessage(
      `✅ Meal ${editRowNumber ? "updated" : "added"} successfully`,
    );

    editRowNumber = null;
    dietForm.reset();
    mealItems = [];
    renderMealItems();
    dietFormSection.style.display = "none";
    toggleDietFormBtn.innerHTML = '<i class="fas fa-plus"></i> Add Diet';

    loadMeals();
  } catch (error) {
    console.error("Failed to save meal:", error);
  }
});

// =====================
// RENDER ALL
// =====================
function renderAll() {
  renderTable(filteredRows);
  renderDailyTotals(filteredRows);
}

// =====================
// INIT
// =====================
loadMeals();
