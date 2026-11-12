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
  getReorderNeededSummary: (pharmacyId) =>
    `${API_URL}/reorder-needed/summary?pharmacyId=${pharmacyId}`,
  getDropdownSkus: (pharmacyId) => `${API_URL}/dropdown?pharmacyId=${pharmacyId}`,
  getSkuById: (id) => `${API_URL}/${id}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
  reactivateSku: (id) => `${API_URL}/${id}/reactivate`,
  adjustStock: (id) => `${API_URL}/${id}/adjust-stock`,
  getReorderNeededSkus: (
    paramsOrPharmacyId,
    search = "",
    stockStatus = "ALL",
    page = 0,
    size = 10,
    sortBy = "genericName",
    sortDir = "ASC",
  ) => {
    const params = new URLSearchParams();
    if (paramsOrPharmacyId && typeof paramsOrPharmacyId === "object") {
      const {
        pharmacyId,
        search: q,
        stockStatus: ss,
        urgency,
        filter,
        page: p = 0,
        size: s = 10,
        sortBy: sb = "genericName",
        sortDir: sd = "ASC",
      } = paramsOrPharmacyId;
      if (pharmacyId) params.append("pharmacyId", pharmacyId);
      if (q && String(q).trim()) params.append("search", String(q).trim());
      const effectiveStockStatus = urgency || filter || ss || "ALL";
      params.append("stockStatus", effectiveStockStatus);
      params.append("page", p);
      params.append("size", s);
      params.append("sortBy", sb);
      params.append("sortDir", sd);
    } else {
      if (paramsOrPharmacyId) params.append("pharmacyId", paramsOrPharmacyId);
      if (search && String(search).trim())
        params.append("search", String(search).trim());
      params.append("stockStatus", stockStatus || "ALL");
      params.append("page", page);
      params.append("size", size);
      params.append("sortBy", sortBy);
      params.append("sortDir", sortDir);
    }
    return `${API_URL}/reorder-needed?${params.toString()}`;
  },
};

export default skuApi;
