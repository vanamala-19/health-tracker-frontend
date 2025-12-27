const API_BASE_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://health-tracker-backend-z131.onrender.com";

const tableBody = document.querySelector("#inventoryTable tbody");
const form = document.getElementById("inventoryForm");

// =======================
// LOAD INVENTORY
// =======================
async function loadInventory() {
  const res = await fetch(`${API_BASE_URL}/inventory`);
  const rows = await res.json();

  tableBody.innerHTML = "";

  rows.forEach((r, i) => {
    const rowIndex = i + 2; // sheet row (A2 start)

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input value="${r[0] || ""}" data-col="0" /></td>
      <td><input value="${r[1] || ""}" data-col="1" /></td>
      <td><input type="number" value="${r[2] || 0}" data-col="2" /></td>
      <td><input value="${r[3] || ""}" data-col="3" /></td>
      <td><input type="number" value="${r[4] || 0}" data-col="4" /></td>
      <td><input type="number" value="${r[5] || 0}" data-col="5" /></td>
      <td><input type="number" value="${r[6] || 0}" data-col="6" /></td>
      <td><input type="number" value="${r[7] || 0}" data-col="7" /></td>
      <td>
        <button onclick="saveRow(${rowIndex}, this)">💾</button>
        <button onclick="deleteRow(${rowIndex})">🗑️</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

// =======================
// SAVE (EDIT) ROW
// =======================
async function saveRow(row, btn) {
  const inputs = btn.closest("tr").querySelectorAll("input");

  const values = Array.from(inputs).map((i) => i.value);

  await fetch(`${API_BASE_URL}/inventory/${row}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });

  alert("Item updated ✅");
}

// =======================
// DELETE ROW
// =======================
async function deleteRow(row) {
  if (!confirm("Delete this item?")) return;

  await fetch(`${API_BASE_URL}/inventory/${row}`, {
    method: "DELETE",
  });

  loadInventory();
}

// =======================
// ADD NEW ITEM
// =======================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    name: document.getElementById("name").value,
    category: document.getElementById("category").value,
    quantity: document.getElementById("quantity").value,
    unit: document.getElementById("unit").value,
    calories: document.getElementById("calories").value,
    protein: document.getElementById("protein").value,
    carbs: document.getElementById("carbs").value,
    fats: document.getElementById("fats").value,
    notes: document.getElementById("notes").value,
  };

  await fetch(`${API_BASE_URL}/inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  form.reset();
  loadInventory();
});

// =======================
// INIT
// =======================
loadInventory();
