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
let proteinSourceOptions = [];
let lowCalOptions = [];
let selectedFoodIndex = null;
let filteredFoodOptions = [];
let highlightedFoodOptionIndex = -1;

function getFoodSearchText(food) {
  return String(food?.name || "").toLowerCase();
}

function getFoodOptionLabel(food) {
  if (typeof buildFoodOptionLabel === "function") {
    return buildFoodOptionLabel(food);
  }
  return food?.name || "";
}

function setSelectedFoodIndex(index) {
  selectedFoodIndex =
    Number.isInteger(index) && index >= 0 && index < foodDB.length
      ? index
      : null;
  updateSelectedFoodCard();
}

function updateSelectedFoodCard() {
  const container = document.getElementById("selectedFoodCard");
  if (!container) return;
  const food = selectedFoodIndex === null ? null : foodDB[selectedFoodIndex];
  container.innerHTML =
    food && typeof buildSelectedFoodCardMarkup === "function"
      ? buildSelectedFoodCardMarkup(food)
      : "";
}

function hideFoodDropdown() {
  const dropdown = document.getElementById("foodSearchDropdown");
  if (!dropdown) return;
  dropdown.hidden = true;
  dropdown.innerHTML = "";
  filteredFoodOptions = [];
  highlightedFoodOptionIndex = -1;
}

function bindFoodDropdownEvents() {
  const dropdown = document.getElementById("foodSearchDropdown");
  if (!dropdown) return;

  dropdown.querySelectorAll("[data-food-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = Number(button.dataset.foodIndex);
      if (!Number.isNaN(nextIndex)) {
        commitFoodSelection(nextIndex);
      }
    });
  });
}

function renderFoodDropdown() {
  const dropdown = document.getElementById("foodSearchDropdown");
  if (!dropdown) return;

  if (!filteredFoodOptions.length) {
    dropdown.innerHTML = `<div class="food-search-empty">No matches</div>`;
    dropdown.hidden = false;
    return;
  }

  dropdown.innerHTML = filteredFoodOptions
    .map(
      (entry, idx) => `
        <button
          type="button"
          class="food-search-option${idx === highlightedFoodOptionIndex ? " is-active" : ""}"
          data-food-index="${entry.index}"
        >
          ${escapeHtml(entry.food.name || "")}
        </button>
      `,
    )
    .join("");
  dropdown.hidden = false;
  bindFoodDropdownEvents();
}

function moveFoodDropdownHighlight(direction) {
  if (!filteredFoodOptions.length) return;

  if (highlightedFoodOptionIndex === -1) {
    highlightedFoodOptionIndex = direction > 0 ? 0 : filteredFoodOptions.length - 1;
  } else {
    highlightedFoodOptionIndex =
      (highlightedFoodOptionIndex + direction + filteredFoodOptions.length) %
      filteredFoodOptions.length;
  }

  renderFoodDropdown();

  const dropdown = document.getElementById("foodSearchDropdown");
  const activeButton = dropdown?.querySelector(".food-search-option.is-active");
  activeButton?.scrollIntoView({ block: "nearest" });
}

function commitFoodSelection(index) {
  if (!Number.isInteger(index) || !foodDB[index]) {
    setSelectedFoodIndex(null);
    const searchInput = document.getElementById("foodSearch");
    if (searchInput) searchInput.value = "";
    hideFoodDropdown();
    return;
  }

  setSelectedFoodIndex(index);
  const searchInput = document.getElementById("foodSearch");
  if (searchInput) searchInput.value = "";
  hideFoodDropdown();
}

function setDatalistOptions(listId, values) {
  const datalist = document.getElementById(listId);
  if (!datalist) return;
  datalist.innerHTML = values
    .map((value) => `<option value="${escapeHtml(String(value))}"></option>`)
    .join("");
}

function uniqueTextValues(values) {
  return Array.from(
    new Set(
      (values || []).map((value) => String(value || "").trim()).filter(Boolean),
    ),
  );
}

function renderFoodOptions(query = "") {
  const q = query.trim().toLowerCase();
  if (!q) {
    hideFoodDropdown();
    return;
  }

  filteredFoodOptions = foodDB
    .map((food, index) => ({ food, index }))
    .filter((entry) => (q ? getFoodSearchText(entry.food).includes(q) : true));

  if (!filteredFoodOptions.length) {
    highlightedFoodOptionIndex = -1;
    renderFoodDropdown();
    return;
  }

  if (
    highlightedFoodOptionIndex < 0 ||
    highlightedFoodOptionIndex >= filteredFoodOptions.length
  ) {
    highlightedFoodOptionIndex = 0;
  }
  renderFoodDropdown();
}

async function loadFoodDB() {
  let lastError = null;

  try {
    foodDB = await offlineAwareFetch(`${API_BASE_URL}/food-database`);
    const searchInput = document.getElementById("foodSearch");
    renderFoodOptions(searchInput ? searchInput.value : "");
    return;
  } catch (err) {
    lastError = err;
  }

  setSelectedFoodIndex(null);
  hideFoodDropdown();
  console.error("Food DB load failed:", lastError);
}

function applyFoodDB(rows) {
  foodDB = rows || [];
  selectedFoodIndex = null;
  const searchInput = document.getElementById("foodSearch");
  renderFoodOptions(searchInput ? searchInput.value : "");
}

async function loadReferenceData() {
  try {
    const [proteinData, lowCalData] = await Promise.all([
      offlineAwareFetch(`${API_BASE_URL}/reference/protein-sources`),
      offlineAwareFetch(`${API_BASE_URL}/reference/calorie-free`),
    ]);

    proteinSourceOptions = uniqueTextValues(proteinData?.names);
    lowCalOptions = uniqueTextValues(lowCalData?.names);

    setDatalistOptions("proteinSourceList", proteinSourceOptions);
    setDatalistOptions("lowCalList", lowCalOptions);
  } catch (err) {
    console.error("Reference data load failed:", err);
  }
}

