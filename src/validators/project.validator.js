import { isRequired, minLength, isUnique, runValidation } from "./rules";

/**
 * Validate Project Form (Add or Edit)
 */
export const validateProjectForm = (
  { name, projectCode } = {},
  { projectList = [], excludeId = null, isEdit = false } = {}
) => {
  let nameError =
    isRequired(name, "Project name is required.") ||
    minLength(name, 2, "Project name must be at least 2 characters long.");

  if (!nameError) {
    const duplicateMsg = isEdit
      ? "Another project with this name already exists."
      : "A project with this name already exists.";
    nameError = isUnique(name, projectList, "name", excludeId, duplicateMsg);
  }

  let codeError = isRequired(projectCode, "Project code is required.");

  if (!codeError) {
    const duplicateCodeMsg = isEdit
      ? "Another project with this code already exists."
      : "A project with this code already exists.";
    codeError = isUnique(
      projectCode,
      projectList,
      "projectCode",
      excludeId,
      duplicateCodeMsg
    );
  }

  return runValidation({ name: nameError, projectCode: codeError });
};
