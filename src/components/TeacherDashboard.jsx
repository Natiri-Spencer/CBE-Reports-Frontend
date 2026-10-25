import LogoutButton from "./LogoutButton";
import React, { useEffect, useState } from "react";
import MarksForm from "./MarksForm";
import { downloadMarks, getMarks } from "../api";

export default function TeacherDashboard({ token, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState(new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3);
  const [className, setClassName] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMarks(token, academicYear, term, className, offset)
      .then((page) => { if (!cancelled) { setHistory(page.items); setTotal(page.total); setLoadError(""); } })
      .catch((err) => setLoadError(err.message || "Could not load saved marks."));
    return () => { cancelled = true; };
  }, [token, academicYear, term, className, offset]);

  const fields = [
    "name", "class_name", "academic_year", "term", "mathematics", "pretechnical", "cre", "agriculture", "integrated_science",
    "social_studies", "english", "kiswahili", "creative_arts", "total", "average", "status", "rank",
  ];
  const headers = [
    "Name", "Class", "Academic Year", "Term", "Mathematics", "Pretechnical", "CRE", "Agriculture", "Integrated Science",
    "Social Studies", "English", "Kiswahili", "Creative Arts", "Total", "Average", "Status", "Rank",
  ];

  const handleResults = (newResults) => {
    const first = newResults[0];
    if (first && (first.academic_year !== academicYear || first.term !== term || first.class_name !== className || offset !== 0)) {
      setAcademicYear(first.academic_year); setTerm(first.term); setClassName(first.class_name); setOffset(0);
      return;
    }
    getMarks(token, academicYear, term, className, offset).then((page) => {
      setHistory(page.items);
      setTotal(page.total);
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
      ...fields.map((field) => student[field]),
    ]);
    autoTable(doc, { head: [headers], body: tableRows, startY: 20 });
    doc.save("marks-history.pdf");
  };

  // Local CSV export
  const downloadCSV = () => {
    if (history.length === 0) return;
    const rows = history.map((student) => fields.map((field) => `"${String(student[field] ?? "").replaceAll('"', '""')}"`));
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
      <section aria-label="Saved marks period">
        <label>View academic year <input type="number" min="2000" max="2200" disabled={term === 0} value={academicYear} onChange={(event) => { setAcademicYear(Number(event.target.value)); setOffset(0); }} /></label>
        <label>View term <select value={term} onChange={(event) => { const next = Number(event.target.value); setTerm(next); setAcademicYear(next === 0 ? 0 : new Date().getFullYear()); setOffset(0); }}>
          <option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option><option value={0}>Legacy / unassigned</option>
        </select></label>
        <label>View class <input value={className} onChange={(event) => { setClassName(event.target.value); setOffset(0); }} /></label>
        <p>{total} saved mark records. Showing this page.</p>
        <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous marks</button>{" "}
        <button type="button" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>Next marks</button>
      </section>

      {history.length > 0 && (
        <div style={{ marginTop: "30px", overflowX: "auto" }}>
          <h3>Submission History</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead>
              <tr>{headers.map((col) => <th key={col} style={thStyle}>{col}</th>)}<th style={thStyle}>Report</th></tr>
            </thead>
            <tbody>
              {history.map((student, idx) => (
                <tr key={student.id}>
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
            <button onClick={() => downloadMarks("pdf", token, academicYear, term, className).catch((err) => setLoadError(err.message))} style={pdfBtnStyle}>Download DB PDF</button>
            <button onClick={() => downloadMarks("csv", token, academicYear, term, className).catch((err) => setLoadError(err.message))} style={csvBtnStyle}>Download DB CSV</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <LogoutButton onLogout={onLogout} />
      </div>
      {loadError && <p role="alert" style={{ color: "red" }}>{loadError}</p>}
    </main>
  );
}

const thStyle = { border: "1px solid #ccc", padding: "6px", background: "#f2f2f2" };
const tdStyle = { border: "1px solid #ccc", padding: "6px", textAlign: "center" };

const pdfBtnStyle = { background: "#4CAF50", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "4px", marginRight: "10px" };
const csvBtnStyle = { background: "#2196F3", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "4px", marginRight: "10px" };
