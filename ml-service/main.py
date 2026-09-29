import os
import time
import json
import joblib
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_CSV_PATH = os.path.join(os.path.dirname(__file__), "dataset", "training_data.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

app = FastAPI(
    title="TerraWave AI - Irrigation ML Service",
    description="Supervised ML service predicting irrigation pump runtime based on soil moisture dynamics",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FEATURE_COLS = [
    "initialMoisture",
    "targetMoisture",
    "moistureDeficit",
    "recentMoistureChange",
    "previousPumpRuntime"
]

TARGET_COL = "pumpRuntimeSeconds"

# In-memory model registry & state
model_registry = {}
model_metrics = {}
active_model_name = "RandomForestRegressor"
model_version = "v1.0"
last_trained_time = None
training_samples_count = 0
total_samples_count = 0
real_data_samples_count = 0

class PredictionRequest(BaseModel):
    current_moisture: float
    target_moisture: float = 80.0
    recent_moisture_change: Optional[float] = -0.25
    previous_pump_runtime: Optional[float] = 2.0
    soil_condition: Optional[str] = "moderate"

class TrainRecord(BaseModel):
    initialMoisture: float
    targetMoisture: float
    pumpRuntimeSeconds: float
    finalMoisture: Optional[float] = None
    moistureIncrease: Optional[float] = None
    moistureDeficit: Optional[float] = None
    recentMoistureChange: Optional[float] = -0.25
    previousPumpRuntime: Optional[float] = 2.0
    soilCondition: Optional[str] = "moderate"
    source: Optional[str] = "REAL SENSOR HARDWARE"
    timestamp: Optional[str] = None
    realData: Optional[bool] = True

class TrainRequest(BaseModel):
    records: Optional[List[TrainRecord]] = None

class ActiveModelRequest(BaseModel):
    model_name: str

def init_and_train_all(df: pd.DataFrame):
    global model_registry, model_metrics, last_trained_time, training_samples_count, total_samples_count, real_data_samples_count
    
    total_samples_count = len(df)
    training_samples_count = len(df)
    
    if "source" in df.columns:
        real_mask = df["source"].astype(str).str.contains("REAL|LIVE|esp32", case=False, na=False)
        real_data_samples_count = int(real_mask.sum())
    else:
        real_data_samples_count = 0
    
    # Calculate deficit if missing
    if "moistureDeficit" not in df.columns:
        df["moistureDeficit"] = df["targetMoisture"] - df["initialMoisture"]
    if "recentMoistureChange" not in df.columns:
        df["recentMoistureChange"] = -0.25
    if "previousPumpRuntime" not in df.columns:
        df["previousPumpRuntime"] = 2.0
        
    X = df[FEATURE_COLS].copy()
    y = df[TARGET_COL].copy()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    candidates = {
        "RandomForestRegressor": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
        "LinearRegression": LinearRegression(),
        "DecisionTreeRegressor": DecisionTreeRegressor(max_depth=6, random_state=42),
        "GradientBoostingRegressor": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    }
    
    metrics_summary = {}
    
    for name, model in candidates.items():
        t0 = time.time()
        model.fit(X_train, y_train)
        train_time_ms = round((time.time() - t0) * 1000, 2)
        
        t1 = time.time()
        y_pred = model.predict(X_test)
        inference_time_ms = round((time.time() - t1) * 1000 / len(X_test), 3)
        
        mae = float(mean_absolute_error(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, y_pred))
        
        # 5-fold cross validation score
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="r2")
        cv_mean_r2 = float(np.mean(cv_scores))
        
        # Feature importances if available
        feature_importance = {}
        if hasattr(model, "feature_importances_"):
            for col, imp in zip(FEATURE_COLS, model.feature_importances_):
                feature_importance[col] = round(float(imp) * 100, 2)
        elif hasattr(model, "coef_"):
            # Normalized absolute coefficients for linear regression
            coef_abs = np.abs(model.coef_)
            total = np.sum(coef_abs) if np.sum(coef_abs) > 0 else 1.0
            for col, c in zip(FEATURE_COLS, coef_abs):
                feature_importance[col] = round(float(c / total) * 100, 2)
                
        # Scatter actual vs predicted (first 25 test points)
        sample_size = min(30, len(y_test))
        actual_vs_pred = []
        for a, p in zip(y_test.iloc[:sample_size], y_pred[:sample_size]):
            actual_vs_pred.append({
                "actual": round(float(a), 2),
                "predicted": round(float(p), 2),
                "error": round(float(p - a), 2)
            })
            
        # Residuals
        residuals = (y_test - y_pred).tolist()
        
        # Error distribution histogram (bins from -0.5 to +0.5)
        hist, bin_edges = np.histogram(residuals, bins=10)
        distribution = []
        for i in range(len(hist)):
            distribution.append({
                "bin": f"{bin_edges[i]:.2f} to {bin_edges[i+1]:.2f}s",
                "rangeMid": round(float((bin_edges[i] + bin_edges[i+1]) / 2), 3),
                "count": int(hist[i])
            })
            
        metrics_summary[name] = {
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "cv_mean_r2": round(cv_mean_r2, 4),
            "train_time_ms": train_time_ms,
            "inference_time_ms": inference_time_ms,
            "feature_importance": feature_importance,
            "actual_vs_pred": actual_vs_pred,
            "error_distribution": distribution,
            "residual_points": [round(float(r), 3) for r in residuals[:30]]
        }
        
        # Save model to disk
        model_path = os.path.join(MODELS_DIR, f"{name}.joblib")
        joblib.dump(model, model_path)
        model_registry[name] = model
        
    model_metrics = metrics_summary
    last_trained_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{datetime.now().isoformat()}] Trained all models successfully. Samples: {len(df)}")

