import React, { useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";

export default function AdminDashboard({ token }) {
  const [fees, setFees] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("http://127.0.0.1:8000/reports/fees", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setFees(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Upload failed. Please check the file format.");
    }
  };

  return (
    <div>
      <Navbar />
      <h2>Admin Dashboard</h2>
      <input type="file" onChange={handleUpload} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      {fees && (
        <div>
          <h3>Fee Summary</h3>
          <p>Total Fees Collected: {fees.total_fees}</p>
          <p>Total Outstanding Balance: {fees.total_balance}</p>
          <h4>Students</h4>
          <ul>
            {fees.students.map((s, i) => (
              <li key={i}>
                <strong>{s.learner_name}</strong> → Paid: {s.fee_paid}, Balance: {s.fee_balance}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
