import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ml-service (see ml-service/) — separate Python microservice, called
// directly from the admin UI for the Model Comparison page.
const ML_SERVICE_URL =
  import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  // Do not set a global Content-Type header here. When sending
  // FormData (file uploads) we must allow axios to set the
  // multipart/form-data boundary automatically. Setting a
  // global Content-Type to application/json prevents that and
  // causes multer to not parse file uploads correctly.
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors. Only redirect to the login
// screen for requests that were actually sent with a token — the public
// report form calls unauthenticated endpoints and shouldn't be bounced to
// an admin login page if the server ever returns a 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

// Admin authentication
export const adminAuth = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },
};

// Issues API
export const issuesAPI = {
  // Public — no auth required. Used by the citizen-facing report form.
  create: async ({ title, description, latitude, longitude, imageFile, skipMetadataCheck }) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (skipMetadataCheck) {
      formData.append("skip_metadata_check", "true");
    }
    const response = await api.post("/issues", formData);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get("/issues");
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/issues/${id}`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.put(`/issues/${id}`, { status });
    return response.data;
  },
  updateDepartment: async (id, department) => {
    const response = await api.put(`/issues/${id}`, { department });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/issues/${id}`);
    return response.data;
  },
  classify: async (id) => {
    const response = await api.post(`/issues/${id}/classify`);
    return response.data;
  },
  // Public — no auth required. Used by the citizen-facing tracking page.
  track: async (code) => {
    const response = await api.get(`/issues/track/${encodeURIComponent(code)}`);
    return response.data;
  },
  uploadImage: async (id, imageFile, extra = {}) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    // Append any extra fields (e.g., status) so backend can decide whether
    // this is a resolved photo or an updated report photo.
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await api.put(`/issues/${id}`, formData);
    return response.data;
  },
};

// Model comparison — served by ml-service, not the Node backend.
export const modelComparisonAPI = {
  get: async () => {
    const response = await axios.get(`${ML_SERVICE_URL}/models/comparison`);
    return response.data;
  },
};

export default api;
