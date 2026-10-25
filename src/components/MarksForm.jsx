import React, { useState } from "react";
import { submitMarks } from "../api";

export default function MarksForm({ token, onResults }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState({
    mathematics: "",
    english: "",
    kiswahili: "",
    creativeArts: "",
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
    setMessage("");
    setError("");
    if (!name.trim()) {
      setError("Enter the learner's name.");
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

    // Payload must match FastAPI schema: { students: [ { ... } ] }
    const payload = {
      students: [
        {
          name,
          ...scores,
        },
      ],
    };

    try {
      const data = await submitMarks(payload.students, token);

      if (onResults) {
        onResults(data.results || []);
      }
      setMessage(data.message || "Marks saved successfully.");

      // Reset form
      setName("");
      setSubjects({
        mathematics: "",
        english: "",
        kiswahili: "",
        creativeArts: "",
        integrated_science: "",
        pretechnical: "",
        agriculture: "",
        social_studies: "",
        cre: "",
      });
    } catch (err) {
      console.error("❌ Submission failed:", err);
      setError(err.message || "Submission failed. Check your connection and try again.");
    }
  };

  return (
    <section className="marks-form">
      <form onSubmit={handleSubmit}>
        <label className="form-field">
          Student Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

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
              onChange={(e) => handleChange(subject, e.target.value)}
              required
            />
          </label>
        </div>
      ))}

      <button
        type="submit"
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
        Submit Marks
      </button>
      </form>
      {message && <p role="status" style={{ color: "green" }}>{message}</p>}
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
    </section>
  );
}
