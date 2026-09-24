import json
import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_irrigation_dataset(n_samples=300, output_csv="ml-service/dataset/training_data.csv", output_json="data/sample/irrigation_training_data.json"):
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    
    np.random.seed(42)
    random.seed(42)
    
    records = []
    base_time = datetime.now() - timedelta(days=30)
    
    soil_conditions = ["dry", "moderate", "compact", "loose", "sandy"]
    soil_factors = {"dry": 1.05, "moderate": 1.0, "compact": 1.15, "loose": 0.95, "sandy": 1.20}
    
    for i in range(n_samples):
        # Initial moisture mostly between 15% and 65%
        initial_moisture = round(float(np.clip(np.random.normal(32, 10), 10, 68)), 1)
        # Target moisture default 80%, varied between 70% and 90%
        target_moisture = round(float(np.random.choice([75.0, 80.0, 85.0, 90.0], p=[0.15, 0.65, 0.15, 0.05])), 1)
        
        if initial_moisture >= target_moisture - 2:
            initial_moisture = target_moisture - 15.0
            
        deficit = target_moisture - initial_moisture
        soil_type = random.choice(soil_conditions)
        soil_multiplier = soil_factors[soil_type]
        
        # Environmental ambient temperature (22C - 38C)
        ambient_temp = round(float(np.random.uniform(24.0, 36.0)), 1)
        # Humidity (30% - 75%)
        humidity = round(float(np.random.uniform(35.0, 70.0)), 1)
        
        # Physical dynamic model:
        # Moisture gain per second of pump: approx 18.5% to 21% per sec, with slight non-linearity
        # def = (target - initial)
        # Pump runtime (sec) needed = deficit / (base_gain_rate / soil_multiplier) + noise
        base_rate = 19.5 + (35.0 - ambient_temp) * 0.05  # slightly higher evaporation in heat
        effective_rate = (base_rate / soil_multiplier) * (1.0 - (initial_moisture / 250.0))
        
        ideal_runtime = deficit / effective_rate
        noise = np.random.normal(0, 0.08) # physical measurement noise
        actual_runtime = max(0.2, round(ideal_runtime + noise, 2))
        
        # Actual moisture increase produced
        actual_increase = round(actual_runtime * effective_rate * (1 + np.random.normal(0, 0.03)), 1)
        final_moisture = min(100.0, round(initial_moisture + actual_increase, 1))
        
        recent_change = round(float(np.random.normal(-0.25, 0.15)), 2) # gradual drying rate
        prev_runtime = round(float(np.clip(np.random.normal(1.8, 0.6), 0.5, 4.0)), 2)
        
        sample_time = base_time + timedelta(hours=i * 2.4, minutes=random.randint(0, 59))
        
        record = {
            "initialMoisture": initial_moisture,
            "targetMoisture": target_moisture,
            "moistureDeficit": round(deficit, 1),
            "pumpRuntimeSeconds": actual_runtime,
            "finalMoisture": final_moisture,
            "moistureIncrease": actual_increase,
            "soilCondition": soil_type,
            "ambientTemp": ambient_temp,
            "humidity": humidity,
            "recentMoistureChange": recent_change,
            "previousPumpRuntime": prev_runtime,
            "pumpId": "PUMP_2",
            "source": "DEMO DATA",
            "timestamp": sample_time.isoformat() + "Z"
        }
        records.append(record)
        
    df = pd.DataFrame(records)
    df.to_csv(output_csv, index=False)
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    print(f"Generated {len(records)} realistic training samples.")
    print(f"Saved to {output_csv} and {output_json}")

if __name__ == "__main__":
    generate_irrigation_dataset()
