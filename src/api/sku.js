const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getSkusPaginated: ({
    pharmacyId,
    search,
    status,
    stockFilter,
    page = 0,
    size = 10,
    sortBy = "brandName",
    sortDir = "ASC",
  }) => {
    let url = `${API_URL}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    const filterValue = status || stockFilter;
    if (filterValue && filterValue !== "ALL") url += `&status=${encodeURIComponent(filterValue)}`;
    return url;
  },
  getSkuSummary: (pharmacyId) => `${API_URL}/summary?pharmacyId=${pharmacyId}`,
  getDropdownSkus: (pharmacyId) => `${API_URL}/dropdown?pharmacyId=${pharmacyId}`,
  getSkuById: (id) => `${API_URL}/${id}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
  adjustStock: (id) => `${API_URL}/${id}/adjust-stock`,
  getReorderNeededSkus: (pharmacyId, search = "") => {
    const params = new URLSearchParams();
    params.append("pharmacyId", pharmacyId);
    if (search) params.append("search", search);
    return `${API_URL}/reorder-needed?${params.toString()}`;
  },
};

export default skuApi;
