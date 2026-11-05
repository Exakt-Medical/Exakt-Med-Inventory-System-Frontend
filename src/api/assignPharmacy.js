const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/assign/pharmacies`;

const assignPharmacyApi = {
  assignUsersToPharmacy: (pharmacyId) => `${API_URL}/${pharmacyId}`,
  unassignUsersFromPharmacy: (pharmacyId) => `${API_URL}/${pharmacyId}`,
  getMyAssignedPharmacies: `${API_URL}/my-pharmacies`,
  getUsersByPharmacyId: (pharmacyId) => `${API_URL}/${pharmacyId}/users`,
};

export default assignPharmacyApi;

