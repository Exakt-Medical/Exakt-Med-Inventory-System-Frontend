const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_URL = `${BASE_URL}/api/reorder-quotations`;

const reorderQuotationApi = {
  createQuotation: `${API_URL}`,
  getQuotations: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, val);
      }
    });
    return `${API_URL}?${searchParams.toString()}`;
  },
  getQuotationById: (id) => `${API_URL}/${id}`,
  updateQuotation: (id) => `${API_URL}/${id}`,
  convertToOrder: (id) => `${API_URL}/${id}/convert-to-order`,
  rejectQuotation: (id) => `${API_URL}/${id}/reject`,
  cancelQuotation: (id) => `${API_URL}/${id}/cancel`,
};

export default reorderQuotationApi;

