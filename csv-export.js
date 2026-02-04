/**
 * CSV Export Utility
 * Converts data arrays to CSV format and triggers browser downloads
 */

const CSVExport = {
  /**
   * Escape special characters for CSV
   * @param {string} field - Field value to escape
   * @returns {string} - Escaped field
   */
  escapeCSV(field) {
    if (!field) return '""';
    
    const fieldStr = String(field);
    
    // If field contains comma, newline, or quotes, wrap in quotes and escape quotes
    if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('"')) {
      return `"${fieldStr.replace(/"/g, '""')}"`;
    }
    
    return fieldStr;
  },

  /**
   * Convert 2D array to CSV format
   * @param {array} data - 2D array of data [[row1], [row2], ...]
   * @param {array} headers - Optional header row
   * @returns {string} - CSV formatted string
   */
  arrayToCSV(data, headers = null) {
    const rows = [];
    
    // Add headers if provided
    if (headers && headers.length > 0) {
      const headerRow = headers.map(h => this.escapeCSV(h)).join(',');
      rows.push(headerRow);
    }
    
    // Add data rows
    data.forEach(row => {
      const csvRow = (Array.isArray(row) ? row : Object.values(row))
        .map(cell => this.escapeCSV(cell))
        .join(',');
      rows.push(csvRow);
    });
    
    return rows.join('\n');
  },

  /**
   * Download CSV file
   * @param {string} csvContent - CSV formatted content
   * @param {string} filename - Output filename (without .csv extension)
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}-${timestamp}.csv`;
    
    // Create download link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fullFilename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    showSuccessMessage(`✅ Downloaded ${fullFilename}`);
  },

  /**
   * Export diet log data as CSV
   * @param {array} dietData - Diet log rows from API
   * @param {string} filename - Optional custom filename
   */
  exportDietLog(dietData, filename = 'health-tracker-diet-log') {
    if (!dietData || dietData.length === 0) {
      showErrorMessage('❌ No diet data to export');
      return;
    }

    const headers = [
      'Date',
      'Meal Type',
      'Context',
      'Protein Source',
      'Veggies',
      'Carbs Food',
      'Fats Food',
      'Portion Notes',
      'Hunger',
      'Fullness',
      'Digestion',
      'Notes',
      'Calories',
      'Protein (g)',
      'Carbs (g)',
      'Fats (g)',
      'Alcohol',
      'Waste'
    ];

    const csv = this.arrayToCSV(dietData, headers);
    this.downloadCSV(csv, filename);
  },

  /**
   * Export inventory data as CSV
   * @param {array} inventoryData - Inventory rows from API
   * @param {string} filename - Optional custom filename
   */
  exportInventory(inventoryData, filename = 'health-tracker-inventory') {
    if (!inventoryData || inventoryData.length === 0) {
      showErrorMessage('❌ No inventory data to export');
      return;
    }

    const headers = [
      'Item',
      'Category',
      'Quantity',
      'Unit',
      'Minimum Qty',
      'Current Qty',
      'Purchase Date',
      'Expiry Date',
      'Status',
      'Notes'
    ];

    const csv = this.arrayToCSV(inventoryData, headers);
    this.downloadCSV(csv, filename);
  },

  /**
   * Export recipes data as CSV
   * @param {array} recipesData - Recipe rows from API
   * @param {string} filename - Optional custom filename
   */
  exportRecipes(recipesData, filename = 'health-tracker-recipes') {
    if (!recipesData || recipesData.length === 0) {
      showErrorMessage('❌ No recipe data to export');
      return;
    }

    const headers = [
      'Recipe Name',
      'Category',
      'Servings',
      'Calories per Serving',
      'Protein (g)',
      'Carbs (g)',
      'Fats (g)',
      'Instructions'
    ];

    const csv = this.arrayToCSV(recipesData, headers);
    this.downloadCSV(csv, filename);
  },

  /**
   * Export shift log data as CSV
   * @param {array} shiftData - Shift log rows from API
   * @param {string} filename - Optional custom filename
   */
  exportShiftLog(shiftData, filename = 'health-tracker-shift-log') {
    if (!shiftData || shiftData.length === 0) {
      showErrorMessage('❌ No shift log data to export');
      return;
    }

    const headers = [
      'Date',
      'Shift Type',
      'Work Mode',
      'Shift Status',
      'Hours',
      'Start Time',
      'End Time',
      'Anchor Hit',
      'Gym Done',
      'Sleep Hours',
      'Stress Level',
      'Notes'
    ];

    const csv = this.arrayToCSV(shiftData, headers);
    this.downloadCSV(csv, filename);
  }
};
