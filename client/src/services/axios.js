import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach the Firebase ID token dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medpath_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and auth expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response received)
    if (!error.response) {
      const networkError = new Error(
        error.code === "ECONNABORTED"
          ? "Request timed out. Please check your connection and try again."
          : "Network unavailable. Please check your internet connection."
      );
      networkError.isNetworkError = true;
      networkError.originalError = error;
      return Promise.reject(networkError);
    }

    const { status } = error.response;

    // Authentication failure — token expired or invalid
    if (status === 401 || status === 403) {
      localStorage.removeItem("medpath_token");
      // Dispatch custom event so AuthContext can respond
      window.dispatchEvent(
        new CustomEvent("medpath:auth-expired", {
          detail: {
            status,
            message:
              status === 401
                ? "Your session has expired. Please sign in again."
                : "Access denied. Your account may be deactivated.",
          },
        })
      );
    }

    // Server error
    if (status >= 500) {
      const serverError = new Error(
        "The server encountered an error. Please try again in a moment."
      );
      serverError.status = status;
      serverError.originalError = error;
      return Promise.reject(serverError);
    }

    return Promise.reject(error);
  }
);

export default api;
