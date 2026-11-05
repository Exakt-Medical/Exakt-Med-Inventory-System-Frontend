import axios from "axios";
import restockRequestApi from "../api/restockRequest";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const restockRequestService = {
  createRestockRequest: async (requestData, config = {}) => {
    const response = await axios.post(
      restockRequestApi.createRequest,
      requestData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getAllRestockRequests: async (
    pharmacyId = null,
    pendingOnly = false,
    config = {},
  ) => {
    if (!pharmacyId) return [];
    const response = await axios.get(
      restockRequestApi.getAllRequests(pharmacyId, pendingOnly),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getRestockRequestById: async (id, config = {}) => {
    const response = await axios.get(restockRequestApi.getRequestById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default restockRequestService;
