import axios from "axios";

const DEV_SERVER_IP = "10.47.147.234";
const PORT = 5000;

export const API_BASE_URL = `http://${DEV_SERVER_IP}:${PORT}`;

console.log("🌐 Using backend at:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 30000, // Increased from 10s to 30s to accommodate geocoding retries
  headers: {
    Accept: "application/json",
  },
});

// Debug: log the API base so we can verify the app is using the correct host
try {
  // eslint-disable-next-line no-console
  console.log("[api] API_BASE_URL =", API_BASE_URL);
} catch (e) {}

// Log outgoing requests for easier debugging on device
api.interceptors.request.use((config) => {
  try {
    // eslint-disable-next-line no-console
    console.log(
      "[api] request",
      config.method,
      config.url,
      config.baseURL || API_BASE_URL
    );
  } catch (e) {}
  return config;
});

// Detailed response error logging to help diagnose network issues on device
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      // eslint-disable-next-line no-console
      console.log("[api] response error", {
        message: error.message,
        code: error.code,
        config: error.config && {
          method: error.config.method,
          url: error.config.url,
        },
        response: error.response && {
          status: error.response.status,
          data: error.response.data,
        },
      });
    } catch (e) {}
    return Promise.reject(error);
  }
);

// Quick startup probe to /health so we can see connectivity immediately in device logs
(async () => {
  try {
    const res = await api.get("/health");
    // eslint-disable-next-line no-console
    console.log("[api] health ok", res.data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("[api] health check failed", err.message || err);
  }
})();

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (no response from server)
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        return Promise.reject(
          new Error("Request timeout. The server may be slow or unreachable.")
        );
      }
      if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
        const apiUrl = API_BASE_URL;
        return Promise.reject(
          new Error(
            `Cannot connect to server at ${apiUrl}. ` +
              "Please ensure:\n" +
              "1. Backend server is running (npm run dev)\n" +
              "2. Tunnel is running if using localtunnel (npm run tunnel)\n" +
              "3. Check your internet connection"
          )
        );
      }
      return Promise.reject(new Error(`Connection error: ${error.message}`));
    }

    // Handle HTTP status codes
    const { data, status } = error.response;

    // Handle 503 Service Unavailable
    if (status === 503) {
      return Promise.reject(
        new Error(
          "Service unavailable (503). " +
            "The backend server may be down or overloaded. " +
            "Please check if the server is running."
        )
      );
    }

    // Handle 404 Not Found
    if (status === 404) {
      return Promise.reject(
        new Error(
          `Endpoint not found (404). ` +
            `Check if the API URL is correct: ${API_BASE_URL}`
        )
      );
    }

    // Handle validation errors (express-validator format)
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Extract validation error messages
      const errorMessages = data.errors.map((err) => {
        // express-validator uses 'msg' property
        return (
          err.msg ||
          err.message ||
          `${err.param}: ${err.msg || "validation failed"}`
        );
      });
      return Promise.reject(new Error(errorMessages.join(". ")));
    }

    // Handle standard error messages
    const message =
      data?.message || data?.error || `Request failed with status ${status}`;
    return Promise.reject(new Error(message));
  }
);

export default api;
