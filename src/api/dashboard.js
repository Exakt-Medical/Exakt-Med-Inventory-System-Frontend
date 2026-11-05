const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/dashboard`;

const dashboardApi = {
  getPharmacistDashboard: (pharmacyId) =>
    pharmacyId
      ? `${API_URL}/pharmacist?pharmacyId=${pharmacyId}`
      : `${API_URL}/pharmacist`,
  getProcurementDashboard: (pharmacyId) =>
    pharmacyId
      ? `${API_URL}/procurement?pharmacyId=${pharmacyId}`
      : `${API_URL}/procurement`,
  getSummary: (pharmacyId) =>
    pharmacyId
      ? `${API_URL}/summary?pharmacyId=${pharmacyId}`
      : `${API_URL}/summary`,
};

export default dashboardApi;
