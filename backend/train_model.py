"""
FactoryShield - ML Model Training Script
Trains XGBoost model on AI4I 2020 Predictive Maintenance Dataset
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score, classification_report
from sklearn.ensemble import RandomForestClassifier, IsolationForest
import xgboost as xgb
import lightgbm as lgb
import shap
import joblib
import json
import os
import warnings
warnings.filterwarnings('ignore')

# ─── Paths ───────────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "ai4i_dataset.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def generate_synthetic_dataset(n=10000):
    """Generate a synthetic AI4I-like dataset if real CSV not available."""
    np.random.seed(42)
    machine_types = np.random.choice(['L', 'M', 'H'], size=n, p=[0.5, 0.3, 0.2])
    air_temp = np.random.normal(300, 2, n)
    process_temp = air_temp + np.random.normal(10, 1, n)
    rotational_speed = np.random.normal(1538, 179, n)
    torque = np.random.normal(40, 10, n)
    tool_wear = np.random.uniform(0, 250, n)

    # Simulate failures with domain logic
    failure_prob = (
        (tool_wear > 200).astype(float) * 0.4 +
        (torque > 60).astype(float) * 0.2 +
        (process_temp - air_temp > 12).astype(float) * 0.15 +
        (rotational_speed < 1200).astype(float) * 0.1 +
        np.random.uniform(0, 0.15, n)
    )
    machine_failure = (failure_prob > 0.45).astype(int)

    df = pd.DataFrame({
        'UDI': range(1, n + 1),
        'Product ID': [f'{t}{i:05d}' for t, i in zip(machine_types, range(1, n + 1))],
        'Type': machine_types,
        'Air temperature [K]': air_temp,
        'Process temperature [K]': process_temp,
        'Rotational speed [rpm]': rotational_speed,
        'Torque [Nm]': torque,
        'Tool wear [min]': tool_wear,
        'Machine failure': machine_failure,
        'TWF': (tool_wear > 200).astype(int),
        'HDF': ((process_temp - air_temp) > 12).astype(int),
        'PWF': (rotational_speed * torque < 3500).astype(int),
        'OSF': (torque > 65).astype(int),
        'RNF': np.random.binomial(1, 0.001, n),
    })
    return df


def load_and_preprocess(path=DATA_PATH):
    """Load dataset and engineer features."""
    if os.path.exists(path):
        print(f"Loading dataset from {path}")
        df = pd.read_csv(path)
    else:
        print("Dataset not found — generating synthetic data...")
        df = generate_synthetic_dataset()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        df.to_csv(path, index=False)
        print(f"Synthetic dataset saved to {path}")

    # Drop non-feature columns
    drop_cols = ['UDI', 'Product ID']
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore')

    # Encode machine type
    le = LabelEncoder()
    df['Type'] = le.fit_transform(df['Type'])

    # Derived features
    df['Temp_Difference'] = df['Process temperature [K]'] - df['Air temperature [K]']
    df['Torque_Speed_Interaction'] = df['Torque [Nm]'] * df['Rotational speed [rpm]']
    df['Power'] = df['Torque [Nm]'] * df['Rotational speed [rpm]'] * (2 * np.pi / 60)
    df['Wear_Rate'] = df['Tool wear [min]'] / (df['Rotational speed [rpm]'] + 1e-6)

    feature_cols = [
        'Type', 'Air temperature [K]', 'Process temperature [K]',
        'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]',
        'Temp_Difference', 'Torque_Speed_Interaction', 'Power', 'Wear_Rate'
    ]
    # Keep only available features
    feature_cols = [c for c in feature_cols if c in df.columns]
    target_col = 'Machine failure'

    X = df[feature_cols]
    y = df[target_col]

    return X, y, feature_cols, le


def train_and_evaluate(X, y, feature_cols):
    """Train multiple models and evaluate."""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = {}

    # ── Random Forest ──────────────────────────────────────────────────────
    print("\n[1/3] Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_proba = rf.predict_proba(X_test)[:, 1]
    results['RandomForest'] = {
        'accuracy': accuracy_score(y_test, rf_pred),
        'precision': precision_score(y_test, rf_pred, zero_division=0),
        'recall': recall_score(y_test, rf_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_test, rf_proba),
    }
    print(f"  Accuracy: {results['RandomForest']['accuracy']:.4f}  AUC: {results['RandomForest']['roc_auc']:.4f}")

    # ── XGBoost ───────────────────────────────────────────────────────────
    print("\n[2/3] Training XGBoost...")
    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        verbosity=0,
    )
    xgb_model.fit(X_train, y_train)
    xgb_pred = xgb_model.predict(X_test)
    xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
    results['XGBoost'] = {
        'accuracy': accuracy_score(y_test, xgb_pred),
        'precision': precision_score(y_test, xgb_pred, zero_division=0),
        'recall': recall_score(y_test, xgb_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_test, xgb_proba),
    }
    print(f"  Accuracy: {results['XGBoost']['accuracy']:.4f}  AUC: {results['XGBoost']['roc_auc']:.4f}")

    # ── LightGBM ──────────────────────────────────────────────────────────
    print("\n[3/3] Training LightGBM...")
    lgb_model = lgb.LGBMClassifier(
        n_estimators=200, learning_rate=0.05, random_state=42, verbose=-1
    )
    lgb_model.fit(X_train, y_train)
    lgb_pred = lgb_model.predict(X_test)
    lgb_proba = lgb_model.predict_proba(X_test)[:, 1]
    results['LightGBM'] = {
        'accuracy': accuracy_score(y_test, lgb_pred),
        'precision': precision_score(y_test, lgb_pred, zero_division=0),
        'recall': recall_score(y_test, lgb_pred, zero_division=0),
        'roc_auc': roc_auc_score(y_test, lgb_proba),
    }
    print(f"  Accuracy: {results['LightGBM']['accuracy']:.4f}  AUC: {results['LightGBM']['roc_auc']:.4f}")

    print("\n── Model Comparison ──────────────────────────────────────────────")
    for name, metrics in results.items():
        print(f"  {name:15s}  Acc={metrics['accuracy']:.4f}  P={metrics['precision']:.4f}  R={metrics['recall']:.4f}  AUC={metrics['roc_auc']:.4f}")

    return xgb_model, rf, lgb_model, X_train, X_test, y_train, y_test, results


def train_anomaly_detector(X):
    """Train Isolation Forest for anomaly detection."""
    print("\nTraining Isolation Forest for anomaly detection...")
    iso_forest = IsolationForest(
        n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1
    )
    iso_forest.fit(X)
    return iso_forest


def save_artifacts(xgb_model, iso_forest, feature_cols, le, results):
    """Save all model artifacts."""
    joblib.dump(xgb_model, os.path.join(MODEL_DIR, "xgboost_model.pkl"))
    joblib.dump(iso_forest, os.path.join(MODEL_DIR, "isolation_forest.pkl"))
    joblib.dump(le, os.path.join(MODEL_DIR, "label_encoder.pkl"))

    metadata = {
        "feature_cols": feature_cols,
        "model_results": results,
        "version": "1.0.0",
    }
    with open(os.path.join(MODEL_DIR, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nAll artifacts saved to {MODEL_DIR}/")


if __name__ == "__main__":
    print("=" * 60)
    print("  FactoryShield — Model Training Pipeline")
    print("=" * 60)

    X, y, feature_cols, le = load_and_preprocess()
    print(f"\nDataset shape: {X.shape}  Failures: {y.sum()} ({y.mean()*100:.1f}%)")

    xgb_model, rf, lgb_model, X_train, X_test, y_train, y_test, results = train_and_evaluate(X, y, feature_cols)

    iso_forest = train_anomaly_detector(X)

    save_artifacts(xgb_model, iso_forest, feature_cols, le, results)

    print("\n✓ Training complete!")
