import axios from "axios";
import dispensedLogApi from "../api/dispensedLog";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const dispensedLogService = {
  getAll: async (pharmacyId = null, status = null, config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(
      dispensedLogApi.getAll(pharmacyId, status),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getById: async (id, config = {}) => {
    const response = await axios.get(dispensedLogApi.getById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  markAsReceived: async (id, config = {}) => {
    const response = await axios.patch(
      dispensedLogApi.markAsReceived(id),
      {},
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default dispensedLogService;
