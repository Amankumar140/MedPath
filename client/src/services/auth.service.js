import api from "./axios";

export const authService = {
  /**
   * Verify Firebase token and log in to backend database
   * @param {string} idToken - Firebase ID token
   */
  async loginWithToken(idToken) {
    const response = await api.post("/auth/login", { idToken });
    return response.data;
  },

  /**
   * Logout session (stateless backend notification)
   */
  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  /**
   * Retrieve current user profile based on active session
   */
  async getMe() {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export default authService;
