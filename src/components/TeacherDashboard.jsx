import React, { useEffect, useState } from "react";
import MarksForm from "./MarksForm";
import { downloadMarks, getMarks } from "../api";

export default function TeacherDashboard({ token, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getMarks(token)
      .then(setHistory)
      .catch((err) => setLoadError(err.message || "Could not load saved marks."));
  }, [token]);

  const fields = [
    "name", "mathematics", "pretechnical", "cre", "agriculture", "integratedScience",
    "socialStudies", "english", "kiswahili", "creativeArts", "total", "average", "status", "rank",
  ];
  const headers = [
    "Name", "Mathematics", "Pretechnical", "CRE", "Agriculture", "Integrated Science",
    "Social Studies", "English", "Kiswahili", "Creative Arts", "Total", "Average", "Status", "Rank",
  ];

  const handleResults = (newResults) => {
    setHistory((prev) => [
      ...prev.filter((student) => !newResults.some((result) => result.name === student.name)),
      ...newResults,
    ].sort((a, b) => a.rank - b.rank));
    getMarks(token).then((records) => {
      setHistory(records);
      setLoadError("");
    }).catch((err) => setLoadError(err.message || "Could not refresh saved marks."));
  };

  // Local PDF export
  const downloadPDF = async (students = history) => {
    if (students.length === 0) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.text("Teacher Marks Submission History", 14, 16);
    const tableRows = students.map((student) => [
      student.name, student.mathematics, student.pretechnical, student.cre, student.agriculture,
      student.integratedScience, student.socialStudies, student.english, student.kiswahili,
      student.creativeArts, student.total, student.average, student.status, student.rank,
    ]);
    autoTable(doc, { head: [headers], body: tableRows, startY: 20 });
    doc.save("marks-history.pdf");
  };

  // Local CSV export
  const downloadCSV = () => {
    if (history.length === 0) return;
    const rows = history.map((student) => [
      `"${student.name}"`, student.mathematics, student.pretechnical, student.cre, student.agriculture,
      student.integratedScience, student.socialStudies, student.english, student.kiswahili,
      student.creativeArts, student.total, student.average, `"${student.status}"`, student.rank,
    ]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "marks-history.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="page-shell teacher-dashboard">
      <h2>Teacher Dashboard</h2>
      <p>Welcome! You can enter marks for multiple students below.</p>

      <MarksForm token={token} onResults={handleResults} />

      {history.length > 0 && (
        <div style={{ marginTop: "30px", overflowX: "auto" }}>
          <h3>Submission History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead>
              <tr>{headers.map((col) => <th key={col} style={thStyle}>{col}</th>)}<th style={thStyle}>Report</th></tr>
            </thead>
            <tbody>
              {history.map((student, idx) => (
                <tr key={idx}>
                  {fields.map((field) => (
                    <td key={field} style={tdStyle}>{student[field] ?? "—"}</td>
                  ))}
                  <td style={tdStyle}><button type="button" onClick={() => downloadPDF([student]).catch((err) => setLoadError(err.message))}>PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "15px" }}>
            <button onClick={() => downloadPDF().catch((err) => setLoadError(err.message))} style={pdfBtnStyle}>Download Local PDF</button>
            <button onClick={downloadCSV} style={csvBtnStyle}>Download Local CSV</button>
            <button onClick={() => downloadMarks("pdf", token).catch((err) => setLoadError(err.message))} style={pdfBtnStyle}>Download DB PDF</button>
            <button onClick={() => downloadMarks("csv", token).catch((err) => setLoadError(err.message))} style={csvBtnStyle}>Download DB CSV</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button onClick={onLogout} style={logoutBtnStyle}>Logout</button>
      </div>
      {loadError && <p role="alert" style={{ color: "red" }}>{loadError}</p>}
    </main>
  );
}

const thStyle = { border: "1px solid #ccc", padding: "6px", background: "#f2f2f2" };
const tdStyle = { border: "1px solid #ccc", padding: "6px", textAlign: "center" };

const pdfBtnStyle = { background: "#4CAF50", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "4px", marginRight: "10px" };
const csvBtnStyle = { background: "#2196F3", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "4px", marginRight: "10px" };
const logoutBtnStyle = { background: "red", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "4px" };
