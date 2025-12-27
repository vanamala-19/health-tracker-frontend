const API_BASE_URL = "https://health-tracker-backend-z131.onrender.com";

let inventoryRows = [];

async function loadInventory() {
  const res = await fetch(`${API_BASE_URL}/inventory`);
  inventoryRows = await res.json();
  renderInventory();
}

function renderInventory() {
  let html = `
    <tr>
      <th>Item</th>
      <th>Category</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Calories</th>
      <th>Protein</th>
      <th>Action</th>
    </tr>
  `;

  inventoryRows.forEach((r, i) => {
    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
        <td>${r[3]}</td>
        <td>${r[4]}</td>
        <td>${r[5]}</td>
        <td>
          <button onclick="deleteItem(${i + 2})">🗑️</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("inventoryTable").innerHTML = html;
}

async function deleteItem(row) {
  if (!confirm("Delete item?")) return;

  await fetch(`${API_BASE_URL}/inventory/${row}`, {
    method: "DELETE",
  });

  loadInventory();
}

document
  .getElementById("inventoryForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: name.value,
      category: category.value,
      quantity: quantity.value,
      unit: unit.value,
      calories: calories.value,
      protein: protein.value,
      carbs: carbs.value,
      fats: fats.value,
      notes: notes.value,
    };

    await fetch(`${API_BASE_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    e.target.reset();
    loadInventory();
  });

loadInventory();
