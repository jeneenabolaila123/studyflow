import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        Accept: "application/json",
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    const isFormData =
        typeof FormData !== "undefined" && config.data instanceof FormData;

    if (isFormData) {
        if (config.headers?.delete) {
            config.headers.delete("Content-Type");
            config.headers.delete("content-type");
        } else {
            delete config.headers?.["Content-Type"];
            delete config.headers?.["content-type"];
        }
    } else {
        if (
            !config.headers?.["Content-Type"] &&
            !config.headers?.["content-type"]
        ) {
            config.headers = config.headers || {};
            config.headers["Content-Type"] = "application/json";
        }
    }

    if (token) {
        if (config.headers?.set) {
            config.headers.set("Authorization", `Bearer ${token}`);
        } else {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
    }

    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const status = error?.response?.status;
        const url = error?.config?.url || "";

        if (status === 401) {
            const token = localStorage.getItem("token");

            if (!token) {
                window.dispatchEvent(new Event("auth:logout"));
                return Promise.reject(error);
            }

            if (url.includes("/auth/me")) {
                localStorage.removeItem("token");
                window.dispatchEvent(new Event("auth:logout"));
                return Promise.reject(error);
            }

            if (!error?.config?._authProbeAttempted) {
                try {
                    error.config._authProbeAttempted = true;

                    await axios.get(`${API_BASE_URL}/auth/me`, {
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        withCredentials: true,
                    });

                    return Promise.reject(error);
                } catch (probeErr) {
                    const probeStatus = probeErr?.response?.status;

                    if (probeStatus === 401) {
                        localStorage.removeItem("token");
                        window.dispatchEvent(new Event("auth:logout"));
                    }

                    return Promise.reject(error);
                }
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;