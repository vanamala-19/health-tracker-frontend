const API = API_BASE_URL;

let foodRows = [];
let foodMeta = {
  editableFields: [],
};
let selectedFoodRow = null;
let currentSearchQuery = "";
let currentQuickFilter = "all";
let currentSortField = "name";
let currentSortDirection = "asc";

const QUICK_FILTERS = [
  {
    key: "all",
    label: "All Foods",
    description: "Complete PRICE_DATABASE view",
  },
  {
    key: "budget",
    label: "Budget Protein",
    description: "Cheapest cost per 10g protein",
  },
  {
    key: "lean",
    label: "Lean Protein",
    description: "Lowest calories per 10g protein",
  },
  {
    key: "lowCal",
    label: "Low Calorie",
    description: "Lightest calories per gram",
  },
  {
    key: "dense",
    label: "Dense Protein",
    description: "Highest protein packed per gram",
  },
];

const TABLE_COLUMNS = [
  { label: "Food", field: "name", type: "text" },
  { label: "Price", field: "price", type: "number" },
  { label: "Price Unit", field: "priceUnit", type: "text" },
  { label: "Rs/gm", field: "rupeesPerGram", type: "number" },
  { label: "Rs per 10g Protein", field: "pricePer10gProtein", type: "number" },
  { label: "Calories per 10g Protein", field: "caloriesPer10gProtein", type: "number" },
  { label: "Kg per 10g Protein", field: "weightKgPer10gProtein", type: "number" },
  { label: "Fat per 10g Protein", field: "fatPer10gProtein", type: "number" },
  { label: "Carbs per 10g Protein", field: "carbsPer10gProtein", type: "number" },
  { label: "Protein/g", field: "proteinPerGram", type: "number" },
  { label: "Calories/g", field: "caloriesPerGram", type: "number" },
  { label: "Fat/g", field: "fatPerGram", type: "number" },
  { label: "Carbs/g", field: "carbsPerGram", type: "number" },
  { label: "Labels", field: "labelText", type: "text" },
  { label: "Action", field: null, type: "action", sortable: false },
];

function canEditPrice() {
  return (foodMeta.editableFields || []).includes("price");
}

function setInputState(id, enabled) {
  const el = document.getElementById(id);
  if (!el) return;
  el.disabled = !enabled;
}

function syncPriceEditorState() {
  setInputState("foodPriceInput", canEditPrice());
  setInputState("saveFoodUpdateBtn", canEditPrice());

  const modeHint = document.getElementById("foodDbModeHint");
  if (!modeHint) return;

  if (!canEditPrice()) {
    modeHint.textContent =
      "This sheet does not expose a writable price column to the frontend.";
    return;
  }

  modeHint.textContent =
    "Price editing is enabled. Only price is editable; all other values remain formula-driven.";
}

function formatNumber(value, digits = 2) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
}

