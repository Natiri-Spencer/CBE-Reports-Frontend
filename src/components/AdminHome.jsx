import React, { useEffect, useState } from "react";
import { getAdminDashboard } from "../api";
import "./AdminHome.css";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", maximumFractionDigits: 0,
}).format(amount || 0);

export default function AdminHome({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAdminDashboard(token)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.message || "Could not load the school overview."); });
    return () => { active = false; };
  }, [token]);

  if (!data) return <section className="admin-home"><p>{error || "Loading school overview..."}</p></section>;

  const period = data.academic_period;
  const progress = data.counts.students
    ? Math.min(100, Math.round((data.academic_status.students_with_marks / data.counts.students) * 100))
    : 0;

  return (
    <main className="admin-home">
      <header className="admin-home__hero">
        <div>
          <p className="admin-home__eyebrow">SCHOOL ADMINISTRATION</p>
          <h1>Good day</h1>
          <p className="admin-home__subtitle">Here is your school at a glance.</p>
        </div>
        <div className="admin-home__term">
          <span>Current academic period</span>
          <strong>{period.academic_year} · Term {period.term}</strong>
          <small>{period.months} · {period.instruction_weeks} school weeks</small>
        </div>
      </header>

      {error && <p className="admin-home__notice" role="alert">Some overview data could not be loaded: {error}</p>}

      <section className="admin-home__metrics" aria-label="School counts">
        <article className="admin-home__metric"><span>Students</span><strong>{data.counts.students}</strong><small>Unique names in marks or fees</small></article>
        <article className="admin-home__metric"><span>Teachers</span><strong>{data.counts.teachers}</strong><small>Teacher accounts</small></article>
        <article className="admin-home__metric"><span>Marks recorded</span><strong>{data.academic_status.mark_records}</strong><small>Saved academic records</small></article>
        <article className="admin-home__metric"><span>Average score</span><strong>{data.academic_status.average_score ?? "—"}{data.academic_status.average_score !== null ? "%" : ""}</strong><small>Across recorded marks</small></article>
      </section>

      <nav className="admin-home__shortcuts" aria-label="Admin shortcuts">
        <a className="admin-home__shortcut" href="/admin/finance#learner-records"><span className="admin-home__shortcut-icon">01</span><span><strong>Students</strong><small>Directory coming next</small></span><b>→</b></a>
        <a className="admin-home__shortcut" href="#academic-status"><span className="admin-home__shortcut-icon">02</span><span><strong>Academics</strong><small>Setup coming next</small></span><b>→</b></a>
        <a className="admin-home__shortcut" href="/admin/finance#finance"><span className="admin-home__shortcut-icon">03</span><span><strong>Finance</strong><small>Fee records and payments</small></span><b>→</b></a>
        <a className="admin-home__shortcut" href="/admin/finance#reports"><span className="admin-home__shortcut-icon">04</span><span><strong>Reports</strong><small>Academic summaries</small></span><b>→</b></a>
      </nav>

      <div className="admin-home__columns">
        <section className="admin-home__panel" id="academic-status">
          <div className="admin-home__panel-title"><div><p className="admin-home__eyebrow">ACADEMICS</p><h2>Academic status</h2></div><span className="admin-home__pill">{progress}% marked</span></div>
          <div className="admin-home__progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="admin-home__status-grid">
            <div><strong>{data.academic_status.students_with_marks}</strong><span>Students with marks</span></div>
            <div><strong>{data.academic_status.students_without_marks}</strong><span>Students without marks</span></div>
          </div>
          <p className="admin-home__muted">Mark completion is based on saved learner mark records.</p>
        </section>

        <section className="admin-home__panel">
          <div className="admin-home__panel-title"><div><p className="admin-home__eyebrow">FINANCE · ADMIN ONLY</p><h2>Term fee collection</h2></div><span className="admin-home__pill">Term {data.fee_summary.term}</span></div>
          <div className="admin-home__finance-main"><span>Received</span><strong>{money(data.fee_summary.received)}</strong></div>
          <div className="admin-home__finance-grid">
            <div><span>Expected</span><strong>{money(data.fee_summary.expected)}</strong></div>
            <div><span>Outstanding</span><strong>{money(data.fee_summary.outstanding)}</strong></div>
          </div>
          <p className="admin-home__muted">Aggregate totals for {data.fee_summary.learners_with_fee_records} fee records in this term.</p>
        </section>
      </div>

      <div className="admin-home__columns">
        <section className="admin-home__panel">
          <div className="admin-home__panel-title"><div><p className="admin-home__eyebrow">GET STARTED</p><h2>Setup reminders</h2></div></div>
          {data.setup_reminders.length ? (
            <ul className="admin-home__reminders">{data.setup_reminders.map((item) => <li key={item.id}><span className="admin-home__reminder-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ul>
          ) : <p className="admin-home__empty">Core teacher, learner, mark, and term fee records are present.</p>}
        </section>

        <section className="admin-home__panel">
          <div className="admin-home__panel-title"><div><p className="admin-home__eyebrow">AUDIT TRAIL</p><h2>Recent admin activity</h2></div></div>
          {data.recent_activity.length ? (
            <ul className="admin-home__activity">{data.recent_activity.map((item) => <li key={item.id}><span className="admin-home__activity-mark">✓</span><div><strong>{activityLabel(item.action)}</strong><p>{item.actor} · {new Date(item.created_at).toLocaleString()}</p></div></li>)}</ul>
          ) : <p className="admin-home__empty">No admin activity has been recorded yet.</p>}
        </section>
      </div>
    </main>
  );
}

function activityLabel(action) {
  const labels = {
    fee_record_created: "Created a fee record",
    fee_record_updated: "Updated a fee record",
    fee_record_deleted: "Deleted a fee record",
    payment_recorded: "Recorded a fee payment",
  };
  return labels[action] || action.replaceAll("_", " ");
}
