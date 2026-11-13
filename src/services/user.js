import axios from "axios";
import userApi from "../api/user";

import { getAuthHeaders } from "../context/authContext";

const userService = {
  getAllUsers: async (config = {}) => {
    const response = await axios.get(userApi.getAllUsers, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },


  createUser: async (userData, config = {}) => {
    const response = await axios.post(userApi.createUser, userData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  updateUser: async (id, userData, config = {}) => {
    const response = await axios.put(userApi.updateUser(id), userData, {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },

  deleteUser: async (id, config = {}) => {
    const response = await axios.delete(userApi.deleteUser(id), {
      ...config,
      headers: getAuthHeaders(config),
    });
    return response.data;
  },
};

export default userService;
