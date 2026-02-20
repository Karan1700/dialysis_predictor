from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import joblib
import os

# ----------- RAG IMPORTS -----------
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

# =========================================
# 🔹 INIT APP (FIXED POSITION)
# =========================================

app = Flask(__name__)

# ✅ Proper CORS config
CORS(app, origins=["http://localhost:3001"], supports_credentials=True)

# ✅ Handle preflight globally
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

# Load env variables
load_dotenv()

# =========================================
# 🔹 LOAD ML MODEL
# =========================================

MODEL_PATH = os.path.join(os.path.dirname(__file__), "random_forest_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")

model = joblib.load(MODEL_PATH)

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)

numeric_cols = ["Age", "Creatinine_Level", "BUN", "GFR", "Urine_Output"]
categorical_cols = ["Diabetes", "Hypertension", "CKD_Status"]

feature_order = [
    "Age", "Creatinine_Level", "BUN",
    "Diabetes", "Hypertension",
    "GFR", "Urine_Output", "CKD_Status"
]

# =========================================
# 🔹 LOAD RAG SYSTEM
# =========================================

def load_rag_system(index_path="faiss_index"):
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vectorstore = FAISS.load_local(
        index_path,
        embeddings,
        allow_dangerous_deserialization=True
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        temperature=0.2,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

    return retriever, llm


retriever, llm = load_rag_system()

# =========================================
# 🔹 PROMPT TEMPLATE
# =========================================

prompt_template = """
You are a helpful medical assistant specialized in kidney dialysis.

Use ONLY the context below to answer the user's question.
If the answer is not in the context, say:
"I don't have enough information from the provided documents."

Context:
{context}

Question:
{question}

Answer:
"""

PROMPT = ChatPromptTemplate.from_template(prompt_template)


def format_docs(docs):
    return "\n\n".join([doc.page_content for doc in docs])


# =========================================
# 🔹 ML PREDICTION ROUTE
# =========================================

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    try:
        data = request.json or {}

        df = pd.DataFrame([{
            "Age": data.get("Age"),
            "Creatinine_Level": data.get("Creatinine_Level"),
            "BUN": data.get("BUN"),
            "GFR": data.get("GFR"),
            "Urine_Output": data.get("Urine_Output"),
            "Diabetes": data.get("Diabetes"),
            "Hypertension": data.get("Hypertension"),
            "CKD_Status": data.get("CKD_Status")
        }])

        if df.isnull().any().any():
            return jsonify({"error": "Missing or invalid input values"}), 400

        df[numeric_cols] = df[numeric_cols].astype(float)
        df[categorical_cols] = df[categorical_cols].astype(int)

        df_scaled = df.copy()
        df_scaled[numeric_cols] = scaler.transform(df[numeric_cols])

        X_input = df_scaled[feature_order]

        pred = model.predict(X_input)[0]
        result = "Dialysis Needed" if int(pred) == 1 else "Dialysis Not Needed"

        return jsonify({"prediction": result})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================
# 🔹 RAG ROUTE
# =========================================

@app.route("/ask", methods=["POST", "OPTIONS"])
def ask():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    try:
        data = request.json or {}
        question = data.get("question")

        if not question:
            return jsonify({"error": "Question is required"}), 400

        docs = retriever.invoke(question)

        if not docs:
            return jsonify({
                "answer": "I don't have enough information from the provided documents."
            })

        context = format_docs(docs)

        final_prompt = PROMPT.invoke({
            "context": context,
            "question": question
        })

        response = llm.invoke(final_prompt)

        return jsonify({
            "answer": response.content
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================
# 🔹 HEALTH CHECK
# =========================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Dialysis Assistant API is running (ML + RAG)"})


# =========================================
# 🔹 RUN SERVER
# =========================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
