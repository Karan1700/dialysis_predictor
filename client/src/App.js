import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  const [formData, setFormData] = useState({
    Age: "",
    Creatinine_Level: "",
    BUN: "",
    Diabetes: "0",
    Hypertension: "0",
    GFR: "",
    Urine_Output: "",
    CKD_Status: "0"
  });

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const cardRef = useRef(null);

  // small JS 3D tilt effect without external libraries
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within element
    const y = e.clientY - rect.top;  // y position within element
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (x - cx) / cx; // from -1 to 1
    const dy = (y - cy) / cy; // from -1 to 1
    const rotateX = -dy * 6; // tilt strength
    const rotateY = dx * 6;
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01,1.01,1.01)`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  };

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult("");

    try {
      const payload = {
        Age: parseFloat(formData.Age),
        Creatinine_Level: parseFloat(formData.Creatinine_Level),
        BUN: parseFloat(formData.BUN),
        Diabetes: parseInt(formData.Diabetes, 10),
        Hypertension: parseInt(formData.Hypertension, 10),
        GFR: parseFloat(formData.GFR),
        Urine_Output: parseFloat(formData.Urine_Output),
        CKD_Status: parseInt(formData.CKD_Status, 10)
      };

      const res = await fetch("https://dialysis-predictor.onrender.com/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) setResult(String(data.prediction));
      else setResult(data.error || "Prediction failed");
    } catch (err) {
      console.error(err);
      setResult("Error calling backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div
        className="card"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-labelledby="formTitle"
      >
        <header className="card-header">
          <div>
            <h1 id="formTitle" className="title">Dialysis Prediction</h1>
            <p className="subtitle">Enter patient metrics to get a model prediction</p>
          </div>
          <div className="meta">Model v1 · Demo</div>
        </header>

        <form onSubmit={handleSubmit} className="form-grid" noValidate>
          <label className="field">
            <span className="label-text">Age</span>
            <input name="Age" type="number" step="1" value={formData.Age} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="label-text">Creatinine Level</span>
            <input name="Creatinine_Level" type="number" step="any" value={formData.Creatinine_Level} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="label-text">BUN</span>
            <input name="BUN" type="number" step="any" value={formData.BUN} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="label-text">GFR</span>
            <input name="GFR" type="number" step="any" value={formData.GFR} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="label-text">Urine Output</span>
            <input name="Urine_Output" type="number" step="any" value={formData.Urine_Output} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="label-text">Diabetes (0/1)</span>
            <select name="Diabetes" value={formData.Diabetes} onChange={handleChange}>
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </label>

          <label className="field">
            <span className="label-text">Hypertension (0/1)</span>
            <select name="Hypertension" value={formData.Hypertension} onChange={handleChange}>
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </label>

          <label className="field">
            <span className="label-text">CKD Status (0/1)</span>
            <select name="CKD_Status" value={formData.CKD_Status} onChange={handleChange}>
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </label>

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner" aria-hidden /> : null}
              {loading ? "Predicting..." : "Predict"}
            </button>

            <div className="result-area" aria-live="polite">
              {result ? <div className="result-badge">Prediction: <strong>{result}</strong></div>
              : <div className="hint">Result will appear here</div>}
            </div>
          </div>
        </form>

        <footer className="card-footer">
          <small>Tip: Use realistic clinical values. This UI is for demonstration only.</small>
        </footer>
      </div>
    </div>
  );
}

export default App;