function getMetricValue(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatCurrency(value, digits = 2) {
  const num = getMetricValue(value);
  return num === null ? "-" : `Rs ${num.toFixed(digits)}`;
}

function isProteinFood(food) {
  return (getMetricValue(food.proteinPerGram) || 0) >= 0.08;
}

function isLowCalorieFood(food) {
  const caloriesPerGram = getMetricValue(food.caloriesPerGram);
  return caloriesPerGram !== null && caloriesPerGram > 0 && caloriesPerGram <= 0.5;
}

function isDenseProteinFood(food) {
  return (getMetricValue(food.proteinPerGram) || 0) >= 0.18;
}

function rankFoods(filterFn, sortFn, limit = 3) {
  return [...foodRows].filter(filterFn).sort(sortFn).slice(0, limit);
}

function getQuickFilterLabel(filterKey = currentQuickFilter) {
  return QUICK_FILTERS.find((filter) => filter.key === filterKey)?.label || "All Foods";
}

function matchesQuickFilter(food) {
  switch (currentQuickFilter) {
    case "budget":
      return isProteinFood(food) && getMetricValue(food.pricePer10gProtein) !== null;
    case "lean":
      return isProteinFood(food) && getMetricValue(food.caloriesPer10gProtein) !== null;
    case "lowCal":
      return isLowCalorieFood(food);
    case "dense":
      return isDenseProteinFood(food);
    default:
      return true;
  }
}

function getFoodSearchText(food) {
  return [
    food.name,
    food.category,
    food.labelText,
    food.searchText,
    food.priceUnit,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterFoodRows(query) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();

  return foodRows.filter((food) => {
    if (!matchesQuickFilter(food)) return false;
    if (!normalizedQuery) return true;
    return getFoodSearchText(food).includes(normalizedQuery);
  });
}

function buildSelectionMetric(label, value, helper = "") {
  return `
    <div class="price-selection-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${helper ? `<small>${escapeHtml(helper)}</small>` : ""}
    </div>
  `;
}

function updateSelectedFoodPanel(food) {
  const summary = document.getElementById("selectedFoodSummary");
  const tagContainer = document.getElementById("priceSelectionTags");
  const metricsContainer = document.getElementById("priceSelectionMetrics");
  const priceInput = document.getElementById("foodPriceInput");

  if (!summary || !tagContainer || !metricsContainer || !priceInput) return;

  if (!food) {
    summary.textContent =
      "Select a food from the table or ranking boards to review its price efficiency snapshot.";
    tagContainer.innerHTML = `
      <span class="badge info">Formula-safe metrics</span>
      <span class="badge good">Price-only editing</span>
    `;
    metricsContainer.innerHTML = `
      <div class="price-selection-empty">
        Pick any food to see cost efficiency, protein density, and formula-driven nutrition values.
      </div>
    `;
    priceInput.value = "";
    return;
  }

  const tagItems = [
    food.category,
    food.priceUnit,
    ...String(food.labelText || "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 3),
  ].filter(Boolean);

  summary.textContent = `${food.name} - ${formatCurrency(food.price)} per ${food.priceUnit || "unit"}`;
  tagContainer.innerHTML = tagItems.length
    ? tagItems
        .map(
          (tag, index) =>
            `<span class="badge ${index === 0 ? "info" : "good"}">${escapeHtml(tag)}</span>`,
        )
        .join("")
    : '<span class="badge info">Formula-driven row</span>';
  metricsContainer.innerHTML = [
    buildSelectionMetric("Price", formatCurrency(food.price), food.priceUnit || "Sheet unit"),
    buildSelectionMetric("Rs / 10g Protein", formatCurrency(food.pricePer10gProtein)),
    buildSelectionMetric(
      "Calories / 10g Protein",
      getMetricValue(food.caloriesPer10gProtein) === null
        ? "-"
        : `${formatNumber(food.caloriesPer10gProtein)} kcal`,
    ),
    buildSelectionMetric("Protein / g", formatNumber(food.proteinPerGram, 2)),
    buildSelectionMetric("Calories / g", formatNumber(food.caloriesPerGram, 2)),
    buildSelectionMetric("Fat / 10g Protein", formatNumber(food.fatPer10gProtein, 2)),
  ].join("");
  priceInput.value = food.price === null || food.price === undefined ? "" : food.price;
}

function renderTableFilters() {
  const filterBar = document.getElementById("priceFilterBar");
  if (!filterBar) return;

  filterBar.innerHTML = QUICK_FILTERS.map(
    (filter) => `
      <button
        type="button"
        class="price-filter-chip ${filter.key === currentQuickFilter ? "is-active" : ""}"
        onclick="setQuickFilter('${filter.key}')"
      >
        <strong>${escapeHtml(filter.label)}</strong>
        <span>${escapeHtml(filter.description)}</span>
      </button>
    `,
  ).join("");
}

function renderTableMeta(filteredRows) {
  const meta = document.getElementById("priceTableMeta");
  if (!meta) return;

  const summaryParts = [
    `Showing ${filteredRows.length} of ${foodRows.length} foods`,
    `Filter: ${getQuickFilterLabel()}`,
    `Sort: ${getSortColumn(currentSortField)?.label || "Food"} (${currentSortDirection})`,
  ];

  if (currentSearchQuery) {
    summaryParts.push(`Search: "${currentSearchQuery}"`);
  }

  meta.textContent = summaryParts.join(" - ");
}

function setQuickFilter(filterKey) {
  currentQuickFilter = QUICK_FILTERS.some((filter) => filter.key === filterKey)
    ? filterKey
    : "all";
  renderFoodTable();
}

function getSortColumn(field) {
  return TABLE_COLUMNS.find((column) => column.field === field);
}

function getSortIndicator(field) {
  if (currentSortField !== field) return "<>";
  return currentSortDirection === "asc" ? "^" : "v";
}

function getSortValue(food, column) {
  if (!column?.field) return "";
  const rawValue = food[column.field];

  if (column.type === "number") {
    const numericValue = getMetricValue(rawValue);
    return numericValue === null ? null : numericValue;
  }

  return String(rawValue || "").trim().toLowerCase();
}

function sortFoodRows(rows) {
  const column = getSortColumn(currentSortField);
  if (!column) return rows;

  const direction = currentSortDirection === "asc" ? 1 : -1;
  return [...rows].sort((foodA, foodB) => {
    const valueA = getSortValue(foodA, column);
    const valueB = getSortValue(foodB, column);

    if (column.type === "number") {
      if (valueA === null && valueB === null) return foodA.name.localeCompare(foodB.name);
      if (valueA === null) return 1;
      if (valueB === null) return -1;
      if (valueA !== valueB) return (valueA - valueB) * direction;
      return foodA.name.localeCompare(foodB.name);
    }

    const textCompare = String(valueA).localeCompare(String(valueB));
    if (textCompare !== 0) return textCompare * direction;
    return foodA.row - foodB.row;
  });
}

function setSort(field) {
  if (!field) return;

  if (currentSortField === field) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortField = field;
    currentSortDirection = "asc";
  }

  renderFoodTable();
}

function renderTableHeaders() {
  return TABLE_COLUMNS.map((column) => {
    if (column.sortable === false || !column.field) {
      return `<th>${escapeHtml(column.label)}</th>`;
    }

    const activeClass = currentSortField === column.field ? " sort-active" : "";
    return `
      <th
        class="is-sortable${activeClass}"
        onclick="setSort('${column.field}')"
      >
        ${escapeHtml(column.label)}
        <span class="sort-indicator">${escapeHtml(getSortIndicator(column.field))}</span>
      </th>
    `;
  }).join("");
}

function renderQuickStats() {
  const container = document.getElementById("priceQuickStats");
  if (!container) return;

  const proteinFoods = foodRows.filter(isProteinFood);
  const lowCalorieFoods = foodRows.filter(isLowCalorieFood);
  const trackedProteinFoods = proteinFoods.filter(
    (food) => getMetricValue(food.pricePer10gProtein) !== null,
  );
  const budgetLeader = rankFoods(
    (food) => isProteinFood(food) && getMetricValue(food.pricePer10gProtein) !== null,
    (a, b) => a.pricePer10gProtein - b.pricePer10gProtein,
    1,
  )[0];
  const avgBudgetProtein = trackedProteinFoods.length
    ? trackedProteinFoods.reduce(
        (sum, food) => sum + (getMetricValue(food.pricePer10gProtein) || 0),
        0,
      ) / trackedProteinFoods.length
    : null;

  container.innerHTML = `
    <div class="price-stat-card">
      <span class="price-stat-label">Foods Loaded</span>
      <strong>${foodRows.length}</strong>
    </div>
    <div class="price-stat-card">
      <span class="price-stat-label">Protein Picks</span>
      <strong>${proteinFoods.length}</strong>
    </div>
    <div class="price-stat-card">
      <span class="price-stat-label">Low-Cal Picks</span>
      <strong>${lowCalorieFoods.length}</strong>
    </div>
    <div class="price-stat-card">
      <span class="price-stat-label">Avg Rs / 10g Protein</span>
      <strong>${avgBudgetProtein === null ? "-" : formatCurrency(avgBudgetProtein)}</strong>
      <span class="price-stat-helper">
        ${trackedProteinFoods.length ? `${trackedProteinFoods.length} tracked protein foods` : "Waiting for valid protein pricing"}
      </span>
    </div>
    <div class="price-stat-card price-stat-card--accent">
      <span class="price-stat-label">Budget Leader</span>
      <strong>${escapeHtml(budgetLeader?.name || "-")}</strong>
      <span class="price-stat-helper">
        ${budgetLeader ? `${formatCurrency(budgetLeader.pricePer10gProtein)} per 10g protein` : "Needs valid price data"}
      </span>
    </div>
  `;
}

function buildHighlightCard(title, subtitle, food, metrics) {
  if (!food) {
    return `
      <article class="price-highlight-card">
        <p class="price-highlight-kicker">${escapeHtml(subtitle)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">Not enough data yet.</p>
      </article>
    `;
  }

  return `
    <article class="price-highlight-card">
      <p class="price-highlight-kicker">${escapeHtml(subtitle)}</p>
      <h3>${escapeHtml(title)}</h3>
      <div class="price-highlight-name">${escapeHtml(food.name)}</div>
      <div class="price-highlight-metrics">
        ${metrics
          .map(
            (metric) => `
              <span class="price-metric-pill">
                <strong>${escapeHtml(metric.label)}</strong>
                ${escapeHtml(metric.value)}
              </span>
            `,
          )
          .join("")}
      </div>
      <button type="button" class="price-mini-action" onclick="selectFoodRow(${food.row})">
        Open food
      </button>
    </article>
  `;
}

function renderHighlights() {
  const container = document.getElementById("priceHighlights");
  if (!container) return;

  const budgetLeader = rankFoods(
    (food) => isProteinFood(food) && getMetricValue(food.pricePer10gProtein) !== null,
    (a, b) => a.pricePer10gProtein - b.pricePer10gProtein,
    1,
  )[0];
  const leanLeader = rankFoods(
    (food) => isProteinFood(food) && getMetricValue(food.caloriesPer10gProtein) !== null,
    (a, b) => a.caloriesPer10gProtein - b.caloriesPer10gProtein,
    1,
  )[0];
  const denseLeader = rankFoods(
    (food) => getMetricValue(food.proteinPerGram) !== null,
    (a, b) => b.proteinPerGram - a.proteinPerGram,
    1,
  )[0];
  const lowCalLeader = rankFoods(
    (food) => isLowCalorieFood(food),
    (a, b) => a.caloriesPerGram - b.caloriesPerGram,
    1,
  )[0];

  container.innerHTML = [
    buildHighlightCard("Best Budget Protein", "Cheapest protein per 10g", budgetLeader, [
      { label: "Rs / 10g", value: formatNumber(budgetLeader?.pricePer10gProtein) },
      { label: "Protein/g", value: formatNumber(budgetLeader?.proteinPerGram, 2) },
      { label: "Calories/10g", value: formatNumber(budgetLeader?.caloriesPer10gProtein) },
    ]),
    buildHighlightCard("Leanest Protein", "Lowest calories per 10g protein", leanLeader, [
      { label: "Calories/10g", value: formatNumber(leanLeader?.caloriesPer10gProtein) },
      { label: "Rs / 10g", value: formatNumber(leanLeader?.pricePer10gProtein) },
      { label: "Fat/10g", value: formatNumber(leanLeader?.fatPer10gProtein) },
    ]),
    buildHighlightCard("Highest Protein Density", "Most protein per gram", denseLeader, [
      { label: "Protein/g", value: formatNumber(denseLeader?.proteinPerGram, 2) },
      { label: "Calories/g", value: formatNumber(denseLeader?.caloriesPerGram, 2) },
      { label: "Rs / 10g", value: formatNumber(denseLeader?.pricePer10gProtein) },
    ]),
    buildHighlightCard("Lowest Calorie Food", "Lightest calories per gram", lowCalLeader, [
      { label: "Calories/g", value: formatNumber(lowCalLeader?.caloriesPerGram, 2) },
      { label: "Protein/g", value: formatNumber(lowCalLeader?.proteinPerGram, 2) },
      { label: "Rs / 10g", value: formatNumber(lowCalLeader?.pricePer10gProtein) },
    ]),
  ].join("");
}

function buildRankingCard(title, subtitle, items, metricBuilder) {
  return `
    <article class="price-rank-card">
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(subtitle)}</p>
      ${
        items.length
          ? `<ul class="price-rank-list">
              ${items
                .map(
                  (food, index) => `
                    <li>
                      <span class="price-rank-index">${index + 1}</span>
                      <div class="price-rank-copy">
                        <strong>${escapeHtml(food.name)}</strong>
                        <span>${escapeHtml(metricBuilder(food))}</span>
                        ${food.priceUnit ? `<span class="price-rank-chip">${escapeHtml(food.priceUnit)}</span>` : ""}
                      </div>
                      <button type="button" class="price-rank-jump" onclick="selectFoodRow(${food.row})">
                        View
                      </button>
                    </li>
                  `,
                )
                .join("")}
            </ul>`
          : `<p class="muted">Not enough data yet.</p>`
      }
    </article>
  `;
}

function renderRankings() {
  const container = document.getElementById("priceRankings");
  if (!container) return;

  const budgetPicks = rankFoods(
    (food) => isProteinFood(food) && getMetricValue(food.pricePer10gProtein) !== null,
    (a, b) => a.pricePer10gProtein - b.pricePer10gProtein,
    5,
  );
  const leanPicks = rankFoods(
    (food) => isProteinFood(food) && getMetricValue(food.caloriesPer10gProtein) !== null,
    (a, b) => a.caloriesPer10gProtein - b.caloriesPer10gProtein,
    5,
  );
  const lowCaloriePicks = rankFoods(
    (food) => isLowCalorieFood(food),
    (a, b) => a.caloriesPerGram - b.caloriesPerGram,
    5,
  );
  const densePicks = rankFoods(
    (food) => getMetricValue(food.proteinPerGram) !== null,
    (a, b) => b.proteinPerGram - a.proteinPerGram,
    5,
  );

  container.innerHTML = [
    buildRankingCard(
      "Budget Proteins",
      "Lowest cost per 10g of protein",
      budgetPicks,
      (food) => `Rs ${formatNumber(food.pricePer10gProtein)} | ${formatNumber(food.proteinPerGram, 2)} protein/g`,
    ),
    buildRankingCard(
      "Lean Proteins",
      "Lowest calories per 10g of protein",
      leanPicks,
      (food) => `${formatNumber(food.caloriesPer10gProtein)} kcal | Rs ${formatNumber(food.pricePer10gProtein)}`,
    ),
    buildRankingCard(
      "Low-Calorie Foods",
      "Lowest calories per gram",
      lowCaloriePicks,
      (food) => `${formatNumber(food.caloriesPerGram, 2)} kcal/g | ${formatNumber(food.proteinPerGram, 2)} protein/g`,
    ),
    buildRankingCard(
      "Protein Density",
      "Most protein packed per gram",
      densePicks,
      (food) => `${formatNumber(food.proteinPerGram, 2)} protein/g | ${formatNumber(food.caloriesPerGram, 2)} kcal/g`,
    ),
  ].join("");
}

function renderFoodTable() {
  const table = document.getElementById("foodDatabaseTable");
  if (!table) return;

  const filteredRows = filterFoodRows(currentSearchQuery);
  const sortedRows = sortFoodRows(filteredRows);
  renderTableFilters();
  renderTableMeta(sortedRows);

  let html = `
    <tr>
      ${renderTableHeaders()}
    </tr>
  `;

  sortedRows.forEach((food) => {
    const selectedClass = selectedFoodRow === food.row ? " class=\"price-row-selected\"" : "";
    html += `
      <tr${selectedClass}>
        <td data-label="Food">${escapeHtml(food.name || "")}</td>
        <td data-label="Price">${escapeHtml(formatCurrency(food.price))}</td>
        <td data-label="Price Unit">${escapeHtml(food.priceUnit || "-")}</td>
        <td data-label="Rs/gm">${escapeHtml(formatNumber(food.rupeesPerGram, 3))}</td>
        <td data-label="Rs per 10g Protein">${escapeHtml(formatCurrency(food.pricePer10gProtein))}</td>
        <td data-label="Calories per 10g Protein">${escapeHtml(formatNumber(food.caloriesPer10gProtein))}</td>
        <td data-label="Kg per 10g Protein">${escapeHtml(formatNumber(food.weightKgPer10gProtein, 3))}</td>
        <td data-label="Fat per 10g Protein">${escapeHtml(formatNumber(food.fatPer10gProtein))}</td>
        <td data-label="Carbs per 10g Protein">${escapeHtml(formatNumber(food.carbsPer10gProtein))}</td>
        <td data-label="Protein/g">${escapeHtml(formatNumber(food.proteinPerGram, 2))}</td>
        <td data-label="Calories/g">${escapeHtml(formatNumber(food.caloriesPerGram, 2))}</td>
        <td data-label="Fat/g">${escapeHtml(formatNumber(food.fatPerGram, 2))}</td>
        <td data-label="Carbs/g">${escapeHtml(formatNumber(food.carbsPerGram, 2))}</td>
        <td data-label="Labels">${escapeHtml(food.labelText || "-")}</td>
        <td data-label="Actions">
          <button onclick="selectFoodRow(${food.row})">${canEditPrice() ? "Edit" : "View"}</button>
        </td>
      </tr>
    `;
  });

  if (!sortedRows.length) {
    html += `
      <tr>
        <td colspan="15" style="text-align: center;">No foods found for the current filters.</td>
      </tr>
    `;
  }

  table.innerHTML = html;

  const tableContainer = document.querySelector(".table-container");
  const tableTools = document.getElementById("priceTableTools") || tableContainer;
  let searchContainer = tableTools?.querySelector(".search-container");
  if (!tableContainer || !tableTools || searchContainer) return;

  searchContainer = createSearchInput(
    "Search foods, tags, category, or price unit...",
    (query) => {
      currentSearchQuery = query;
      renderFoodTable();
    },
  );
  searchContainer.classList.add("price-search-shell");
  tableTools.appendChild(searchContainer);
}

async function loadFoodDatabase() {
  try {
    const bootstrap = await safeApiFetch(`${API}/price-database/bootstrap`);
    foodRows = bootstrap?.foods || [];
    foodMeta = bootstrap?.meta || foodMeta;
    const selectedFood = foodRows.find((row) => row.row === selectedFoodRow) || null;
    selectedFoodRow = selectedFood?.row || null;
    syncPriceEditorState();
    renderQuickStats();
    renderHighlights();
    renderRankings();
    updateSelectedFoodPanel(selectedFood);
    renderFoodTable();
  } catch (error) {
    console.error("Failed to load price database:", error);
  }
}

function selectFoodRow(rowNumber) {
  const food = foodRows.find((row) => row.row === rowNumber);
  if (!food) return;

  selectedFoodRow = rowNumber;
  updateSelectedFoodPanel(food);
  renderFoodTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveFoodUpdate() {
  if (!selectedFoodRow) {
    showErrorMessage("Select a food item first.");
    return;
  }

  if (!canEditPrice()) {
    notifyWarning("Only price updates are allowed here.");
    return;
  }

  try {
    await safeApiFetch(`${API}/price-database/${selectedFoodRow}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: document.getElementById("foodPriceInput").value,
      }),
    });

    showSuccessMessage("Price updated successfully");
    await loadFoodDatabase();
  } catch (error) {
    console.error("Failed to update price:", error);
  }
}

window.selectFoodRow = selectFoodRow;
window.saveFoodUpdate = saveFoodUpdate;
window.setQuickFilter = setQuickFilter;
window.setSort = setSort;

syncPriceEditorState();
updateSelectedFoodPanel(null);
loadFoodDatabase();

