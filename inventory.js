const API = "https://health-tracker-backend-z131.onrender.com";

let inventory = [];
let selectedRow = null;

/* =====================
   LOAD INVENTORY
===================== */
async function loadInventory() {
  const res = await fetch(`${API}/inventory`);
  inventory = await res.json();
  renderTable();
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
    const rowNum = i + 2; // Sheet row

    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td><strong>${r[2]}</strong></td>
        <td>${r[3]}</td>
        <td>${r[4]}</td>
        <td>${r[6] || "-"}</td>
        <td>${r[7] || "-"}</td>
        <td>
          <span class="badge ${
            r[8]?.includes("Out")
              ? "bad"
              : r[8]?.includes("Low")
              ? "warn"
              : "good"
          }">
            ${r[8] || "-"}
          </span>
        </td>
        <td>${r[9] || ""}</td>
        <td>
          <button onclick="selectRow(${rowNum}, ${i})">✏️</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("inventoryTable").innerHTML = html;
}

/* =====================
   SELECT ROW
===================== */
function selectRow(rowNumber, index) {
  selectedRow = rowNumber;

  document.getElementById("qtyInput").value = inventory[index][2] || "";
  document.getElementById("purchaseDateInput").value = normalizeDate(
    inventory[index][6]
  );
  document.getElementById("notesInput").value = inventory[index][9] || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =====================
   SAVE UPDATE
===================== */
async function saveUpdate() {
  if (!selectedRow) {
    alert("Select an item to update");
    return;
  }

  const payload = {
    quantity: document.getElementById("qtyInput").value,
    purchaseDate: document.getElementById("purchaseDateInput").value,
    notes: document.getElementById("notesInput").value,
  };

  await fetch(`${API}/inventory/${selectedRow}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  selectedRow = null;
  document.getElementById("qtyInput").value = "";
  document.getElementById("purchaseDateInput").value = "";
  document.getElementById("notesInput").value = "";

  loadInventory();
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
