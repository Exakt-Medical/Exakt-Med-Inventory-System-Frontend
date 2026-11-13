import axios from "axios";
import dispensedLogApi from "../api/dispensedLog";

import { getAuthHeaders } from "../context/authContext";

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
