import React, { useState } from "react";
import MarksForm from "./MarksForm";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // correct import

export default function TeacherDashboard({ token, onLogout }) {
  const [history, setHistory] = useState([]);

  // ✅ Shared headers
  const headers = [
    "Name",
    "Mathematics",
    "English",
    "Kiswahili",
    "Creative Arts",
    "Integrated Science",
    "Pretechnical",
    "Agriculture",
    "Social Studies",
    "CRE",
    "Total",
    "Average",
    "Grade Band",
    "Comments",
  ];

  const handleResults = (newResults) => {
    setHistory((prev) => [...prev, ...newResults]);
  };

  // PDF export
  const downloadPDF = () => {
    if (history.length === 0) return;

    const doc = new jsPDF();
    doc.text("Teacher Marks Submission History", 14, 16);

    const tableRows = history.map((student) => [
      student.name,
      student.mathematics,
      student.english,
      student.kiswahili,
      student.creativeArts,
      student.integratedScience,
      student.pretechnical,
      student.agriculture,
      student.socialStudies,
      student.cre,
      student.total,
      student.average,
      student.gradeBand,
      student.comments,
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableRows,
      startY: 20,
    });

    doc.save("marks-history.pdf");
  };

  // CSV export
  const downloadCSV = () => {
    if (history.length === 0) return;

    const rows = history.map((student) => [
      `"${student.name}"`,
      student.mathematics,
      student.english,
      student.kiswahili,
      student.creativeArts,
      student.integratedScience,
      student.pretechnical,
      student.agriculture,
      student.socialStudies,
      student.cre,
      student.total,
      student.average,
      `"${student.gradeBand}"`,
      `"${student.comments}"`,
    ]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "marks-history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Teacher Dashboard</h2>
      <p>Welcome! You can enter marks for multiple students below.</p>

      <MarksForm token={token} onResults={handleResults} />

      {history.length > 0 && (
        <div style={{ marginTop: "30px", overflowX: "auto" }}>
          <h3>Submission History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead>
              <tr>
                {headers.map((col) => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((student, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{student.name}</td>
                  <td style={tdStyle}>{student.mathematics}</td>
                  <td style={tdStyle}>{student.english}</td>
                  <td style={tdStyle}>{student.kiswahili}</td>
                  <td style={tdStyle}>{student.creativeArts}</td>
                  <td style={tdStyle}>{student.integratedScience}</td>
                  <td style={tdStyle}>{student.pretechnical}</td>
                  <td style={tdStyle}>{student.agriculture}</td>
                  <td style={tdStyle}>{student.socialStudies}</td>
                  <td style={tdStyle}>{student.cre}</td>
                  <td style={tdStyle}>{student.total}</td>
                  <td style={tdStyle}>{student.average}</td>
                  <td style={tdStyle}>{student.gradeBand}</td>
                  <td style={tdStyle}>{student.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "15px" }}>
            <button onClick={downloadPDF} style={pdfBtnStyle}>Download PDF</button>
            <button onClick={downloadCSV} style={csvBtnStyle}>Download CSV</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button onClick={onLogout} style={logoutBtnStyle}>Logout</button>
      </div>
    </div>
  );
}

const thStyle = { border: "1px solid #ccc", padding: "6px", background: "#f2f2f2" };
const tdStyle = { border: "1px solid #ccc", padding: "6px", textAlign: "center" };

const pdfBtnStyle = {
  background: "#4CAF50",
  color: "white",
  border: "none",
  padding: "8px 16px",
  cursor: "pointer",
  borderRadius: "4px",
  marginRight: "10px",
};

const csvBtnStyle = {
  background: "#2196F3",
  color: "white",
  border: "none",
  padding: "8px 16px",
  cursor: "pointer",
  borderRadius: "4px",
};

const logoutBtnStyle = {
  background: "red",
  color: "white",
  border: "none",
  padding: "8px 16px",
  cursor: "pointer",
  borderRadius: "4px",
};
