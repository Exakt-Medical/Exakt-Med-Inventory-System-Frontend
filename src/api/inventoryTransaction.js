const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/inventory-transactions`;
const SKU_API_URL = `${BASE_URL}/api/skus`;

const inventoryTransactionApi = {
  // Ledger (Bin Card) endpoints
  getLedger: (skuId, facilityId, startDate, endDate) => {
    let url = `${API_URL}/ledger?facilityId=${facilityId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Backward compatibility alias for Bin Card
  getSkuBinCard: (skuId, facilityId, startDate, endDate) => {
    let url = `${API_URL}/ledger?facilityId=${facilityId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Transaction list endpoints
  getTransactionsByFacility: (
    facilityId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}?facilityId=${facilityId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  getTransactionsBySku: (
    skuId,
    facilityId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}/sku/${skuId}?facilityId=${facilityId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  // Stock Adjustment endpoints
  adjustStock: (id) => `${SKU_API_URL}/${id}/adjust-stock`,

  getAdjustmentLogsByFacility: (
    facilityId,
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}?facilityId=${facilityId}&types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  getAdjustmentLogsBySku: (
    skuId,
    facilityId,
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}/sku/${skuId}?facilityId=${facilityId}&types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  // KPI Summary endpoints
  getTransactionSummary: (facilityId, types = []) => {
    let url = `${API_URL}/summary?facilityId=${facilityId}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    return url;
  },

  getAdjustmentSummary: (facilityId) => {
    return `${API_URL}/summary?facilityId=${facilityId}&types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE`;
  },
};

export default inventoryTransactionApi;
