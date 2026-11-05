const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/batches`;

const batchApi = {
  receiveBatch: `${API_URL}`,
  receiveBatchesBulk: `${API_URL}/bulk`,
  getBatchById: (id) => `${API_URL}/${id}`,
  getBatchesPaginated: ({
    pharmacyId,
    search,
    status,
    sku,
    expiryFilter,
    page = 0,
    size = 10,
    sortBy = "receivedAt",
    sortDir = "DESC",
  }) => {
    let url = `${API_URL}?pharmacyId=${pharmacyId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`;
    if (search && search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    if (status && status !== "ALL") url += `&status=${encodeURIComponent(status)}`;
    if (sku && sku !== "ALL") url += `&sku=${encodeURIComponent(sku)}`;
    if (expiryFilter && expiryFilter !== "ALL") url += `&expiryFilter=${encodeURIComponent(expiryFilter)}`;
    return url;
  },
  getBatchSummary: (pharmacyId) => `${API_URL}/summary?pharmacyId=${pharmacyId}`,
  getDistinctBatchSkus: (pharmacyId) => `${API_URL}/skus?pharmacyId=${pharmacyId}`,
  updateBatchStatus: (id) => `${API_URL}/${id}/status`,
  releaseBatch: (id) => `${API_URL}/${id}/release`,
  getBatchesBySku: (skuId, pharmacyId) => {
    return `${API_URL}/sku/${skuId}?pharmacyId=${pharmacyId}`;
  },
  processExpiredBatches: (pharmacyId, skuId) => {
    return `${API_URL}/process-expired?pharmacyId=${pharmacyId}&skuId=${skuId}`;
  },
  updateBatchLocation: (id, locationId) => {
    let url = `${API_URL}/${id}/location`;
    if (locationId) url += `?locationId=${locationId}`;
    return url;
  },
};

export default batchApi;