# Train on startup using dataset
if not os.path.exists(DATA_CSV_PATH):
    try:
        from generate_dataset import generate_irrigation_dataset
        generate_irrigation_dataset()
    except Exception as e:
        print(f"Could not auto-generate dataset: {e}")

if os.path.exists(DATA_CSV_PATH):
    df_init = pd.read_csv(DATA_CSV_PATH)
    init_and_train_all(df_init)
else:
    print(f"Warning: {DATA_CSV_PATH} not found. Generate dataset first.")

@app.get("/")
def root():
    return {
        "service": "TerraWave AI ML Service",
        "active_model": active_model_name,
        "version": model_version,
        "status": "online"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "active_model": active_model_name,
        "model_version": model_version,
        "models_loaded": list(model_registry.keys()),
        "last_trained": last_trained_time,
        "training_samples": training_samples_count
    }

@app.post("/predict")
def predict(req: PredictionRequest):
    global active_model_name, model_registry, model_metrics
    
    if active_model_name not in model_registry:
        raise HTTPException(status_code=500, detail=f"Model {active_model_name} is not loaded.")
        
    # Safety boundary: if current moisture >= target, runtime is 0
    if req.current_moisture >= req.target_moisture:
        return {
            "predicted_runtime_seconds": 0.0,
            "model": active_model_name,
            "model_version": model_version,
            "confidence_r2": model_metrics.get(active_model_name, {}).get("r2", 0.95),
            "moisture_deficit": 0.0,
            "current_moisture": req.current_moisture,
            "target_moisture": req.target_moisture,
            "safety_clamped": False,
            "explanation": f"Current moisture ({req.current_moisture}%) is already at or above target ({req.target_moisture}%). Irrigation not required."
        }
        
    deficit = req.target_moisture - req.current_moisture
    
    feature_vector = pd.DataFrame([{
        "initialMoisture": req.current_moisture,
        "targetMoisture": req.target_moisture,
        "moistureDeficit": deficit,
        "recentMoistureChange": req.recent_moisture_change if req.recent_moisture_change is not None else -0.25,
        "previousPumpRuntime": req.previous_pump_runtime if req.previous_pump_runtime is not None else 2.0
    }])
    
    model = model_registry[active_model_name]
    raw_pred = float(model.predict(feature_vector)[0])
    
    # Model safety bounds: clamp between 0.1s and 30.0s (MAX_PUMP_RUNTIME)
    clamped = False
    predicted_runtime = raw_pred
    if predicted_runtime < 0.1:
        predicted_runtime = 0.1
        clamped = True
    elif predicted_runtime > 30.0:
        predicted_runtime = 30.0
        clamped = True
        
    predicted_runtime = round(predicted_runtime, 2)
    current_metrics = model_metrics.get(active_model_name, {})
    r2_score_val = current_metrics.get("r2", None)
    
    explanation = (
        f"Current moisture: {req.current_moisture}%, Target: {req.target_moisture}% "
        f"(Deficit: {round(deficit, 1)}%). The {active_model_name} model predicts {predicted_runtime}s "
        f"of pump runtime to reach target. Post-irrigation sensor feedback will be evaluated."
    )
    
    return {
        "predicted_runtime_seconds": predicted_runtime,
        "raw_prediction": round(raw_pred, 3),
        "model": active_model_name,
        "model_version": model_version,
        "confidence_r2": r2_score_val,
        "moisture_deficit": round(deficit, 1),
        "current_moisture": req.current_moisture,
        "target_moisture": req.target_moisture,
        "safety_clamped": clamped,
        "explanation": explanation
    }

