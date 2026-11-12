import axios from "axios";
import reorderQuotationApi from "../api/reorderQuotation";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const reorderQuotationService = {
  createQuotation: async (quotationData, config = {}) => {
    const response = await axios.post(
      reorderQuotationApi.createQuotation,
      quotationData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getQuotationsPaginated: async (params = {}, config = {}) => {
    const pharmacyId = params?.pharmacyId;
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to fetch quotations.");
    }
    const response = await axios.get(
      reorderQuotationApi.getQuotations(params),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getQuotationById: async (id, config = {}) => {
    const response = await axios.get(reorderQuotationApi.getQuotationById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateQuotation: async (id, quotationData, config = {}) => {
    const response = await axios.put(
      reorderQuotationApi.updateQuotation(id),
      quotationData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  convertToOrder: async (id, convertData = {}, config = {}) => {
    const response = await axios.post(
      reorderQuotationApi.convertToOrder(id),
      convertData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  rejectQuotation: async (id, rejectData, config = {}) => {
    const response = await axios.put(
      reorderQuotationApi.rejectQuotation(id),
      rejectData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  cancelQuotation: async (id, config = {}) => {
    const response = await axios.put(
      reorderQuotationApi.cancelQuotation(id),
      {},
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default reorderQuotationService;

