import axios from "axios";

const api = axios.create({
  // baseURL: '/api',
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies for refresh token
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle 401 errors and auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh endpoint itself to avoid infinite loop
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token (refreshToken is sent via cookie automatically)
        const response = await api.post("/auth/refresh", {});
        const { accessToken } = response.data.data;

        // Save new access token
        localStorage.setItem("accessToken", accessToken);

        // Update authorization header
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear access token and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export interface DriveAccount {
  id: string;
  userId: string;
  email: string;
  totalSpace: string;
  usedSpace: string;
  status: string;
}

export const driveAccountsApi = {
  getOAuthUrl: () => api.get<{ authUrl: string }>("/drive-accounts/oauth/url"),
  listAccounts: () => api.get<DriveAccount[]>("/drive-accounts"),
  removeAccount: (id: string) => api.delete(`/drive-accounts/${id}`),
  refreshQuota: (id: string) => api.post(`/drive-accounts/${id}/refresh`),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: true; message: string; data: { accessToken: string } }>(
      "/auth/login",
      {
        email,
        password,
      },
    ),
  register: (userName: string, email: string, password: string) =>
    api.post("/auth/register", { userName, email, password }),
};

export default api;
