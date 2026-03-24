function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateDDMMYY(value) {
  if (!value) return "";
  const d = parseSheetDate(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return String(value);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const mm = monthNames[d.getMonth()] || "UNK";
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

function formatFoodMetric(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const fixed = n.toFixed(digits);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function buildFoodOptionLabel(food) {
  const name = String(food?.name || "").trim();
  const unit = Number(food?.unit);
  const unitLabel = Number.isFinite(unit) && unit > 0 ? `${formatFoodMetric(unit, 0)}g` : "100g";
  const calories = `${formatFoodMetric(food?.calories)} kcal`;
  const protein = `P ${formatFoodMetric(food?.protein)}`;
  const carbs = `C ${formatFoodMetric(food?.carbs)}`;
  const fat = `F ${formatFoodMetric(food?.fat)}`;
  return [name, unitLabel, calories, protein, carbs, fat].filter(Boolean).join(" | ");
}

function getFoodUnitLabel(food) {
  const unit = Number(food?.unit);
  return Number.isFinite(unit) && unit > 0 ? `${formatFoodMetric(unit, 0)} g` : "100 g";
}

function getFoodSearchChipLabels(food) {
  return [
    `Per ${getFoodUnitLabel(food)}`,
    `${formatFoodMetric(food?.calories)} kcal`,
    `P ${formatFoodMetric(food?.protein)} g`,
    `C ${formatFoodMetric(food?.carbs)} g`,
    `F ${formatFoodMetric(food?.fat)} g`,
  ];
}

function buildFoodSearchSummaryText(food) {
  return getFoodSearchChipLabels(food).join(" • ");
}

function buildSelectedFoodCardMarkup(food) {
  if (!food) return "";

  return `
    <div class="food-selected-card">
      <span class="food-selected-label">Selected Food</span>
      <strong>${escapeHtml(String(food?.name || ""))}</strong>
      <span class="food-selected-text">${escapeHtml(buildFoodSearchSummaryText(food))}</span>
    </div>
  `;
}

function notifyError(message) {
  if (typeof showErrorMessage === "function") {
    showErrorMessage(message);
    return;
  }
  alert(message);
}

function notifySuccess(message) {
  if (typeof showSuccessMessage === "function") {
    showSuccessMessage(message);
    return;
  }
  alert(message);
}

function notifyWarning(message) {
  if (typeof showErrorMessage === "function") {
    showErrorMessage(message);
    return;
  }
  alert(message);
}

function withApiAuth(url, options = {}) {
  return {
    ...options,
    headers: new Headers(options.headers || {}),
  };
}

const AppHealth = {
  current: "unknown",

  apply(status) {
    const chip = document.getElementById("apiHealthChip");
    const chipMobile = document.getElementById("apiHealthChipMobile");
    [chip, chipMobile].forEach((el) => {
      if (!el) return;
      el.className = `health-chip ${status}`;
      if (status === "healthy") el.textContent = "API: Healthy";
      else if (status === "degraded") el.textContent = "API: Degraded";
      else if (status === "offline") el.textContent = "API: Offline";
      else el.textContent = "API: Unknown";
    });
  },

  setStatus(status) {
    this.current = status;
    this.apply(status);
  },
};

const AppQueueUI = {
  update() {
    const countDesktop = document.getElementById("queueCount");
    const countMobile = document.getElementById("queueCountMobile");
    if (typeof OfflineManager === "undefined") {
      [countDesktop, countMobile].forEach((el) => {
        if (el) el.textContent = "0";
      });
      return;
    }
    const status = OfflineManager.getQueueStatus();
    const size = status.size || 0;
    [countDesktop, countMobile].forEach((el) => {
      if (el) el.textContent = String(size);
    });
  },

  bind() {
    const syncDesktop = document.getElementById("syncNowBtn");
    const clearDesktop = document.getElementById("clearQueueBtn");
    const syncMobile = document.getElementById("syncNowBtnMobile");
    const clearMobile = document.getElementById("clearQueueBtnMobile");

    const handleSync = async () => {
      if (typeof OfflineManager === "undefined") return;
      await OfflineManager.syncQueue();
      this.update();
    };
    const handleClear = () => {
      if (typeof OfflineManager === "undefined") return;
      OfflineManager.clearQueue();
      this.update();
      notifySuccess("Sync queue cleared.");
    };

    [syncDesktop, syncMobile].forEach((btn) => {
      if (btn && !btn.dataset.bound) {
        btn.addEventListener("click", handleSync);
        btn.dataset.bound = "1";
      }
    });
    [clearDesktop, clearMobile].forEach((btn) => {
      if (btn && !btn.dataset.bound) {
        btn.addEventListener("click", handleClear);
        btn.dataset.bound = "1";
      }
    });

    this.update();
  },
};

window.AppHealth = AppHealth;
window.AppQueueUI = AppQueueUI;
window.withApiAuth = withApiAuth;
window.buildFoodOptionLabel = buildFoodOptionLabel;
window.buildSelectedFoodCardMarkup = buildSelectedFoodCardMarkup;

