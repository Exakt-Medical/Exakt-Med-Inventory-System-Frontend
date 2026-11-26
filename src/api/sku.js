const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/skus`;

const skuApi = {
  createSku: `${API_URL}`,
  getDropdownSkus: (pharmacyId) => `${API_URL}/dropdown?pharmacyId=${pharmacyId}`,
  updateSku: (id) => `${API_URL}/${id}`,
  deleteSku: (id) => `${API_URL}/${id}`,
  reactivateSku: (id) => `${API_URL}/${id}/reactivate`,
  adjustStock: (id) => `${API_URL}/${id}/adjust-stock`,
};

export default skuApi;
