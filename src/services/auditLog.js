import axios from "axios";
import auditLogApi from "../api/auditLog";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const auditLogService = {
  getAuditLogs: async (
    pharmacyId,
    module = "",
    severity = "",
    search = "",
    page = 0,
    size = 10,
    sortBy = "createdAt",
    sortDir = "DESC",
    config = {},
  ) => {
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is strictly required to fetch audit logs.");
    }
    const response = await axios.get(
      auditLogApi.getAuditLogs(pharmacyId, module, severity, search, page, size, sortBy, sortDir),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getAuditLogSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is strictly required to fetch audit log summary.");
    }
    const response = await axios.get(
      auditLogApi.getAuditLogSummary(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default auditLogService;
