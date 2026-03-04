import { useEffect } from "react";

export default function Dashboard() {

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ping")
      .then(res => res.json())
      .then(data => console.log("Response:", data))
      .catch(err => console.error("Error:", err));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  );
}