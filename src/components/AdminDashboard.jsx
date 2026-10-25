import React, { useEffect, useState } from "react";
import {
  getReports,
  downloadReport,
  getFees,
  getAcademicCalendar,
  saveFee,
  downloadFeeStatement,
  downloadLearnerReport,
  recordFeePayment,
  getFeePayments,
} from "../api";

const AdminDashboard = ({ token, role }) => {   // accept role as prop
  const [dashboard, setDashboard] = useState(null);
  const [feeRecords, setFeeRecords] = useState([]);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState(getCurrentTerm());
  const [calendar, setCalendar] = useState(null);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm(new Date().getFullYear(), getCurrentTerm()));
  const [paymentForms, setPaymentForms] = useState({});
  const [paymentsByFee, setPaymentsByFee] = useState({});
  const [paymentMessages, setPaymentMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feeMessage, setFeeMessage] = useState("");

  useEffect(() => {
    const loadAdminData = async () => {
      const [calendarResult, feesResult] = await Promise.allSettled([
        getAcademicCalendar(token),
        getFees(token),
      ]);
      if (calendarResult.status === "fulfilled") {
        setCalendar(calendarResult.value);
        setAcademicYear(calendarResult.value.academic_year);
        setTerm(calendarResult.value.current_term);
        setFeeForm((current) => ({
          ...current,
          academic_year: calendarResult.value.academic_year,
          term: calendarResult.value.current_term,
        }));
      } else setError(calendarResult.reason.message || "Failed to load academic calendar.");
      if (feesResult.status === "fulfilled") setFeeRecords(feesResult.value);
      else setError((current) => current || feesResult.reason.message || "Failed to load fee records.");
      setLoading(false);
    };
    loadAdminData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getReports(token, academicYear, term)
      .then((data) => { if (!cancelled) setDashboard(data); })
      .catch((err) => { if (!cancelled) setError(err.message || "Failed to load dashboard."); });
    return () => { cancelled = true; };
  }, [token, academicYear, term]);

  const handleFeeChange = (event) => {
    const { name, value } = event.target;
    setFeeForm((current) => ({ ...current, [name]: value }));
  };

  const handleTermChange = (event) => {
    const nextTerm = Number(event.target.value);
    setTerm(nextTerm);
    if (nextTerm === 0) setAcademicYear(0);
    else if (academicYear === 0) setAcademicYear(calendar?.academic_year || new Date().getFullYear());
    setFeeForm((current) => ({ ...current, term: nextTerm, academic_year: nextTerm === 0 ? 0 : (academicYear || new Date().getFullYear()) }));
  };

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value);
    setAcademicYear(nextYear);
    setFeeForm((current) => ({ ...current, academic_year: nextYear }));
  };

  const handleFeeSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeeMessage("");
    const payload = Object.fromEntries(
      Object.entries(feeForm).map(([key, value]) => [
        key,
        ["learner_name", "grade"].includes(key) ? value.trim() : Number(value || 0),
      ])
    );
    payload.academic_year = academicYear;
    payload.term = term;
    try {
      const saved = await saveFee(payload, token);
      setFeeRecords((current) => {
        const index = current.findIndex(
          (fee) => fee.learner_name === saved.learner_name && fee.grade === saved.grade &&
            fee.academic_year === saved.academic_year && fee.term === saved.term
        );
        if (index < 0) return [...current, saved].sort((a, b) => b.academic_year - a.academic_year || a.term - b.term || a.grade.localeCompare(b.grade) || a.learner_name.localeCompare(b.learner_name));
        return current.map((fee, i) => (i === index ? saved : fee));
      });
      setFeeMessage(`Saved fees for ${saved.learner_name}, ${saved.academic_year} Term ${saved.term}.`);
      setFeeForm(emptyFeeForm(academicYear, term));
      try {
        const refreshedDashboard = await getReports(token, academicYear, term);
        setDashboard(refreshedDashboard);
      } catch (refreshError) {
        setError(`Fee record saved, but summary refresh failed: ${refreshError.message}`);
      }
    } catch (err) {
      setError(err.message || "Could not save fee record.");
    }
  };

  const handlePaymentChange = (feeId, field, value) => {
    setPaymentForms((current) => ({
      ...current,
      [feeId]: { ...emptyPaymentForm(), ...(current[feeId] || {}), [field]: value },
    }));
  };

  const submitPayment = async (fee) => {
    const form = { ...emptyPaymentForm(), ...(paymentForms[fee.id] || {}) };
    setError("");
    try {
      await recordFeePayment(fee.id, { ...form, amount: Number(form.amount) }, token);
      setPaymentForms((current) => ({ ...current, [fee.id]: emptyPaymentForm() }));
      setPaymentMessages((current) => ({ ...current, [fee.id]: "Payment recorded." }));
      const results = await Promise.allSettled([
        getFees(token), getReports(token, academicYear, term), getFeePayments(fee.id, token),
      ]);
      if (results[0].status === "fulfilled") setFeeRecords(results[0].value);
      if (results[1].status === "fulfilled") setDashboard(results[1].value);
      if (results[2].status === "fulfilled") setPaymentsByFee((current) => ({ ...current, [fee.id]: results[2].value }));
      const refreshFailure = results.find((result) => result.status === "rejected");
      if (refreshFailure) setError(`Payment recorded, but the display could not refresh: ${refreshFailure.reason.message}`);
    } catch (err) {
      setError(err.message || "Could not record payment.");
    }
  };

  const loadPayments = async (feeId) => {
    if (paymentsByFee[feeId]) return;
    try {
      const payments = await getFeePayments(feeId, token);
      setPaymentsByFee((current) => ({ ...current, [feeId]: payments }));
    } catch (err) {
      setError(err.message || "Could not load payment history.");
    }
  };

  const visibleFeeRecords = showAllPeriods
    ? feeRecords
    : feeRecords.filter((fee) => fee.academic_year === academicYear && fee.term === term);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <main className="page-shell finance-dashboard">
      <h1>Finance and Reports</h1>
      {!dashboard && <p>No report data is available yet.</p>}

      <section>
        <h2>Academic calendar and reporting period</h2>
        <table border="1" cellPadding="6">
          <thead><tr><th>Term</th><th>Months</th><th>School weeks</th><th>Holiday after term</th></tr></thead>
          <tbody>{(calendar?.terms || []).map((item) => (
            <tr key={item.term}><td>Term {item.term}</td><td>{item.months}</td><td>{item.instruction_weeks}</td><td>{item.holiday_after_weeks} weeks ({item.holiday_after})</td></tr>
          ))}</tbody>
        </table>
        <label>Academic year <input type="number" min="2000" max="2200" value={academicYear} disabled={term === 0} onChange={handleYearChange} /></label>{" "}
        <label>Term <select value={term} onChange={handleTermChange}>
          <option value={1}>Term 1 — January to April (14 weeks)</option>
          <option value={2}>Term 2 — May to August (13 weeks)</option>
          <option value={3}>Term 3 — September to November (10 weeks)</option>
          <option value={0}>Legacy / unassigned</option>
        </select></label>{" "}
        <label><input type="checkbox" checked={showAllPeriods} onChange={(event) => setShowAllPeriods(event.target.checked)} /> Show all saved terms</label>
      </section>

      {/* School Summary */}
      <section id="reports">
        <h2>School Summary</h2>
        <table border="1" cellPadding="8">
          <tbody>
            <tr><td>Total Learners</td><td>{dashboard?.school_summary?.total_learners ?? 0}</td></tr>
            <tr><td>Total Required</td><td>{dashboard?.school_summary?.total_required ?? 0}</td></tr>
            <tr><td>Total Paid</td><td>{dashboard?.school_summary?.total_paid ?? 0}</td></tr>
            <tr><td>Total Balance</td><td>{dashboard?.school_summary?.total_balance ?? 0}</td></tr>
            <tr><td>Average School Score</td><td>{dashboard?.school_summary?.average_school_score ?? "—"}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Grade Summaries */}
      <section>
        <h2>Grade Summaries</h2>
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Learners</th>
              <th>Required</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(dashboard?.grade_summaries || {}).map(([grade, summary]) => (
              <tr key={grade}>
                <td>{grade}</td>
                <td>{summary.num_learners}</td>
                <td>{summary.total_required}</td>
                <td>{summary.total_paid}</td>
                <td>{summary.total_balance}</td>
                <td>{summary.average_class_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Export Buttons - only for admins */}
      {role === "admin" && (
        <div style={{ marginTop: "20px" }}>
          <h3>Export Reports</h3>
          <button onClick={() => downloadReport("csv", token, academicYear, term)}>Download CSV</button>
          <button onClick={() => downloadReport("pdf", token, academicYear, term)} style={{ marginLeft: "10px" }}>
            Download PDF
          </button>
        </div>
      )}

      {/* Learners by Grade */}
      <section id="learner-records">
        <h2>Learners</h2>
        {Object.entries(dashboard?.grades || {}).map(([grade, learners]) => (
          <div key={grade} style={{ marginBottom: "30px" }}>
            <h3>{grade}</h3>
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Math</th>
                  <th>English</th>
                  <th>Kiswahili</th>
                  <th>Total Marks</th>
                  <th>Average</th>
                  <th>Status</th>
                  <th>Rank</th>
                  <th>Total Required</th>
                  <th>Total Paid</th>
                  <th>Balance</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {learners.map(l => (
                  <tr key={l.learner_name}>
                    <td>{l.learner_name}</td>
                    <td>{l.marks.mathematics}</td>
                    <td>{l.marks.english}</td>
                    <td>{l.marks.kiswahili}</td>
                    <td>{l.marks.total}</td>
                    <td>{l.marks.average}</td>
                    <td>{l.marks.status}</td>
                    <td>{l.marks.rank}</td>
                    <td>{l.fees.total_required}</td>
                    <td>{l.fees.total_paid}</td>
                    <td>{l.fees.total_balance}</td>
                    <td><button type="button" onClick={() => downloadLearnerReport(l.learner_name, token, academicYear, term)}>PDF</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section id="finance" style={{ marginTop: "32px", scrollMarginTop: "20px" }}>
        <h2>Enter or update learner fees</h2>
        <p>Charges are stored for the selected academic year and term. Record each payment separately below.</p>
        <form onSubmit={handleFeeSubmit}>
          <label>Learner name <input name="learner_name" value={feeForm.learner_name} onChange={handleFeeChange} required /></label>{" "}
          <label>Grade <input name="grade" value={feeForm.grade} onChange={handleFeeChange} required /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px", margin: "12px 0" }}>
            {feeCategories.map(([label, requiredField]) => (
              <fieldset key={requiredField}>
                <legend>{label}</legend>
                <label>Required <input type="number" min="0" step="0.01" name={requiredField} value={feeForm[requiredField]} onChange={handleFeeChange} /></label>
              </fieldset>
            ))}
          </div>
          <button type="submit">Save fee record</button>{" "}
          <button type="button" onClick={() => setFeeForm(emptyFeeForm(academicYear, term))}>Clear</button>
        </form>
        {feeMessage && <p role="status">{feeMessage}</p>}
        <h3>Fee records</h3>
        <table border="1" cellPadding="8">
          <thead><tr><th>Learner</th><th>Grade</th><th>Year</th><th>Term</th><th>Required</th><th>Paid</th><th>Balance</th><th>Record a payment</th><th>Statement and history</th><th>Charges</th></tr></thead>
          <tbody>{visibleFeeRecords.map((fee) => {
            const paymentForm = { ...emptyPaymentForm(), ...(paymentForms[fee.id] || {}) };
            return <tr key={fee.id}>
              <td>{fee.learner_name}</td><td>{fee.grade}</td><td>{fee.academic_year || "—"}</td><td>{fee.term === 0 ? "Legacy" : `Term ${fee.term}`}</td>
              <td>{fee.total_required}</td><td>{fee.total_paid}</td><td>{fee.total_balance}</td>
              <td>
                <select aria-label="Payment category" value={paymentForm.category} onChange={(event) => handlePaymentChange(fee.id, "category", event.target.value)}>
                  {feeCategories.map(([label, field]) => <option key={field} value={field.replace("_required", "")}>{label}</option>)}
                </select>{" "}
                <input aria-label="Payment amount" type="number" min="0.01" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={(event) => handlePaymentChange(fee.id, "amount", event.target.value)} />{" "}
                <input aria-label="Payment date" type="date" value={paymentForm.payment_date} onChange={(event) => handlePaymentChange(fee.id, "payment_date", event.target.value)} />
                <input aria-label="Payment reference" placeholder="Receipt/reference" value={paymentForm.reference} onChange={(event) => handlePaymentChange(fee.id, "reference", event.target.value)} />
                <input aria-label="Payment note" placeholder="Note (optional)" value={paymentForm.note} onChange={(event) => handlePaymentChange(fee.id, "note", event.target.value)} />{" "}
                <button type="button" disabled={!paymentForm.amount || Number(paymentForm.amount) <= 0 || !paymentForm.payment_date} onClick={() => submitPayment(fee)}>Record payment</button>
                {paymentMessages[fee.id] && <small role="status">{paymentMessages[fee.id]}</small>}
              </td>
              <td>
                <button type="button" onClick={() => downloadFeeStatement(fee.id, fee.learner_name, token)}>PDF</button>
                <details onToggle={(event) => { if (event.currentTarget.open) loadPayments(fee.id); }}>
                  <summary>Payment history</summary>
                  {paymentsByFee[fee.id] ? (
                    <ul>{paymentsByFee[fee.id].map((payment) => (
                      <li key={payment.id}>{payment.payment_date || "Date unavailable"} — {payment.category}: KES {payment.amount.toFixed(2)}{payment.reference ? ` (${payment.reference})` : ""}{payment.is_opening_balance ? " — migrated opening balance" : ""}</li>
                    ))}</ul>
                  ) : <p>Loading payment history…</p>}
                </details>
              </td>
              <td>
                <button type="button" onClick={() => {
                  setFeeForm({
                  learner_name: fee.learner_name,
                  grade: fee.grade,
                  academic_year: fee.academic_year,
                  term: fee.term,
                  pta_required: fee.pta_required,
                  remedials_required: fee.remedials_required,
                  welfare_required: fee.welfare_required,
                  lunch_required: fee.lunch_required,
                  school_required: fee.school_required,
                  });
                  setAcademicYear(fee.academic_year);
                  setTerm(fee.term);
                }}>Edit</button>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </section>

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
    </main>
  );
};

const feeCategories = [
  ["PTA", "pta_required"],
  ["Remedials", "remedials_required"],
  ["Welfare", "welfare_required"],
  ["Lunch", "lunch_required"],
  ["School", "school_required"],
];

function getCurrentTerm() {
  const month = new Date().getMonth() + 1;
  if (month <= 4) return 1;
  if (month <= 8) return 2;
  return 3;
}

function localToday() {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function emptyPaymentForm() {
  return { category: "pta", amount: "", payment_date: localToday(), reference: "", note: "" };
}

function emptyFeeForm(academicYear, term) {
  return {
    learner_name: "", grade: "",
    academic_year: academicYear,
    term,
    pta_required: 0,
    remedials_required: 0,
    welfare_required: 0,
    lunch_required: 0,
    school_required: 0,
  };
}

export default AdminDashboard;
