function updateOnlineStatus() {
  if (!navigator.onLine) {
    alert("âš  You are offline");
  }
}

function sheetsSerialToDate(serial) {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

function parseSheetDate(value) {
  if (value === null || value === undefined || value === "") {
    return new Date(0);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return sheetsSerialToDate(value);
  }

  const str = String(value);
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(y, m - 1, d);
  }

  return new Date(str);
}

function normalizeSheetDateISO(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return sheetsSerialToDate(value).toISOString().slice(0, 10);
  }

  const str = String(value);
  if (str.includes("-")) return str;
  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}

window.addEventListener("offline", updateOnlineStatus);
window.addEventListener("online", () => {
  console.log("Back online");
});
