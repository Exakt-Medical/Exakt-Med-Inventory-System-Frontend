const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/inventory-transactions`;
const SKU_API_URL = `${BASE_URL}/api/skus`;

const inventoryTransactionApi = {
  // Ledger (Bin Card) endpoints
  getLedger: (skuId, pharmacyId, startDate, endDate) => {
    let url = `${API_URL}/ledger?pharmacyId=${pharmacyId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Backward compatibility alias for Bin Card
  getSkuBinCard: (skuId, pharmacyId, startDate, endDate) => {
    let url = `${API_URL}/ledger?pharmacyId=${pharmacyId}&skuId=${skuId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  },

  // Transaction list endpoints
  getTransactionsByPharmacy: (
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  getTransactionsByFacility: (
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    return inventoryTransactionApi.getTransactionsByPharmacy(
      pharmacyId,
      types,
      page,
      size,
      search,
      sortBy,
      sortDir,
    );
  },

  getTransactionsBySku: (
    skuId,
    pharmacyId,
    types = [],
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}/sku/${skuId}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
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

  getAdjustmentLogsByPharmacy: (
    pharmacyId,
    types = "ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE",
    reason = "",
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (types) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    if (reason && reason !== "ALL") {
      url += `&reason=${encodeURIComponent(reason)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  getAdjustmentLogsByFacility: (
    pharmacyId,
    types = "ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE",
    reason = "",
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    return inventoryTransactionApi.getAdjustmentLogsByPharmacy(
      pharmacyId,
      types,
      reason,
      page,
      size,
      search,
      sortBy,
      sortDir,
    );
  },

  getAdjustmentReasons: (pharmacyId, types = "ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE") => {
    let url = `${API_URL}/reasons?pharmacyId=${pharmacyId}`;
    if (types) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    return url;
  },

  getAdjustmentLogsBySku: (
    skuId,
    pharmacyId,
    types = "ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE",
    reason = "",
    page = 0,
    size = 10,
    search = "",
    sortBy = "createdAt",
    sortDir = "DESC",
  ) => {
    let url = `${API_URL}/sku/${skuId}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (types) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    if (reason && reason !== "ALL") {
      url += `&reason=${encodeURIComponent(reason)}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return url;
  },

  // KPI Summary endpoints
  getTransactionSummary: (pharmacyId, types = []) => {
    let url = `${API_URL}/summary?pharmacyId=${pharmacyId}`;
    if (types && types.length > 0) {
      const typeParams = Array.isArray(types) ? types.join(",") : types;
      url += `&types=${encodeURIComponent(typeParams)}`;
    }
    return url;
  },

  getAdjustmentSummary: (pharmacyId) => {
    return `${API_URL}/summary?pharmacyId=${pharmacyId}&types=ADJUSTMENT_ADD,ADJUSTMENT_SUB,DISPENSE`;
  },
};

export default inventoryTransactionApi;
