import api from "./axios";

export const locationService = {
  /**
   * List all saved locations for the authenticated user.
   */
  async listLocations() {
    const response = await api.get("/locations");
    return response.data;
  },

  /**
   * Create a new saved location.
   * @param {Object} data - Location data (label, formattedAddress, latitude, longitude, etc.)
   */
  async createLocation(data) {
    const response = await api.post("/locations", data);
    return response.data;
  },

  /**
   * Update an existing saved location.
   * @param {string} id - Location UUID
   * @param {Object} data - Fields to update
   */
  async updateLocation(id, data) {
    const response = await api.patch(`/locations/${id}`, data);
    return response.data;
  },

  /**
   * Delete a saved location.
   * @param {string} id - Location UUID
   */
  async deleteLocation(id) {
    const response = await api.delete(`/locations/${id}`);
    return response.data;
  },

  /**
   * Reverse geocode GPS coordinates into a structured address.
   * @param {number} latitude - GPS latitude
   * @param {number} longitude - GPS longitude
   */
  async resolveCurrentLocation(latitude, longitude) {
    const response = await api.post("/location/current", { latitude, longitude });
    return response.data;
  },
};

export default locationService;
