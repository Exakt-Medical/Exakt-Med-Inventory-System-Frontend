import axios from "axios";
import patientApi from "../api/patient";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const patientService = {
  getAll: async (pharmacyId, search = "", config = {}) => {
    if (!pharmacyId) return [];
    const response = await axios.get(patientApi.getAll(pharmacyId, search), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getById: async (id, config = {}) => {
    const response = await axios.get(patientApi.getById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  create: async (data, config = {}) => {
    const response = await axios.post(patientApi.create, data, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  update: async (id, data, config = {}) => {
    const response = await axios.put(patientApi.update(id), data, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  delete: async (id, config = {}) => {
    const response = await axios.delete(patientApi.delete(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default patientService;

