import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to CBE Reports generation– Student Portal</h1>
      <p>
        This portal allows teachers and administrators to upload student performance and fee data,
        generate reports, and track progress.
      </p>
      <div style={{ marginTop: "30px" }}>
        <Link to="/login" style={{ marginRight: "20px" }}>
          <button style={{ padding: "10px 20px" }}>Login</button>
        </Link>
        <Link to="/signup">
          <button style={{ padding: "10px 20px" }}>Sign Up</button>
        </Link>
      </div>
    </div>
  );
}
