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
    soil_factors = {"dry": 1.02, "moderate": 1.0, "compact": 1.04, "loose": 0.98, "sandy": 1.03}
    
    for i in range(n_samples):
        # Initial moisture between 15% and 75%
        initial_moisture = round(float(np.clip(np.random.normal(42, 14), 15.0, 75.0)), 1)
        # Target moisture 75%, 80%, 85%, 90%
        target_moisture = round(float(np.random.choice([75.0, 80.0, 85.0, 90.0], p=[0.15, 0.60, 0.15, 0.10])), 1)
        
        if initial_moisture >= target_moisture - 2:
            initial_moisture = target_moisture - round(float(np.random.uniform(10.0, 35.0)), 1)
            
        deficit = target_moisture - initial_moisture
        soil_type = random.choice(soil_conditions)
        soil_multiplier = soil_factors[soil_type]
        
        # Environmental ambient temperature (24C - 36C)
        ambient_temp = round(float(np.random.uniform(24.0, 36.0)), 1)
        # Humidity (35% - 75%)
        humidity = round(float(np.random.uniform(35.0, 75.0)), 1)
        
        # Physical dynamic model:
        # 1. Hydraulic priming / manifold filling latency: ~1.00s
        # 2. Moisture absorption & emitter rate: ~0.025s per percentage point deficit
        # Under this calibrated physics:
        # - 40% -> 80% (deficit 40%): 1.0s + 40*0.025s = ~2.00s
        # - 60% -> 80% (deficit 20%): 1.0s + 20*0.025s = ~1.50s
        # - 40% -> 90% (deficit 50%): 1.0s + 50*0.025s = ~2.25s - 2.30s
        # - 60% -> 90% (deficit 30%): 1.0s + 30*0.025s = ~1.75s
        base_prime = 1.00
        rate_factor = 0.025 * soil_multiplier + (30.0 - ambient_temp) * 0.0005
        ideal_runtime = base_prime + (deficit * rate_factor)
        noise = np.random.normal(0, 0.018)  # physical sensor jitter
        actual_runtime = max(0.2, round(ideal_runtime + noise, 2))
        
        # Actual moisture increase produced
        actual_increase = round(deficit * (1.0 + np.random.normal(0, 0.025)), 1)
        final_moisture = min(100.0, round(initial_moisture + actual_increase, 1))
        
        recent_change = round(float(np.random.normal(-0.25, 0.10)), 2) # gradual drying rate
        prev_runtime = round(float(np.clip(np.random.normal(1.8, 0.5), 0.5, 4.0)), 2)
        
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

