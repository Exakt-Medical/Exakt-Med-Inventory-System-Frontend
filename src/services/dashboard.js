import axios from "axios";
import dashboardApi from "../api/dashboard";

import { getAuthHeaders } from "../context/authContext";

const dashboardService = {
  getPharmacistDashboard: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(
      dashboardApi.getPharmacistDashboard(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getProcurementDashboard: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(
      dashboardApi.getProcurementDashboard(pharmacyId),
      {
        ...config,
        headers: getAuthHeaders(config),
      },
    );
    return response.data;
  },

  getSummary: async (pharmacyId, config = {}) => {
    if (!pharmacyId) return null;
    const response = await axios.get(dashboardApi.getSummary(pharmacyId), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default dashboardService;
