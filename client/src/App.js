import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  // ---------------- ML STATE ----------------
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

  // ---------------- RAG STATE ----------------
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [ragLoading, setRagLoading] = useState(false);

  const cardRef = useRef(null);

  // ---------------- UI EFFECT ----------------
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (x - cx) / cx;
    const dy = (y - cy) / cy;
    const rotateX = -dy * 6;
    const rotateY = dx * 6;
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  };

  // ---------------- FORM HANDLING ----------------
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
        Diabetes: parseInt(formData.Diabetes),
        Hypertension: parseInt(formData.Hypertension),
        GFR: parseFloat(formData.GFR),
        Urine_Output: parseFloat(formData.Urine_Output),
        CKD_Status: parseInt(formData.CKD_Status)
      };

      const res = await fetch("https://dialysis-predictor.onrender.com/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResult(res.ok ? data.prediction : data.error);
    } catch {
      setResult("Error calling backend");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- RAG FUNCTION ----------------
  const askQuestion = async () => {
    if (!question.trim()) return;

    const userMsg = { type: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);

    setQuestion("");
    setRagLoading(true);

    try {
      const res = await fetch("https://dialysis-predictor.onrender.com/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question })
      });

      const data = await res.json();

      const botMsg = {
        type: "bot",
        text: data.answer || "No response"
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "Error connecting to server" }
      ]);
    } finally {
      setRagLoading(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="page">

      {/* ---------- ML CARD ---------- */}
      <div
        className="card"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <h1>Dialysis Prediction</h1>

        <form onSubmit={handleSubmit} className="form-grid">

          <input type="number" name="Age" placeholder="Age" onChange={handleChange} required />
          <input type="number" name="Creatinine_Level" placeholder="Creatinine" onChange={handleChange} required />
          <input type="number" name="BUN" placeholder="BUN" onChange={handleChange} required />
          <input type="number" name="GFR" placeholder="GFR" onChange={handleChange} required />
          <input type="number" name="Urine_Output" placeholder="Urine Output" onChange={handleChange} required />

          <select name="Diabetes" onChange={handleChange}>
            <option value="0">Diabetes: No</option>
            <option value="1">Diabetes: Yes</option>
          </select>

          <select name="Hypertension" onChange={handleChange}>
            <option value="0">Hypertension: No</option>
            <option value="1">Hypertension: Yes</option>
          </select>

          <select name="CKD_Status" onChange={handleChange}>
            <option value="0">CKD: No</option>
            <option value="1">CKD: Yes</option>
          </select>

          <button type="submit">
            {loading ? "Predicting..." : "Predict"}
          </button>

          {result && <div className="result">Prediction: {result}</div>}
        </form>
      </div>

      {/* ---------- RAG CHAT ---------- */}
      <div className="chat-container">
        <h2>🧠 Dialysis AI Assistant</h2>

        <div className="chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={msg.type === "user" ? "user-msg" : "bot-msg"}>
              {msg.text}
            </div>
          ))}
          {ragLoading && <div className="bot-msg">Thinking...</div>}
        </div>

        <div className="chat-input">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about dialysis..."
            onKeyDown={(e) => e.key === "Enter" && askQuestion()}
          />
          <button onClick={askQuestion}>Send</button>
        </div>
      </div>

    </div>
  );
}

export default App;
