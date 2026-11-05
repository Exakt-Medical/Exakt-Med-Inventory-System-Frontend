/**
 * Validates Facility Registration & Update Form Data
 * Enforces basic presence rules for Facility Name, Facility Code, and Address
 *
 * @param {Object} formData - The facility form state object
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export const validateFacilityForm = (formData) => {
  const errors = {};

  const name = formData.name?.trim() || "";
  const facilityCode = formData.facilityCode?.trim() || "";
  const address = formData.address?.trim() || "";

  // 1. Facility Name Validation (Required, 2-150 chars)
  if (!name) {
    errors.name = "Facility name is required.";
  } else if (name.length < 2) {
    errors.name = "Facility name must be at least 2 characters.";
  } else if (name.length > 150) {
    errors.name = "Facility name cannot exceed 150 characters.";
  }

  // 2. Facility Code Validation (Required, 1-100 chars)
  if (!facilityCode) {
    errors.facilityCode = "Facility code is required.";
  } else if (facilityCode.length > 100) {
    errors.facilityCode = "Facility code cannot exceed 100 characters.";
  }

  // 3. Physical Address Validation (Required, 5-255 chars)
  if (!address) {
    errors.address = "Physical address is required.";
  } else if (address.length < 5) {
    errors.address = "Please enter a complete physical address (min. 5 characters).";
  } else if (address.length > 255) {
    errors.address = "Address cannot exceed 255 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
