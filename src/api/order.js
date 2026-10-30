const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/orders`;

const orderApi = {
  createOrder: `${API_URL}`,
  getOrders: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, val);
      }
    });
    return `${API_URL}?${searchParams.toString()}`;
  },

  getOrderSummary: (facilityId) => `${API_URL}/summary?facilityId=${facilityId}`,
  getReceivableOrders: (facilityId) => `${API_URL}/receivable?facilityId=${facilityId}`,
  getOrderById: (id) => `${API_URL}/${id}`,
  updateOrderStatus: (id) => `${API_URL}/${id}/status`,
};

export default orderApi;
