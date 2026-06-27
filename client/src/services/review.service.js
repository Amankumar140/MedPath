import api from "./axios";

export const reviewService = {
  /**
   * Fetch Completed, Drafts, and Pending reviews for the current authenticated user
   */
  async getReviewsHistory() {
    const response = await api.get("/reviews/history");
    return response.data;
  },

  /**
   * Fetch reviews for a specific consultation ID
   * @param {string} conversationId - Conversation UUID
   */
  async getReviewsByConversationId(conversationId) {
    const response = await api.get(`/reviews/${conversationId}`);
    return response.data;
  },

  /**
   * Create a new review draft or completed review
   * @param {Object} data - Review details
   */
  async createReview(data) {
    const response = await api.post("/reviews", data);
    return response.data;
  },

  /**
   * Update a review draft or complete a review
   * @param {string} id - Review UUID
   * @param {Object} data - Review update details
   */
  async updateReview(id, data) {
    const response = await api.patch(`/reviews/${id}`, data);
    return response.data;
  },

  /**
   * Delete a review draft or completed review
   * @param {string} id - Review UUID
   */
  async deleteReview(id) {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
};

export default reviewService;
