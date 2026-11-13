import axios from "axios";
import batchApi from "../api/batch";

import { getAuthHeaders } from "../context/authContext";

const batchService = {
  getBatchesPaginated: async (params, config = {}) => {
    const pharmacyId = params?.pharmacyId;
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to fetch batches.");
    }
    const { facilityId, ...cleanParams } = params || {};
    const response = await axios.get(
      batchApi.getBatchesPaginated({ ...cleanParams, pharmacyId }),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getBatchSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(batchApi.getBatchSummary(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getDistinctBatchSkus: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(batchApi.getDistinctBatchSkus(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getBatchById: async (id, config = {}) => {
    const response = await axios.get(batchApi.getBatchById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  receiveBatch: async (batchData, config = {}) => {
    const response = await axios.post(batchApi.receiveBatch, batchData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  receiveBatchesBulk: async (batchesList, config = {}) => {
    const response = await axios.post(
      batchApi.receiveBatchesBulk,
      batchesList,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  updateBatchStatus: async (id, status, notes = null, config = {}) => {
    let url =
      batchApi.updateBatchStatus(id) + `?status=${encodeURIComponent(status)}`;
    if (notes) {
      url += `&notes=${encodeURIComponent(notes)}`;
    }
    const response = await axios.patch(url, null, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  releaseBatchFromQuarantine: async (id, releaseData, config = {}) => {
    const response = await axios.post(
      batchApi.releaseBatch(id),
      releaseData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getBatchesBySku: async (skuId, pharmacyId, config = {}) => {
    if (!skuId || !pharmacyId) return [];
    const response = await axios.get(
      batchApi.getBatchesBySku(skuId, pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  processExpiredBatches: async (pharmacyId, skuId, config = {}) => {
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to process expired batches.");
    }
    if (!skuId) {
      throw new Error("SKU ID is required to process expired batches.");
    }
    const response = await axios.post(
      batchApi.processExpiredBatches(pharmacyId, skuId),
      null,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  updateBatchLocation: async (id, locationId, config = {}) => {
    const response = await axios.patch(
      batchApi.updateBatchLocation(id, locationId),
      null,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default batchService;
