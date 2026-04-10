import { env } from "@/env";
import axios from "axios";
const Api = axios.create({
    baseURL: env.VITE_APP_BACKEND,
    withCredentials: true
  })
  Api.interceptors.request.use(config => {
    const token = window.localStorage.getItem(env.VITE_APP_TOKENSTORAGENAME);
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  Api.interceptors.response.use(function (response) {
    return response;
  }, function (error) {
    if(error.response.status === 440){
      localStorage.removeItem(env.VITE_APP_TOKENSTORAGENAME);
      window.location.pathname = '/';
    }
    return Promise.reject(error);
  });
export default Api;