import React, { useEffect, useRef, useState } from "react";
import { createLearner, getLearners } from "../api";

export default function LearnerPicker({ token, value, onChange, disabled = false }) {
  const [page, setPage] = useState({ items: [], total: 0, offset: 0, limit: 50 });
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let cancelled = false;
    getLearners(token, { offset, limit: 50, search }).then((result) => {
      if (!cancelled) { setPage(result); setError(""); }
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [token, offset, search]);

  const add = async () => {
    if (pending.current) return;
    if (!name.trim() || !className.trim()) { setError("Enter the learner's name and class."); return; }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const learner = await createLearner({ name: name.trim(), class_name: className.trim() }, token);
      onChange(learner);
      setName(""); setClassName("");
      const result = await getLearners(token, { offset, limit: 50, search });
      setPage(result);
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setSaving(false); }
  };
  const choices = value && !page.items.some((item) => item.id === value.id) ? [value, ...page.items] : page.items;
  return <fieldset disabled={disabled || saving}>
    <legend>Learner record</legend>
    <label>Search learners <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} /></label>
    <label>Learner <select value={value?.id || ""} required onChange={(event) => onChange(choices.find((item) => item.id === event.target.value) || null)}>
      <option value="">Select a learner</option>
      {choices.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.class_name} — {item.id.slice(-8)}</option>)}
    </select></label>
    <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous learners</button>{" "}
    <button type="button" disabled={offset + page.limit >= page.total} onClick={() => setOffset(offset + 50)}>Next learners</button>
    <details><summary>Add a learner</summary>
      <label>New learner name <input value={name} maxLength={255} onChange={(event) => setName(event.target.value)} /></label>
      <label>New learner class <input value={className} maxLength={50} onChange={(event) => setClassName(event.target.value)} /></label>
      <button type="button" onClick={add}>{saving ? "Adding learner…" : "Add learner"}</button>
    </details>
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
