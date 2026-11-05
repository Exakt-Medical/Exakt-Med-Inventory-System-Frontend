const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/pharmacies`;

const pharmacyApi = {
  createPharmacy: `${API_URL}`,
  getAllPharmacies: `${API_URL}`,
  getPharmaciesByFacilityId: (facilityId) => `${API_URL}?facilityId=${facilityId}`,
  getPharmacyById: (id) => `${API_URL}/${id}`,
  updatePharmacy: (id) => `${API_URL}/${id}`,
  deletePharmacy: (id) => `${API_URL}/${id}`,
};

export default pharmacyApi;

