import axios from "axios";
import genericStockSettingApi from "../api/genericStockSetting";
import { getAuthHeaders } from "../context/authContext";

const genericStockSettingService = {
  getGroupedSkus: async (params, config = {}) => {
    if (!params?.pharmacyId) {
      return { content: [], totalPages: 1, totalElements: 0, currentPage: 1 };
    }
    const response = await axios.get(genericStockSettingApi.getGroupedSkus(params), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(genericStockSettingApi.getSummary(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getReorderNeededSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(
      genericStockSettingApi.getReorderNeededSummary(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getReorderNeededGroups: async (params, config = {}) => {
    if (!params?.pharmacyId) {
      return { content: [], totalPages: 1, totalElements: 0, currentPage: 1 };
    }
    const response = await axios.get(
      genericStockSettingApi.getReorderNeededGroups(params),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getDropdown: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(genericStockSettingApi.getDropdown(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getActiveBrands: async (settingId, config = {}) => {
    if (!settingId) return [];
    const response = await axios.get(
      genericStockSettingApi.getActiveBrands(settingId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  updateThresholds: async (settingId, payload, config = {}) => {
    const response = await axios.put(
      genericStockSettingApi.updateThresholds(settingId),
      payload,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  upsertThresholds: async (payload, config = {}) => {
    const response = await axios.put(
      genericStockSettingApi.upsertThresholds,
      payload,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default genericStockSettingService;