function applyReferenceData(proteinData, lowCalData) {
  proteinSourceOptions = uniqueTextValues(proteinData?.names);
  lowCalOptions = uniqueTextValues(lowCalData?.names);

  setDatalistOptions("proteinSourceList", proteinSourceOptions);
  setDatalistOptions("lowCalList", lowCalOptions);
}

async function initDietPage() {
  await loadDietBootstrap();
}

initDietPage();

const foodSearchInput = document.getElementById("foodSearch");
if (foodSearchInput) {
  foodSearchInput.addEventListener("input", (e) => {
    renderFoodOptions(e.target.value);
  });
  foodSearchInput.addEventListener("focus", (e) => {
    renderFoodOptions(e.target.value);
  });
  foodSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFoodDropdownHighlight(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFoodDropdownHighlight(-1);
      return;
    }
    if (e.key === "Enter") {
      const nextEntry =
        highlightedFoodOptionIndex >= 0
          ? filteredFoodOptions[highlightedFoodOptionIndex]
          : filteredFoodOptions[0];
      if (nextEntry && foodDB[nextEntry.index]) {
        e.preventDefault();
        commitFoodSelection(nextEntry.index);
      }
      return;
    }
    if (e.key === "Escape") {
      hideFoodDropdown();
    }
  });
  foodSearchInput.addEventListener("blur", () => {
    const shell = foodSearchInput.closest(".food-search-shell");
    setTimeout(() => {
      if (!shell || !shell.contains(document.activeElement)) {
        hideFoodDropdown();
      }
    }, 180);
  });
}

function addFoodItem() {
  const idx = Number(selectedFoodIndex);
  const grams = Number(document.getElementById("foodQty").value);

  if (selectedFoodIndex === null || Number.isNaN(idx) || !foodDB[idx]) {
    return notifyError("Select a food");
  }
  if (!grams) return notifyError("Enter grams");

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
        <td><button type="button" onclick="removeFoodItem(${idx})">Remove</button></td>
      </tr>
    `;
  });

  table.innerHTML = html;

  // IMPORTANT: Auto-fill existing macro inputs
  document.getElementById("calories").value = totalC.toFixed(0);
  document.getElementById("protein").value = totalP.toFixed(1);
  document.getElementById("carbs").value = totalCB.toFixed(1);
  document.getElementById("fats").value = totalF.toFixed(1);
}

// SMOOTH SCROLL INTO VIEW
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

    // Normalize dates once here
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
  const select = document.getElementById("monthSelect");
  if (!select) return;
  const key = select.value;
  filteredRows = currentRows.filter((r) => getMonthKey(r.values[0]) === key);
  renderAll();
}

function applyMealRows(rows) {
  currentRows = (rows || []).map((r) => {
    const values = normalizeRow(Array.isArray(r) ? r : r.values || []);
    values[0] = normalizeSheetDateISO(values[0]);
    return {
      row: Array.isArray(r) ? null : (r.row ?? null),
      values,
    };
  });

  populateMonthSelect(currentRows);
  applyMonthFilter();
  renderWeeklyBreakdown();
}

async function loadDietBootstrap() {
  try {
    LoadingState.showOverlay();
    const bundle = await offlineAwareFetch(
      `${API_BASE_URL}/diet-log/bootstrap`,
    );
    applyFoodDB(bundle?.foodDatabase || []);
    applyReferenceData(bundle?.proteinSources || {}, bundle?.lowCalorie || {});
    applyMealRows(bundle?.meals || []);
  } catch (error) {
    console.error("Failed to load diet bootstrap:", error);
    await Promise.all([loadFoodDB(), loadReferenceData(), loadMeals()]);
  } finally {
    LoadingState.hideOverlay();
  }
}

// =====================
// EXPORT DIET LOG
// =====================
function exportDietLog() {
  if (!currentRows || currentRows.length === 0) {
    showErrorMessage("No diet data to export");
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
    showErrorMessage("Failed to export diet log");
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
    <h3>Daily Average Totals</h3>
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

    // Today fix
    if (rowDate.getTime() === today.getTime()) {
      todayCalories += calories;
      todayProtein += protein;
    }

    // Mon-Fri only
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
      <h3>Today</h3>
      <p>Calories: <strong>${todayCalories}</strong></p>
      <p>Protein: <strong>${todayProtein}</strong></p>

      <hr />

      <h3>This Week (Mon-Sun)</h3>
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

      <p><strong>Protein Consistency</strong></p>
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
        <td data-label="Date">${escapeHtml(formatDateDDMMYY(v[0]))}</td>
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

  // Corrected indexes
  notes.value = r[12];
  calories.value = r[13];
  protein.value = r[14];
  carbs.value = r[15];
  fats.value = r[16];

  // Rebuild meal items from JSON
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
    await offlineAwareFetch(`${API_BASE_URL}/diet-log/${row}`, {
      method: "DELETE",
    });
    showSuccessMessage(
      navigator.onLine
        ? "Meal deleted successfully"
        : "Offline: delete queued and will sync automatically",
    );
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

    await offlineAwareFetch(url, {
      method: editRowNumber ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const actionWord = editRowNumber ? "updated" : "added";
    showSuccessMessage(
      navigator.onLine
        ? `Meal ${actionWord} successfully`
        : `Offline: meal ${actionWord} queued and will sync automatically`,
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
