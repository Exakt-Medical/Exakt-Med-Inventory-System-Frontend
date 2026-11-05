import axios from "axios";
import pharmacyApi from "../api/pharmacy";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const pharmacyService = {
  getAllPharmacies: async (config = {}) => {
    const response = await axios.get(pharmacyApi.getAllPharmacies, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getPharmaciesByFacilityId: async (facilityId, config = {}) => {
    const url = facilityId
      ? pharmacyApi.getPharmaciesByFacilityId(facilityId)
      : pharmacyApi.getAllPharmacies;
    const response = await axios.get(url, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  getPharmacyById: async (id, config = {}) => {
    const response = await axios.get(pharmacyApi.getPharmacyById(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  createPharmacy: async (pharmacyData, config = {}) => {
    const response = await axios.post(pharmacyApi.createPharmacy, pharmacyData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updatePharmacy: async (id, pharmacyData, config = {}) => {
    const response = await axios.put(pharmacyApi.updatePharmacy(id), pharmacyData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deletePharmacy: async (id, config = {}) => {
    const response = await axios.delete(pharmacyApi.deletePharmacy(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default pharmacyService;

