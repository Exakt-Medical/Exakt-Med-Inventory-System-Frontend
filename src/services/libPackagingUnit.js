import axios from "axios";
import libPackagingUnitApi from "../api/libPackagingUnit";

import { getAuthHeaders } from "../context/authContext";

const libPackagingUnitService = {
  getAll: async (category, config = {}) => {
    const response = await axios.get(libPackagingUnitApi.getAll(category), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default libPackagingUnitService;
