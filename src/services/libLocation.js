import axios from "axios";
import libLocationApi from "../api/libLocation";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const libLocationService = {
  getAllLocations: async (params = {}, config = {}) => {
    const pharmacyId = params?.pharmacyId;
    if (!pharmacyId) return [];
    const { facilityId, ...cleanParams } = params;
    const response = await axios.get(
      libLocationApi.getAllLocations({ ...cleanParams, pharmacyId }),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getLocationById: async (id, config = {}) => {
    const response = await axios.get(libLocationApi.getLocationById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createLocation: async (locationData, config = {}) => {
    const response = await axios.post(
      libLocationApi.createLocation,
      locationData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  updateLocation: async (id, locationData, config = {}) => {
    const response = await axios.put(
      libLocationApi.updateLocation(id),
      locationData,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  deleteLocation: async (id, config = {}) => {
    const response = await axios.delete(libLocationApi.deleteLocation(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  suggestCode: async (storageType, pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(
      libLocationApi.suggestCode(storageType, pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default libLocationService;
