import axios from "axios";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,

    withCredentials: true,

    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,

    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            localStorage.removeItem("token");

            window.dispatchEvent(new Event("auth:logout"));
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
