import api from "./axios";

export const systemService = {
  /**
   * Check Python AI microservice health and retrieve runtime metrics
   */
  async getPythonHealth() {
    const response = await api.get("/system/python-health");
    return response.data;
  },
};

export default systemService;
