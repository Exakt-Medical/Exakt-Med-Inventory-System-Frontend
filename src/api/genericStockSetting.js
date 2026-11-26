const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/generic-stock-settings`;

const genericStockSettingApi = {
  getGroupedSkus: ({
    pharmacyId,
    search,
    status,
    stockStatus,
    page = 0,
    size = 10,
  }) => {
    const params = new URLSearchParams();
    if (pharmacyId) params.append("pharmacyId", pharmacyId);
    if (search && search.trim()) params.append("search", search.trim());
    if (status && status !== "ALL") params.append("status", status);
    if (stockStatus && stockStatus !== "ALL") params.append("stockStatus", stockStatus);
    params.append("page", page);
    params.append("size", size);
    return `${API_URL}/grouped?${params.toString()}`;
  },
  getSummary: (pharmacyId) => `${API_URL}/summary?pharmacyId=${pharmacyId}`,
  getReorderNeededSummary: (pharmacyId) =>
    `${API_URL}/reorder-needed/summary?pharmacyId=${pharmacyId}`,
  getReorderNeededGroups: ({
    pharmacyId,
    search,
    stockStatus = "ALL",
    page = 0,
    size = 10,
  }) => {
    const params = new URLSearchParams();
    if (pharmacyId) params.append("pharmacyId", pharmacyId);
    if (search && String(search).trim()) params.append("search", String(search).trim());
    if (stockStatus && stockStatus !== "ALL") params.append("stockStatus", stockStatus);
    params.append("page", page);
    params.append("size", size);
    return `${API_URL}/reorder-needed?${params.toString()}`;
  },
  getDropdown: (pharmacyId) => `${API_URL}/dropdown?pharmacyId=${pharmacyId}`,
  getActiveBrands: (settingId) => `${API_URL}/${settingId}/brands`,
  updateThresholds: (settingId) => `${API_URL}/${settingId}`,
  upsertThresholds: `${API_URL}`,
};

export default genericStockSettingApi;
