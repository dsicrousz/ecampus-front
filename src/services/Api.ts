import { env } from "@/env";
import axios from "axios";

const Api = axios.create({
  baseURL: env.VITE_APP_BACKEND,
  withCredentials: true,
});

Api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(env.VITE_APP_TOKENSTORAGENAME);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

Api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 440) {
      localStorage.removeItem(env.VITE_APP_TOKENSTORAGENAME);
      window.location.pathname = "/";
    }

    return Promise.reject(error);
  },
);

export default Api;
