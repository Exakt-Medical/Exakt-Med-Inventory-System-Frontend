import axios from "axios";
import orderApi from "../api/order";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const orderService = {
  createOrder: async (orderData, config = {}) => {
    const response = await axios.post(orderApi.createOrder, orderData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getOrdersPaginated: async (params, config = {}) => {
    const pharmacyId = params?.pharmacyId ?? params?.facilityId;
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to fetch orders.");
    }
    const normalizedParams = { ...params, pharmacyId };
    delete normalizedParams.facilityId;
    const response = await axios.get(orderApi.getOrders(normalizedParams), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getOrderSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to fetch order summary.");
    }
    const response = await axios.get(orderApi.getOrderSummary(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getReceivableOrders: async (pharmacyId, config = {}) => {
    if (!pharmacyId) {
      throw new Error("Pharmacy ID is required to fetch receivable orders.");
    }
    const response = await axios.get(orderApi.getReceivableOrders(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getOrderById: async (id, config = {}) => {
    const response = await axios.get(orderApi.getOrderById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateOrderStatus: async (id, status, notes = null, config = {}) => {
    const params = { status };
    if (notes) {
      params.notes = notes;
    }
    const response = await axios.patch(orderApi.updateOrderStatus(id), null, {
      ...config,
      params,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default orderService;