@app.post("/predict-all")
def predict_all(req: PredictionRequest):
    global model_registry, model_metrics
    results = {}
    deficit = max(0.0, req.target_moisture - req.current_moisture)
    
    if req.current_moisture >= req.target_moisture:
        for name in ["RandomForestRegressor", "GradientBoostingRegressor", "DecisionTreeRegressor", "LinearRegression"]:
            results[name] = 0.0
        return {
            "current_moisture": req.current_moisture,
            "target_moisture": req.target_moisture,
            "moisture_deficit": 0.0,
            "predictions": results
        }
        
    feature_vector = pd.DataFrame([{
        "initialMoisture": req.current_moisture,
        "targetMoisture": req.target_moisture,
        "moistureDeficit": deficit,
        "recentMoistureChange": req.recent_moisture_change if req.recent_moisture_change is not None else -0.25,
        "previousPumpRuntime": req.previous_pump_runtime if req.previous_pump_runtime is not None else 2.0
    }])
    
    for name in ["RandomForestRegressor", "GradientBoostingRegressor", "DecisionTreeRegressor", "LinearRegression"]:
        if name in model_registry:
            pred = float(model_registry[name].predict(feature_vector)[0])
            clamped = max(0.1, min(30.0, pred))
            results[name] = round(clamped, 2)
        else:
            # Physics-based baseline
            results[name] = round(max(0.1, min(30.0, 0.5 + deficit * 0.045)), 2)
            
    return {
        "current_moisture": req.current_moisture,
        "target_moisture": req.target_moisture,
        "moisture_deficit": round(deficit, 1),
        "predictions": results
    }

@app.post("/train")
def train(req: TrainRequest):
    global model_registry, model_metrics, last_trained_time, total_samples_count, real_data_samples_count
    
    # Load base dataset
    df = pd.read_csv(DATA_CSV_PATH) if os.path.exists(DATA_CSV_PATH) else pd.DataFrame()
    
    # Append any new real irrigation records
    if req.records and len(req.records) > 0:
        new_data = [r.model_dump() if hasattr(r, 'model_dump') else r.dict() for r in req.records]
        new_df = pd.DataFrame(new_data)
        df = pd.concat([df, new_df], ignore_index=True)
        # Save updated dataset
        df.to_csv(DATA_CSV_PATH, index=False)
        
    if len(df) < 10:
        raise HTTPException(status_code=400, detail="Insufficient training data. Need at least 10 records.")
        
    init_and_train_all(df)
    
    return {
        "success": True,
        "message": f"Retrained all models successfully on {len(df)} samples.",
        "active_model": active_model_name,
        "metrics": model_metrics.get(active_model_name, {}),
        "timestamp": last_trained_time,
        "total_samples": len(df),
        "real_data_samples": real_data_samples_count
    }

@app.get("/metrics")
def get_metrics():
    global active_model_name, model_metrics, total_samples_count, real_data_samples_count
    if active_model_name not in model_metrics:
        raise HTTPException(status_code=404, detail="Metrics not available.")
    return {
        "model": active_model_name,
        "model_version": model_version,
        "last_trained": last_trained_time,
        "training_samples": total_samples_count,
        "total_samples": total_samples_count,
        "real_data_samples": real_data_samples_count,
        "metrics": model_metrics[active_model_name]
    }

@app.get("/feature-importance")
def get_feature_importance():
    global active_model_name, model_metrics
    if active_model_name not in model_metrics:
        raise HTTPException(status_code=404, detail="Feature importance not available.")
    
    importance_dict = model_metrics[active_model_name].get("feature_importance", {})
    items = [{"feature": k, "importance": v} for k, v in importance_dict.items()]
    # Sort descending
    items.sort(key=lambda x: x["importance"], reverse=True)
    return {
        "model": active_model_name,
        "features": items
    }

@app.get("/compare-models")
def compare_models():
    global model_metrics, active_model_name
    comparisons = []
    for name, metrics in model_metrics.items():
        comparisons.append({
            "model": name,
            "is_active": name == active_model_name,
            "mae": metrics["mae"],
            "mse": metrics["mse"],
            "rmse": metrics["rmse"],
            "r2": metrics["r2"],
            "cv_mean_r2": metrics["cv_mean_r2"],
            "train_time_ms": metrics["train_time_ms"],
            "inference_time_ms": metrics["inference_time_ms"]
        })
    return {
        "active_model": active_model_name,
        "comparison": comparisons
    }

@app.post("/set-active-model")
def set_active_model(req: ActiveModelRequest):
    global active_model_name, model_registry
    if req.model_name not in model_registry:
        raise HTTPException(status_code=400, detail=f"Invalid model name. Available: {list(model_registry.keys())}")
    active_model_name = req.model_name
    return {
        "success": True,
        "active_model": active_model_name,
        "metrics": model_metrics.get(active_model_name, {})
    }

@app.get("/training-data-summary")
def training_data_summary():
    if not os.path.exists(DATA_CSV_PATH):
        return {"total": 0, "samples": []}
    df = pd.read_csv(DATA_CSV_PATH)
    sample_records = df.head(10).to_dict(orient="records")
    return {
        "total_records": len(df),
        "columns": list(df.columns),
        "sample": sample_records
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
