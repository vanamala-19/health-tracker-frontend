const API = API_BASE_URL;

let foodRows = [];
let foodMeta = { editableFields: [] };
let selectedFoodRow = null;
let currentSearchQuery = "";

function formatNumber(value, digits = 2) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
}

function getFilteredFoods() {
  const query = String(currentSearchQuery || "").trim().toLowerCase();
  if (!query) return foodRows;
  return foodRows.filter((food) => String(food.name || "").toLowerCase().includes(query));
}

function updateEditorSummary(food) {
  const summary = document.getElementById("foodEditorSummary");
  if (!summary) return;

  if (!food) {
    summary.textContent = "Add a new food or select an existing row to edit it.";
    return;
  }

  summary.textContent = `${food.name} - ${formatNumber(food.calories)} kcal, ${formatNumber(food.protein)} protein, ${formatNumber(food.carbs)} carbs, ${formatNumber(food.fat)} fat per ${formatNumber(food.unit)} g`;
}

function fillFoodForm(food) {
  document.getElementById("foodNameInput").value = food?.name || "";
  document.getElementById("foodUnitInput").value = food?.unit ?? "";
  document.getElementById("foodCaloriesInput").value = food?.calories ?? "";
  document.getElementById("foodProteinInput").value = food?.protein ?? "";
  document.getElementById("foodCarbsInput").value = food?.carbs ?? "";
  document.getElementById("foodFatInput").value = food?.fat ?? "";
  updateEditorSummary(food);
}

function resetFoodForm() {
  selectedFoodRow = null;
  fillFoodForm(null);
  renderFoodTable();
}

function getPayloadFromForm() {
  return {
    name: document.getElementById("foodNameInput").value.trim(),
    unit: document.getElementById("foodUnitInput").value,
    calories: document.getElementById("foodCaloriesInput").value,
    protein: document.getElementById("foodProteinInput").value,
    carbs: document.getElementById("foodCarbsInput").value,
    fat: document.getElementById("foodFatInput").value,
  };
}

function renderFoodTable() {
  const table = document.getElementById("foodDatabaseTable");
  const meta = document.getElementById("foodTableMeta");
  if (!table) return;

  const rows = getFilteredFoods();
  if (meta) {
    meta.textContent = `Showing ${rows.length} of ${foodRows.length} foods from FOOD_DATABASE`;
  }

  let html = `
    <tr>
      <th>Food</th>
      <th>Unit (g)</th>
      <th>Calories</th>
      <th>Protein</th>
      <th>Carbs</th>
      <th>Fat</th>
      <th>Action</th>
    </tr>
  `;

  rows.forEach((food) => {
    const selectedClass = selectedFoodRow === food.row ? ' class="price-row-selected"' : "";
    html += `
      <tr${selectedClass}>
        <td data-label="Food">${escapeHtml(food.name || "")}</td>
        <td data-label="Unit (g)">${escapeHtml(formatNumber(food.unit))}</td>
        <td data-label="Calories">${escapeHtml(formatNumber(food.calories))}</td>
        <td data-label="Protein">${escapeHtml(formatNumber(food.protein))}</td>
        <td data-label="Carbs">${escapeHtml(formatNumber(food.carbs))}</td>
        <td data-label="Fat">${escapeHtml(formatNumber(food.fat))}</td>
        <td data-label="Action"><button type="button" onclick="selectFoodRow(${food.row})">Edit</button></td>
      </tr>
    `;
  });

  if (!rows.length) {
    html += '<tr><td colspan="7" style="text-align:center;">No foods found.</td></tr>';
  }

  table.innerHTML = html;
}

async function loadFoodDatabase() {
  try {
    const bootstrap = await safeApiFetch(`${API}/food-database/bootstrap`);
    foodRows = bootstrap?.foods || [];
    foodMeta = bootstrap?.meta || foodMeta;
    const selected = foodRows.find((row) => row.row === selectedFoodRow) || null;
    selectedFoodRow = selected?.row || null;
    fillFoodForm(selected);
    renderFoodTable();
  } catch (error) {
    console.error("Failed to load food database:", error);
  }
}

function selectFoodRow(rowNumber) {
  const food = foodRows.find((row) => row.row === rowNumber);
  if (!food) return;

  selectedFoodRow = rowNumber;
  fillFoodForm(food);
  renderFoodTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveFoodRecord() {
  const payload = getPayloadFromForm();
  if (!payload.name) {
    showErrorMessage("Food name is required.");
    return;
  }

  try {
    const url = selectedFoodRow ? `${API}/food-database/${selectedFoodRow}` : `${API}/food-database`;
    await safeApiFetch(url, {
      method: selectedFoodRow ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showSuccessMessage(selectedFoodRow ? "Food updated successfully" : "Food added successfully");
    await loadFoodDatabase();
    if (!selectedFoodRow) {
      resetFoodForm();
    }
  } catch (error) {
    console.error("Failed to save food:", error);
  }
}

async function deleteFoodRecord() {
  if (!selectedFoodRow) {
    showErrorMessage("Select a food item first.");
    return;
  }

  if (!confirm("Delete this food item?")) {
    return;
  }

  try {
    await safeApiFetch(`${API}/food-database/${selectedFoodRow}`, {
      method: "DELETE",
    });
    showSuccessMessage("Food deleted successfully");
    resetFoodForm();
    await loadFoodDatabase();
  } catch (error) {
    console.error("Failed to delete food:", error);
  }
}

window.selectFoodRow = selectFoodRow;
window.saveFoodRecord = saveFoodRecord;
window.deleteFoodRecord = deleteFoodRecord;
window.resetFoodForm = resetFoodForm;

document.getElementById("foodTableSearch")?.addEventListener("input", (event) => {
  currentSearchQuery = event.target.value || "";
  renderFoodTable();
});

fillFoodForm(null);
loadFoodDatabase();
