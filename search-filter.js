// =====================
// SEARCH & FILTER UTILITIES
// =====================

/**
 * Normalize text for search (lowercase, remove accents, trim)
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeSearchText(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

/**
 * Search array of objects by multiple fields
 * @param {array} items - Array of objects to search
 * @param {string} query - Search query
 * @param {array} fields - Fields to search in
 * @returns {array} Filtered items
 */
function searchItems(items, query, fields) {
  if (!query || !query.trim()) {
    return items;
  }

  const normalizedQuery = normalizeSearchText(query);

  return items.filter((item) => {
    return fields.some((field) => {
      const value = item[field];
      const normalizedValue = normalizeSearchText(value);
      return normalizedValue.includes(normalizedQuery);
    });
  });
}

/**
 * Search with debounce (delays execution)
 * @param {function} callback - Function to execute
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Debounced function
 */
function debounce(callback, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), delay);
  };
}

/**
 * Create search input element
 * @param {string} placeholder - Input placeholder
 * @param {function} onSearch - Callback when search changes
 * @returns {HTMLElement} Search input element
 */
function createSearchInput(placeholder = "Search...", onSearch) {
  const container = document.createElement("div");
  container.className = "search-container";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.placeholder = placeholder;

  const clearBtn = document.createElement("button");
  clearBtn.className = "search-clear";
  clearBtn.innerHTML = "✕";
  clearBtn.style.display = "none";
  clearBtn.title = "Clear search";

  // Handle search input
  const debouncedSearch = debounce(() => {
    const query = input.value;
    clearBtn.style.display = query ? "block" : "none";
    onSearch(query);
  }, 300);

  input.addEventListener("input", debouncedSearch);

  // Clear search
  clearBtn.addEventListener("click", () => {
    input.value = "";
    input.focus();
    clearBtn.style.display = "none";
    onSearch("");
  });

  container.appendChild(input);
  container.appendChild(clearBtn);

  return container;
}

/**
 * Filter table rows by search query
 * @param {string} tableId - Table element ID
 * @param {string} query - Search query
 * @param {array} columns - Column indices to search in
 */
function filterTableRows(tableId, query, columns = [0, 1, 2]) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const rows = table.querySelectorAll("tbody tr");
  const normalizedQuery = normalizeSearchText(query);

  let visibleCount = 0;

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    let matches = false;

    for (const colIndex of columns) {
      if (colIndex < cells.length) {
        const cellText = normalizeSearchText(cells[colIndex].textContent);
        if (cellText.includes(normalizedQuery)) {
          matches = true;
          break;
        }
      }
    }

    row.style.display = matches ? "" : "none";
    if (matches) visibleCount++;
  });

  // Show "no results" message if needed
  const noResults = table.querySelector(".no-results");
  if (normalizedQuery && visibleCount === 0) {
    if (!noResults) {
      const tr = document.createElement("tr");
      tr.className = "no-results";
      tr.innerHTML = `<td colspan="10" style="text-align: center; padding: 20px; color: var(--text-secondary);">No results found for "${query}"</td>`;
      table.appendChild(tr);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

/**
 * Filter list items (like buttons) by search query
 * @param {string} containerId - Container element ID
 * @param {string} query - Search query
 * @param {string} selector - Child element selector (default: "button")
 */
function filterListItems(containerId, query, selector = "button") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = container.querySelectorAll(selector);
  const normalizedQuery = normalizeSearchText(query);

  let visibleCount = 0;

  items.forEach((item) => {
    const text = normalizeSearchText(item.textContent);
    const matches = text.includes(normalizedQuery);

    item.style.display = matches ? "" : "none";
    if (matches) visibleCount++;
  });

  // Show "no results" message if needed
  let noResults = container.querySelector(".no-results-msg");

  if (normalizedQuery && visibleCount === 0) {
    if (!noResults) {
      noResults = document.createElement("div");
      noResults.className = "no-results-msg";
      noResults.style.cssText =
        "text-align: center; padding: 20px; color: var(--text-secondary); font-size: 14px;";
      noResults.textContent = `No results found for "${query}"`;
      container.appendChild(noResults);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

/**
 * Highlight search matches in text
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @returns {string} HTML with highlighted matches
 */
function highlightMatches(text, query) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  return String(text).replace(regex, '<mark class="highlight">$1</mark>');
}

/**
 * Get search statistics
 * @param {array} items - Array of items
 * @param {string} query - Search query
 * @param {array} fields - Fields to search
 * @returns {object} {total, found, percentage}
 */
function getSearchStats(items, query, fields) {
  const found = searchItems(items, query, fields).length;
  const total = items.length;

  return {
    total: total,
    found: found,
    percentage: total > 0 ? Math.round((found / total) * 100) : 0,
  };
}
