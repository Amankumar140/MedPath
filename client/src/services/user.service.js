import api from "./axios";

export const userService = {
  /**
   * Fetch current user profile details
   */
  async getProfile() {
    const response = await api.get("/users/profile");
    return response.data;
  },

  /**
   * Update user profile settings (preferred language, name, etc.)
   * @param {Object} data - Profile fields to update
   */
  async updateProfile(data) {
    const response = await api.patch("/users/profile", data);
    return response.data;
  },

  /**
   * Deactivate current user profile
   */
  async deactivateProfile() {
    const response = await api.delete("/users/profile");
    return response.data;
  },
};

export default userService;
