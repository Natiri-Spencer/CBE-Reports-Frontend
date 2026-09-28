import React, { useState } from "react";

export default function MarksForm({ token, onResults }) {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState({
    mathematics: "",
    english: "",
    kiswahili: "",
    creativeArts: "",
    integratedScience: "",
    pretechnical: "",
    agriculture: "",
    socialStudies: "",
    cre: "",
  });
  const [comments, setComments] = useState("");

  const handleChange = (subject, value) => {
    setSubjects((prev) => ({ ...prev, [subject]: value }));
  };

  const getGradeBand = (avg) => {
    if (avg >= 90) return "EE1 ";
    if (avg >= 67) return "EE2 ";
    if (avg >= 54) return "ME1 ";
    if (avg >= 45) return "ME2 ";
    if (avg >= 31) return "AE1 ";
    if (avg >= 21) return "AE2 ";
    if (avg >= 11) return "BE1 ";
    return "BE2 (0-9)";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Convert subject scores to numbers
    const scores = Object.fromEntries(
      Object.entries(subjects).map(([key, val]) => [key, parseInt(val) || 0])
    );

    const total = Object.values(scores).reduce((acc, val) => acc + val, 0);
    const average = total / Object.keys(scores).length;
    const gradeBand = getGradeBand(average);

    const newResult = {
      name,
      ...scores,
      total,
      average: average.toFixed(2),
      gradeBand,
      comments,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/marks/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newResult),
      });

      await res.json();

      if (onResults) {
        onResults([newResult]);
      }

      // Reset form
      setName("");
      setSubjects({
        mathematics: "",
        english: "",
        kiswahili: "",
        creativeArts: "",
        integratedScience: "",
        pretechnical: "",
        agriculture: "",
        socialStudies: "",
        cre: "",
      });
      setComments("");
    } catch (err) {
      console.error("❌ Submission failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
      <div>
        <label>
          Student Name:
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
      </div>

      {Object.keys(subjects).map((subject) => (
        <div key={subject}>
          <label>
            {subject.charAt(0).toUpperCase() + subject.slice(1)}:
            <input
              type="number"
              value={subjects[subject]}
              onChange={(e) => handleChange(subject, e.target.value)}
              required
            />
          </label>
        </div>
      ))}

      <div>
        <label>
          Comments:
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} />
        </label>
      </div>

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
  );
}
