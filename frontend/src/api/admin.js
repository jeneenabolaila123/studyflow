import axiosClient from "./axiosClient";

export const fetchAdminStats = async () => {
  const res = await axiosClient.get("/admin/stats");
  return res.data;
};

export const fetchAdminUsers = async () => {
  const res = await axiosClient.get("/admin/users");
  return res.data;
};

export const deleteAdminUser = async (id) => {
  const res = await axiosClient.delete(`/admin/users/${id}`);
  return res.data;
};
