import api from "./axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const conversationService = {
  /**
   * Create a new conversation session
   * @param {string} [title] - Conversation title
   */
  async createConversation(title) {
    const response = await api.post("/conversations", { title });
    return response.data;
  },

  /**
   * List all active conversations for the authenticated user
   */
  async listConversations() {
    const response = await api.get("/conversations");
    return response.data;
  },

  /**
   * Fetch full conversation details (metadata, messages, patientContext, recommendationSnapshots)
   * @param {string} id - Conversation UUID
   */
  async getConversationDetails(id) {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  /**
   * Soft delete a conversation
   * @param {string} id - Conversation UUID
   */
  async softDeleteConversation(id) {
    const response = await api.delete(`/conversations/${id}`);
    return response.data;
  },

  /**
   * Send a message to a conversation and stream the Server-Sent Events (SSE) response
   * @param {string} id - Conversation UUID
   * @param {string} message - Message text to send
   * @param {function} onChunk - Callback triggered on each streamed JSON payload chunk
   * @param {function} onEnd - Callback triggered when the stream finishes successfully
   * @param {function} onError - Callback triggered on errors
   */
  async sendMessageStream(id, message, onChunk, onEnd, onError) {
    try {
      const token = localStorage.getItem("medpath_token");
      const response = await fetch(`${BASE_URL}/conversations/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to send message: Status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body available for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        // Server sends chunks separated by double newlines \n\n
        const messages = buffer.split("\n\n");
        // Maintain trailing incomplete chunk in buffer
        buffer = messages.pop() || "";

        for (const rawMessage of messages) {
          if (!rawMessage.trim()) continue;

          // Parse event types if present
          const eventLineMatch = rawMessage.match(/^event:\s*(.*)$/m);
          const dataLineMatch = rawMessage.match(/^data:\s*(.*)$/m);

          const eventName = eventLineMatch ? eventLineMatch[1].trim() : null;
          const dataContent = dataLineMatch ? dataLineMatch[1].trim() : null;

          if (eventName === "end" || dataContent === "Stream complete") {
            onEnd();
            return;
          }

          if (eventName === "error") {
            onError(new Error(dataContent || "Server-Sent Event error occurred"));
            return;
          }

          if (dataContent) {
            try {
              const parsedData = JSON.parse(dataContent);
              onChunk(parsedData);
            } catch {
              // Ignore parse errors for raw status strings or incomplete lines
            }
          }
        }
      }

      // Stream closed by remote without explicit end message
      onEnd();
    } catch (error) {
      onError(error);
    }
  },
};

export default conversationService;
