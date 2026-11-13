import axios from "axios";
import skuApi from "../api/sku";

import { getAuthHeaders } from "../context/authContext";

const skuService = {
  createSku: async (skuData, config = {}) => {
    const response = await axios.post(skuApi.createSku, skuData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSkusPaginated: async (
    paramsOrPharmacyId,
    maybeSearch = "",
    maybeStatus = "ALL",
    maybePage = 0,
    maybeSize = 10,
    config = {},
  ) => {
    let params;
    if (typeof paramsOrPharmacyId === "object" && paramsOrPharmacyId !== null) {
      params = {
        ...paramsOrPharmacyId,
        pharmacyId: paramsOrPharmacyId.pharmacyId,
        sortBy: paramsOrPharmacyId.sortBy || "genericName",
        sortDir: paramsOrPharmacyId.sortDir || "ASC",
      };
      delete params.facilityId;
    } else {
      params = {
        pharmacyId: paramsOrPharmacyId,
        search: maybeSearch,
        status: maybeStatus,
        page: maybePage,
        size: maybeSize,
        sortBy: "genericName",
        sortDir: "ASC",
      };
    }

    if (!params?.pharmacyId) {
      return { content: [], totalPages: 1, totalElements: 0, currentPage: 1 };
    }

    const response = await axios.get(skuApi.getSkusPaginated(params), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSkuSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(skuApi.getSkuSummary(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getReorderNeededSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(
      skuApi.getReorderNeededSummary(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getDropdownSkus: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(skuApi.getDropdownSkus(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSkuById: async (id, config = {}) => {
    const response = await axios.get(skuApi.getSkuById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateSku: async (id, skuData, config = {}) => {
    const response = await axios.put(skuApi.updateSku(id), skuData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteSku: async (id, config = {}) => {
    const response = await axios.delete(skuApi.deleteSku(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  reactivateSku: async (id, config = {}) => {
    const response = await axios.patch(skuApi.reactivateSku(id), {}, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  adjustStock: async (id, adjustmentData, config = {}) => {
    const response = await axios.patch(skuApi.adjustStock(id), adjustmentData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getReorderNeededSkus: async (
    paramsOrPharmacyId,
    search = "",
    stockStatus = "ALL",
    config = {},
  ) => {
    let effectivePharmacyId;
    let requestUrl;
    let requestConfig = config;

    if (paramsOrPharmacyId && typeof paramsOrPharmacyId === "object") {
      effectivePharmacyId = paramsOrPharmacyId.pharmacyId;
      requestUrl = skuApi.getReorderNeededSkus(paramsOrPharmacyId);
      if (search && typeof search === "object") {
        requestConfig = search;
      }
    } else {
      effectivePharmacyId = paramsOrPharmacyId;
      if (stockStatus && typeof stockStatus === "object") {
        requestConfig = stockStatus;
        requestUrl = skuApi.getReorderNeededSkus(
          paramsOrPharmacyId,
          search,
          "ALL",
        );
      } else {
        requestUrl = skuApi.getReorderNeededSkus(
          paramsOrPharmacyId,
          search,
          stockStatus,
        );
      }
    }

    if (!effectivePharmacyId) {
      return {
        content: [],
        currentPage: 1,
        totalPages: 1,
        totalElements: 0,
        pageSize: 10,
        isLast: true,
      };
    }

    const response = await axios.get(requestUrl, {
      ...requestConfig,
      headers: getAuthHeaders(requestConfig),
    });
    return response.data;
  },
};

export default skuService;
