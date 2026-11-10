const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getSkusPaginated: ({
    pharmacyId,
    search,
    status,
    stockStatus,
    stockFilter,
    page = 0,
    size = 10,
    sortBy = "genericName",
    sortDir = "ASC",
  }) => {
    let url = `${API_URL}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    if (status && status !== "ALL") url += `&status=${encodeURIComponent(status)}`;
    const effectiveStockStatus = stockStatus || stockFilter;
    if (effectiveStockStatus && effectiveStockStatus !== "ALL") {
      url += `&stockStatus=${encodeURIComponent(effectiveStockStatus)}`;
    }
    return url;
  },
  getSkuSummary: (pharmacyId) => `${API_URL}/summary?pharmacyId=${pharmacyId}`,
  getDropdownSkus: (pharmacyId) => `${API_URL}/dropdown?pharmacyId=${pharmacyId}`,
  getSkuById: (id) => `${API_URL}/${id}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
  reactivateSku: (id) => `${API_URL}/${id}/reactivate`,
  adjustStock: (id) => `${API_URL}/${id}/adjust-stock`,
  getReorderNeededSkus: (pharmacyId, search = "") => {
    const params = new URLSearchParams();
    params.append("pharmacyId", pharmacyId);
    if (search) params.append("search", search);
    return `${API_URL}/reorder-needed?${params.toString()}`;
  },
};

export default skuApi;
