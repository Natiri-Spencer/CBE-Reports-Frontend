import React, { useRef, useState } from "react";
import { submitMarks } from "../api";
import LearnerPicker from "./LearnerPicker";

export default function MarksForm({ token, onResults }) {
  const [learner, setLearner] = useState(null);
  const [className, setClassName] = useState("");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState(new Date().getMonth() < 4 ? 1 : new Date().getMonth() < 8 ? 2 : 3);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submissionPending = useRef(false);
  const [subjects, setSubjects] = useState({
    mathematics: "",
    english: "",
    kiswahili: "",
    creative_arts: "",
    integrated_science: "",
    pretechnical: "",
    agriculture: "",
    social_studies: "",
    cre: "",
  });

  const handleChange = (subject, value) => {
    setSubjects((prev) => ({ ...prev, [subject]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setMessage("");
    setError("");
    if (!learner || !className.trim()) {
      setError("Select a learner and enter the class for these marks.");
      return;
    }

    const invalidScore = Object.entries(subjects).find(
      ([, value]) => value === "" || !Number.isFinite(Number(value))
    );
    if (invalidScore) {
      setError("Enter a score for every subject before submitting.");
      return;
    }

    const scores = Object.fromEntries(
      Object.entries(subjects).map(([key, value]) => [key, Number(value)])
    );
    if (Object.values(scores).some((score) => score < 0 || score > 100)) {
      setError("Scores must be between 0 and 100.");
      return;
    }

    // Payload must match FastAPI schema: { students: [ { ... } ] }
    const payload = {
      students: [
        {
          learner_id: learner.id,
          class_name: className.trim(),
          academic_year: Number(academicYear),
          term: Number(term),
          ...scores,
        },
      ],
    };

    submissionPending.current = true;
    setSaving(true);
    try {
      const data = await submitMarks(payload.students, token);

      if (onResults) {
        onResults(data.results || []);
      }
      setMessage(data.message || "Marks saved successfully.");

      // Reset form
      setSubjects({
        mathematics: "",
        english: "",
        kiswahili: "",
        creative_arts: "",
        integrated_science: "",
        pretechnical: "",
        agriculture: "",
        social_studies: "",
        cre: "",
      });
    } catch (err) {
      console.error("❌ Submission failed:", err);
      setError(err.message || "Submission failed. Check your connection and try again.");
    } finally {
      submissionPending.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="marks-form">
      <form onSubmit={handleSubmit}>
        <LearnerPicker token={token} value={learner} disabled={saving} onChange={(record) => { setLearner(record); setClassName(record?.class_name || ""); }} />
        <label>Class for these marks <input required maxLength={50} value={className} disabled={saving} onChange={(event) => setClassName(event.target.value)} /></label>
        <label>Academic year <input type="number" required min="2000" max="2200" value={academicYear} disabled={saving} onChange={(event) => setAcademicYear(event.target.value)} /></label>
        <label>Term <select value={term} disabled={saving} onChange={(event) => setTerm(Number(event.target.value))}>
          <option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option>
        </select></label>

      {Object.keys(subjects).map((subject) => (
        <div key={subject}>
          <label className="form-field">
            {subject.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}:
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={subjects[subject]}
              disabled={saving}
              onChange={(e) => handleChange(subject, e.target.value)}
              required
            />
          </label>
        </div>
      ))}

      <button
        type="submit"
        disabled={saving}
        style={{
          marginTop: "10px",
          background: "#4CAF50",
          color: "white",
          border: "none",
          padding: "8px 16px",
          cursor: "pointer",
          borderRadius: "4px",
        }}
      >
        {saving ? "Saving marks…" : "Submit Marks"}
      </button>
      </form>
      {message && <p role="status" style={{ color: "green" }}>{message}</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
    </section>
  );
}
