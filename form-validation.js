// =====================
// FORM VALIDATION UTILITIES
// =====================

/**
 * Validate required fields
 * @param {object} fields - Object with field name and value
 * @returns {boolean} True if all fields are filled
 */
function validateRequired(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === "string" && !value.trim())) {
      showErrorMessage(`❌ "${name}" is required.`);
      return false;
    }
  }
  return true;
}

/**
 * Validate date format (YYYY-MM-DD or DD/MM/YYYY)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function validateDate(dateStr) {
  if (!dateStr) return false;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  // DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    const date = new Date(y, m - 1, d);
    return date.getDate() === parseInt(d);
  }

  return false;
}

/**
 * Validate numeric input
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} True if valid
 */
function validateNumber(value, min = null, max = null) {
  const num = Number(value);

  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;

  return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate multiple fields with rules
 * @param {object} formData - Form data object
 * @param {object} rules - Validation rules {fieldName: {required, type, min, max}}
 * @returns {object} {valid: boolean, errors: array}
 */
function validateForm(formData, rules) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];

    // Check required
    if (
      rule.required &&
      (!value || (typeof value === "string" && !value.trim()))
    ) {
      errors.push(`${field} is required`);
      continue;
    }

    if (!value) continue; // Skip validation if not required and empty

    // Check type
    if (rule.type === "number") {
      if (!validateNumber(value, rule.min, rule.max)) {
        errors.push(
          `${field} must be a valid number${rule.min ? ` (min: ${rule.min})` : ""}${rule.max ? ` (max: ${rule.max})` : ""}`,
        );
      }
    } else if (rule.type === "date") {
      if (!validateDate(value)) {
        errors.push(`${field} must be a valid date (YYYY-MM-DD or DD/MM/YYYY)`);
      }
    } else if (rule.type === "email") {
      if (!validateEmail(value)) {
        errors.push(`${field} must be a valid email`);
      }
    } else if (rule.type === "url") {
      if (!validateUrl(value)) {
        errors.push(`${field} must be a valid URL`);
      }
    } else if (rule.type === "string") {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Display validation errors
 * @param {array} errors - Array of error messages
 */
function displayValidationErrors(errors) {
  if (!errors || errors.length === 0) return;

  const errorList = errors.map((e) => `• ${e}`).join("\n");
  showErrorMessage(`❌ Please fix the following:\n${errorList}`, 8000);
}

/**
 * Quick validation for diet form
 * @param {object} data - Form data
 * @returns {boolean} True if valid
 */
function validateDietForm(data) {
  const rules = {
    date: { required: true, type: "date" },
    mealType: { required: true, type: "string" },
    calories: { required: false, type: "number", min: 0 },
    protein: { required: false, type: "number", min: 0 },
    carbs: { required: false, type: "number", min: 0 },
    fats: { required: false, type: "number", min: 0 },
  };

  const validation = validateForm(data, rules);

  if (!validation.valid) {
    displayValidationErrors(validation.errors);
    return false;
  }

  return true;
}

/**
 * Quick validation for inventory form
 * @param {object} data - Form data
 * @returns {boolean} True if valid
 */
function validateInventoryForm(data) {
  const rules = {
    quantity: { required: true, type: "number", min: 0 },
    purchaseDate: { required: false, type: "date" },
  };

  const validation = validateForm(data, rules);

  if (!validation.valid) {
    displayValidationErrors(validation.errors);
    return false;
  }

  return true;
}

/**
 * Quick validation for shift form
 * @param {object} data - Form data
 * @returns {boolean} True if valid
 */
function validateShiftForm(data) {
  const rules = {
    shift: { required: true, type: "string" },
    workMode: { required: false, type: "string" },
  };

  const validation = validateForm(data, rules);

  if (!validation.valid) {
    displayValidationErrors(validation.errors);
    return false;
  }

  return true;
}
