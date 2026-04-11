"""
FactoryShield — Upgraded ML Training Script
- Calibrated XGBoost (isotonic regression) for smooth probabilities
- Multi-class failure type classifier
- New feature engineering (Wear_Rate, Power_Index)
- Saves all 8 required .pkl files
"""

import os
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, roc_auc_score
)
import xgboost as xgb
warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "ai4i_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


# ── 1. Synthetic dataset fallback ─────────────────────────────────────────────
def generate_synthetic_dataset(n_samples: int = 10_000) -> pd.DataFrame:
    np.random.seed(42)
    machine_types = np.random.choice(["L", "M", "H"], size=n_samples, p=[0.6, 0.3, 0.1])
    air_temp     = np.random.normal(300, 2, n_samples)
    process_temp = air_temp + np.random.normal(10, 1, n_samples)
    rot_speed    = np.random.normal(1500, 200, n_samples)
    torque       = np.random.normal(40, 10, n_samples)
    tool_wear    = np.random.uniform(0, 250, n_samples)

    failure = (
        (tool_wear > 200)
        | (torque > 65)
        | ((rot_speed < 1200) & (torque > 55))
        | ((process_temp - air_temp) > 13)
    ).astype(int)
    failure = np.where(np.random.random(n_samples) < 0.02, 1 - failure, failure)

    failure_type = np.where(
        failure == 0, "None",
        np.random.choice(["TWF", "HDF", "PWF", "OSF", "RNF"],
                         size=n_samples, p=[0.45, 0.25, 0.15, 0.10, 0.05])
    )
    return pd.DataFrame({
        "Type":                    machine_types,
        "Air temperature [K]":     air_temp,
        "Process temperature [K]": process_temp,
        "Rotational speed [rpm]":  rot_speed,
        "Torque [Nm]":             torque,
        "Tool wear [min]":         tool_wear,
        "Failure Type":            failure_type,
        "Machine failure":         failure,
    })


# ── 2. Load dataset ───────────────────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    if os.path.exists(DATA_PATH):
        print(f"[INFO] Loading dataset from {DATA_PATH}")
        df = pd.read_csv(DATA_PATH)
    else:
        print("[INFO] Dataset not found — generating synthetic data …")
        df = generate_synthetic_dataset()
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        df.to_csv(DATA_PATH, index=False)
        print(f"[INFO] Synthetic dataset saved to {DATA_PATH}")
    return df


# ── 3. Feature engineering ────────────────────────────────────────────────────
def engineer_features(df: pd.DataFrame):
    df = df.copy()
    le = LabelEncoder()
    df["Type_encoded"] = le.fit_transform(df["Type"])

    df["Temp_Difference"]          = df["Process temperature [K]"] - df["Air temperature [K]"]
    df["Torque_Speed_Interaction"] = df["Torque [Nm]"] * df["Rotational speed [rpm]"]
    df["Wear_Rate"]                = df["Tool wear [min]"] / (df["Rotational speed [rpm]"] + 1)
    df["Power_Index"]              = df["Torque [Nm]"] * df["Rotational speed [rpm]"] / 9550

    # Feature names WITHOUT brackets (XGBoost rejects [ ] in names)
    feature_cols = [
        "Air temperature K",
        "Process temperature K",
        "Rotational speed rpm",
        "Torque Nm",
        "Tool wear min",
        "Type_encoded",
        "Temp_Difference",
        "Torque_Speed_Interaction",
        "Wear_Rate",
        "Power_Index",
    ]

    df = df.rename(columns={
        "Air temperature [K]":     "Air temperature K",
        "Process temperature [K]": "Process temperature K",
        "Rotational speed [rpm]":  "Rotational speed rpm",
        "Torque [Nm]":             "Torque Nm",
        "Tool wear [min]":         "Tool wear min",
    })

    X = df[feature_cols]
    y = df["Machine failure"]
    return X, y, df, feature_cols, le


# ── 4. Train binary failure classifier ───────────────────────────────────────
def train_binary_model(X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled):
    neg, pos = (y_train == 0).sum(), (y_train == 1).sum()
    spw = neg / pos

    print("\n[TRAIN] XGBoost (base, for SHAP) …")
    base_model = xgb.XGBClassifier(
        n_estimators=300, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=spw,
        use_label_encoder=False, eval_metric="logloss",
        random_state=42, n_jobs=-1
    )
    base_model.fit(X_train_scaled, y_train)

    print("[TRAIN] XGBoost (calibrated, for probabilities) …")
    calibrated_model = CalibratedClassifierCV(
        xgb.XGBClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=spw,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, n_jobs=-1
        ),
        method="isotonic", cv=3
    )
    calibrated_model.fit(X_train_scaled, y_train)

    y_pred  = calibrated_model.predict(X_test_scaled)
    y_proba = calibrated_model.predict_proba(X_test_scaled)[:, 1]
    print(f"  Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  Recall   : {recall_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"  ROC-AUC  : {roc_auc_score(y_test, y_proba):.4f}")

    return base_model, calibrated_model


# ── 5. Train failure type classifier ─────────────────────────────────────────
def train_type_model(df, X_train_scaled, X_test_scaled, train_idx, test_idx):
    print("\n[TRAIN] Multi-class failure type classifier …")

    le_type = LabelEncoder()
    y_type  = le_type.fit_transform(df["Failure Type"] if "Failure Type" in df.columns else df.get("failure_type", ["None"] * len(df)))

    y_type_train = y_type[train_idx]
    y_type_test  = y_type[test_idx]

    type_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        use_label_encoder=False, eval_metric="mlogloss",
        random_state=42, n_jobs=-1
    )
    type_model.fit(X_train_scaled, y_type_train)

    y_pred = type_model.predict(X_test_scaled)
    print(f"  Accuracy : {accuracy_score(y_type_test, y_pred):.4f}")
    print(f"  Classes  : {list(le_type.classes_)}")

    return type_model, le_type


# ── 6. Train anomaly detector ─────────────────────────────────────────────────
def train_anomaly_detector(X_train_scaled):
    print("\n[TRAIN] IsolationForest anomaly detector …")
    iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
    iso.fit(X_train_scaled)
    return iso


# ── 7. Main ───────────────────────────────────────────────────────────────────
def main():
    df = load_data()
    print(f"[INFO] Dataset shape: {df.shape}")
    print(f"[INFO] Failure rate : {df['Machine failure'].mean()*100:.2f}%")

    X, y, df_eng, feature_cols, le = engineer_features(df)

    indices = np.arange(len(X))
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, indices, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    base_model, calibrated_model = train_binary_model(
        X_train, X_test, y_train, y_test, X_train_scaled, X_test_scaled
    )
    type_model, le_type = train_type_model(
        df_eng, X_train_scaled, X_test_scaled, idx_train, idx_test
    )
    iso_model = train_anomaly_detector(X_train_scaled)

    # ── Save all 8 artifacts ──────────────────────────────────────────────────
    saves = {
        "xgboost_model.pkl":       calibrated_model,
        "xgboost_base.pkl":        base_model,
        "failure_type_model.pkl":  type_model,
        "isolation_forest.pkl":    iso_model,
        "scaler.pkl":              scaler,
        "feature_cols.pkl":        feature_cols,
        "label_encoder.pkl":       le,
        "label_encoder_type.pkl":  le_type,
    }
    for fname, obj in saves.items():
        path = os.path.join(MODEL_DIR, fname)
        joblib.dump(obj, path)
        print(f"  → {path}")

    print("\n[DONE] All 8 artifacts saved successfully.")


if __name__ == "__main__":
    main()