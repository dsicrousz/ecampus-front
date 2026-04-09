import { env } from "@/env";
import axios from "axios";
const Api = axios.create({
    baseURL: env.VITE_APP_BACKEND,
    withCredentials:true
  })

  Api.interceptors.response.use(function (response) {
    return response;
  }, function (error) {
    if(error.response.status === 440){
      window.location.pathname = '/';
    }
    return Promise.reject(error);
  });
export default Api;