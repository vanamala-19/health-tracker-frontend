// =====================
// CONFIG
// =====================
// API_BASE_URL is loaded from api-config.js
const API = API_BASE_URL;

let inventory = [];
let selectedRow = null;

/* =====================
   LOAD INVENTORY
===================== */
async function loadInventory() {
  try {
    LoadingState.showOverlay();
    const rows = await offlineAwareFetch(`${API}/inventory`);
    inventory = rows.map((r, i) => ({
      row: Array.isArray(r) ? i + 2 : r.row ?? i + 2,
      values: Array.isArray(r) ? r : r.values || [],
    }));
    renderTable();
  } catch (error) {
    console.error("Failed to load inventory:", error);
  } finally {
    LoadingState.hideOverlay();
  }
}

loadInventory();

/* =====================
   RENDER TABLE
===================== */
function renderTable() {
  let html = `
    <tr>
      <th>Item</th>
      <th>Category</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Min</th>
      <th>Purchase</th>
      <th>Expiry</th>
      <th>Status</th>
      <th>Notes</th>
      <th>Action</th>
    </tr>
  `;

  inventory.forEach((r, i) => {
    const rowNum = r.row ?? i + 2;
    const v = r.values || [];

    html += `
      <tr>
        <td data-label="Item">${v[0] || ""}</td>
        <td data-label="Category">${v[1] || ""}</td>
        <td data-label="Qty"><strong>${v[2] || ""}</strong></td>
        <td data-label="Unit">${v[3] || ""}</td>
        <td data-label="Min">${v[4] || ""}</td>
        <td data-label="Purchase">${v[6] || "-"}</td>
        <td data-label="Expiry">${v[7] || "-"}</td>
        <td data-label="Status">
          <span class="badge ${
            v[8]?.includes("Out", "out")
              ? "info"
              : v[8]?.includes("Expired", "expired")
                ? "bad"
                : v[8]?.includes("Low", "low")
                  ? "warn"
                  : "good"
          }">
            ${v[8] || "-"}
          </span>
        </td>
        <td data-label="Notes">${v[9] || ""}</td>
        <td  data-label="Actions">
          <button onclick="selectRow(${rowNum}, ${i})">✏️</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("inventoryTable").innerHTML = html;

  // Add search input after table is rendered
  const tableContainer = document.querySelector(".table-container");
  let searchContainer = tableContainer.querySelector(".search-container");

  if (!searchContainer) {
    searchContainer = createSearchInput("🔍 Search inventory...", (query) => {
      filterTableRows("inventoryTable", query, [0, 1, 7, 8]); // Search Item, Category, Expiry, Status
    });
    tableContainer.insertBefore(
      searchContainer,
      document.getElementById("inventoryTable"),
    );
  }
}

/* =====================
   EXPORT INVENTORY
===================== */
function exportInventory() {
  if (!inventory || inventory.length === 0) {
    showErrorMessage("❌ No inventory data to export");
    return;
  }

  const exportBtn = document.getElementById("exportInventoryBtn");
  if (exportBtn) {
    LoadingState.disableButton(exportBtn);
  }

  try {
    CSVExport.exportInventory(
      inventory.map((r) => r.values),
      "inventory",
    );
  } catch (error) {
    console.error("Failed to export inventory:", error);
    showErrorMessage("❌ Failed to export inventory");
  } finally {
    if (exportBtn) {
      LoadingState.enableButton(exportBtn);
    }
  }
}

/* =====================
   SELECT ROW
===================== */
function selectRow(rowNumber, index) {
  selectedRow = rowNumber;

  const entry = inventory[index] || {};
  const v = entry.values || [];

  document.getElementById("qtyInput").value = v[2] || "";
  document.getElementById("purchaseDateInput").value = normalizeDate(v[6]);
  document.getElementById("notesInput").value = v[9] || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =====================
   SAVE UPDATE
===================== */
async function saveUpdate() {
  if (!selectedRow) {
    showErrorMessage("❌ Please select an item to update");
    return;
  }

  // Validate form before submission
  const formData = {
    quantity: document.getElementById("qtyInput").value,
    purchaseDate: document.getElementById("purchaseDateInput").value,
  };

  if (!validateInventoryForm(formData)) {
    return;
  }

  const saveBtn = document.querySelector('button[onclick="saveUpdate()"]');

  try {
    if (saveBtn) LoadingState.disableButton(saveBtn);

    const payload = {
      quantity: document.getElementById("qtyInput").value,
      purchaseDate: document.getElementById("purchaseDateInput").value,
      notes: document.getElementById("notesInput").value,
    };

    await safeApiFetch(`${API}/inventory/${selectedRow}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showSuccessMessage("✅ Item updated successfully");

    selectedRow = null;
    document.getElementById("qtyInput").value = "";
    document.getElementById("purchaseDateInput").value = "";
    document.getElementById("notesInput").value = "";

    loadInventory();
  } catch (error) {
    console.error("Failed to update inventory:", error);
  } finally {
    if (saveBtn) LoadingState.enableButton(saveBtn);
  }
}

/* =====================
   DATE NORMALIZER
===================== */
function normalizeDate(d) {
  if (!d) return "";
  if (d.includes("-")) return d;
  const [day, month, year] = d.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
