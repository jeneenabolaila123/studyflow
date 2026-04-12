import { useAuth as useAuthFromContext } from "../context/AuthContext.jsx";

export default function useAuth() {
  return useAuthFromContext();
}
