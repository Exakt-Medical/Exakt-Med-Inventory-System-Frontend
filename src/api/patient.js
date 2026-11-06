const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/patients`;

const patientApi = {
  create: API_URL,
  getAll: (pharmacyId, search = "") => {
    const params = new URLSearchParams();
    if (pharmacyId) params.append("pharmacyId", pharmacyId);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return queryString ? `${API_URL}?${queryString}` : API_URL;
  },
  getById: (id) => `${API_URL}/${id}`,
  update: (id) => `${API_URL}/${id}`,
  delete: (id) => `${API_URL}/${id}`,
};

export default patientApi;

