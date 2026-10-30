const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/audit-logs`;

const auditLogApi = {
  getAuditLogs: (
    facilityId,
    module = "",
    severity = "",
    search = "",
    page = 0,
    size = 10,
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    const params = new URLSearchParams();
    params.append("facilityId", facilityId);
    if (module && module !== "All Modules") params.append("module", module);
    if (severity && severity !== "All Severities") params.append("severity", severity);
    if (search && search.trim()) params.append("search", search.trim());
    params.append("page", page);
    params.append("size", size);
    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    return `${API_URL}?${params.toString()}`;
  },
  getAuditLogSummary: (facilityId) => `${API_URL}/summary?facilityId=${facilityId}`,
};

export default auditLogApi;
