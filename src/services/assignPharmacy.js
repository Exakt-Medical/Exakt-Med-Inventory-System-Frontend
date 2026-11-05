import axios from "axios";
import assignPharmacyApi from "../api/assignPharmacy";

const getAuthHeaders = (config = {}) => {
  const token = localStorage.getItem("token");
  return {
    ...config.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeUserIds = (data) => {
  if (Array.isArray(data)) {
    return { userIds: data };
  }
  return data;
};

const assignPharmacyService = {
  assignUsersToPharmacy: async (pharmacyId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.post(
      assignPharmacyApi.assignUsersToPharmacy(pharmacyId),
      payload,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  unassignUsersFromPharmacy: async (pharmacyId, requestData, config = {}) => {
    const payload = normalizeUserIds(requestData);
    const response = await axios.delete(
      assignPharmacyApi.unassignUsersFromPharmacy(pharmacyId),
      {
        ...config,
        data: payload,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getMyAssignedPharmacies: async (config = {}) => {
    const response = await axios.get(
      assignPharmacyApi.getMyAssignedPharmacies,
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getUsersByPharmacyId: async (pharmacyId, config = {}) => {
    const response = await axios.get(
      assignPharmacyApi.getUsersByPharmacyId(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },
};

export default assignPharmacyService;

