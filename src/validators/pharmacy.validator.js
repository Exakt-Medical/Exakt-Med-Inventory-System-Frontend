/**
 * Validates Pharmacy Registration & Update Form Data
 *
 * @param {Object} formData - The pharmacy form state object
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validatePharmacyForm = (formData) => {
  const errors = {};

  const pharmacyName = formData.pharmacyName?.trim() || "";
  const pharmacyCode = formData.pharmacyCode?.trim() || "";
  const address = formData.address?.trim() || "";
  const licenseNo = formData.licenseNo?.trim() || "";
  const lguId =
    formData.lguId !== undefined && formData.lguId !== null
      ? String(formData.lguId).trim()
      : "";

  // 1. Pharmacy Name Validation (Required, 2-150 chars)
  if (!pharmacyName) {
    errors.pharmacyName = "Pharmacy name is required.";
  } else if (pharmacyName.length < 2) {
    errors.pharmacyName = "Pharmacy name must be at least 2 characters.";
  } else if (pharmacyName.length > 150) {
    errors.pharmacyName = "Pharmacy name cannot exceed 150 characters.";
  }

  // 2. Pharmacy Code Validation (Required, 1-100 chars)
  if (!pharmacyCode) {
    errors.pharmacyCode = "Pharmacy code is required.";
  } else if (pharmacyCode.length > 100) {
    errors.pharmacyCode = "Pharmacy code cannot exceed 100 characters.";
  }

  // 3. Physical Address Validation (Required, 5-255 chars)
  if (!address) {
    errors.address = "Physical address is required.";
  } else if (address.length < 5) {
    errors.address =
      "Please enter a complete physical address (min. 5 characters).";
  } else if (address.length > 255) {
    errors.address = "Address cannot exceed 255 characters.";
  }

  // 4. Optional License Number Validation (Max 100 chars)
  if (licenseNo && licenseNo.length > 100) {
    errors.licenseNo = "License number cannot exceed 100 characters.";
  }

  // 5. Optional LGU ID Validation (Must be numeric if provided)
  if (lguId && (!/^\d+$/.test(lguId) || Number(lguId) <= 0)) {
    errors.lguId = "LGU ID must be a positive number.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

