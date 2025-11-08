from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# Load model and scaler
import joblib

# Load the trained RandomForest model
model = joblib.load(r"E:\Data Science\random_forest_model.pkl")

with open(r"E:\Data Science\scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

# Columns - CORRECTED ORDER to match training
numeric_cols = ["Age", "Creatinine_Level", "BUN", "GFR", "Urine_Output"]
categorical_cols = ["Diabetes", "Hypertension", "CKD_Status"]

# IMPORTANT: Feature order must match training order
# Training order: Age, Creatinine_Level, BUN, Diabetes, Hypertension, GFR, Urine_Output, CKD_Status
feature_order = ["Age", "Creatinine_Level", "BUN", "Diabetes", "Hypertension", "GFR", "Urine_Output", "CKD_Status"]

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json or {}

        # Create DataFrame
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
            return jsonify({"error": "Missing or invalid input values. Please provide all fields."}), 400

        # Type conversion
        df[numeric_cols] = df[numeric_cols].astype(float)
        df[categorical_cols] = df[categorical_cols].astype(int)

        # Scale numeric columns
        df_scaled = df.copy()
        df_scaled[numeric_cols] = scaler.transform(df[numeric_cols])

        # Reorder columns to match training order
        X_input = df_scaled[feature_order]

        # Predict
        pred = model.predict(X_input)[0]
        result = "Dialysis Needed" if int(pred) == 1 else "Dialysis Not Needed"
        return jsonify({"prediction": result})

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    


if __name__ == "__main__":
    app.run(debug=True)