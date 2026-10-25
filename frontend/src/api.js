import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 10000,
  withCredentials: true,
});

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error.response?.data?.error || fallback;
}
