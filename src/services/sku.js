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

  getDropdownSkus: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(skuApi.getDropdownSkus(pharmacyId), {
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
};

export default skuService;
