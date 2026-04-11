# FactoryShield 🛡️
### AI-Powered Predictive Maintenance Platform

A full-stack industrial monitoring system with machine failure prediction, explainable AI root cause analysis, anomaly detection, and a GenAI chatbot for engineers.

---

## Tech Stack

| Layer      | Tech                                      |
|------------|-------------------------------------------|
| Frontend   | React 18, Vite, TypeScript, TailwindCSS, Recharts |
| Backend    | FastAPI, Python 3.11+                     |
| ML Models  | XGBoost, RandomForest, IsolationForest, SHAP |
| LLM        | LangChain + OpenAI / Groq (Llama)         |
| Auth / DB  | Supabase                                  |

---

## Project Structure

```
FactoryShield/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── model.py             # ML prediction logic
│   │   ├── anomaly.py           # Isolation Forest
│   │   ├── explain.py           # SHAP explanations
│   │   ├── chatbot.py           # LangChain AI assistant
│   │   └── routers/
│   │       ├── predict.py       # POST /api/predict
│   │       ├── anomaly.py       # GET  /api/anomaly
│   │       ├── explain.py       # POST /api/explain
│   │       └── chat.py          # POST /api/chat
│   ├── models/                  # Saved .pkl files (generated)
│   ├── data/                    # ai4i_dataset.csv (generated)
│   ├── scripts/
│   │   └── train_model.py       # ML training script
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── LiveMonitoring.tsx
    │   │   ├── MachineFail.tsx   # Core AI prediction UI
    │   │   ├── AnomalyPage.tsx
    │   │   ├── ChatbotPage.tsx
    │   │   ├── AnalyticsPage.tsx
    │   │   ├── IncidentsPage.tsx
    │   │   └── SettingsPage.tsx
    │   ├── components/
    │   │   └── layout/
    │   │       └── DashboardLayout.tsx
    │   ├── hooks/useAuth.tsx     # Supabase auth context
    │   ├── lib/api.ts            # Axios API client
    │   ├── supabaseClient.ts
    │   └── App.tsx
    ├── package.json
    └── .env.example
```

---

## Quick Start

### 1. Train the ML Models

```bash
cd backend
pip install -r requirements.txt
python scripts/train_model.py
```

This generates:
- `models/xgboost_model.pkl`
- `models/isolation_forest.pkl`
- `models/scaler.pkl`
- `models/feature_cols.pkl`
- `models/label_encoder.pkl`
- `data/ai4i_dataset.csv` (synthetic if real not present)

### 2. Start the Backend

```bash
cd backend
cp .env.example .env       # Fill in your API keys
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Start the Frontend

```bash
cd frontend
npm install
cp .env.example .env       # Fill in Supabase keys (optional)
npm run dev
```

App: http://localhost:5173

---

## API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/api/predict`        | Single machine failure prediction  |
| POST   | `/api/predict-bulk`   | CSV batch predictions              |
| GET    | `/api/anomaly`        | Fleet-wide anomaly scores          |
| POST   | `/api/anomaly/detect` | Single machine anomaly detection   |
| POST   | `/api/explain`        | SHAP root cause analysis           |
| POST   | `/api/chat`           | AI chatbot for engineers           |

### Example: POST /api/predict

```json
{
  "machine_id": "CNC-01",
  "machine_type": "M",
  "air_temperature": 300.5,
  "process_temperature": 312.3,
  "rotational_speed": 1420,
  "torque": 58.7,
  "tool_wear": 215,
  "include_explanation": true
}
```

Response:
```json
{
  "machine_id": "CNC-01",
  "failure_probability": 78.4,
  "predicted_failure": true,
  "failure_type": "Tool Wear Failure",
  "risk_level": "Critical",
  "maintenance_recommendation": "Schedule immediate tool replacement.",
  "explanation": {
    "method": "SHAP TreeExplainer",
    "contributions": [
      { "feature": "Tool Wear", "percentage": 40.2, "direction": "increases" },
      { "feature": "Torque",    "percentage": 25.1, "direction": "increases" },
      { "feature": "Temperature Difference", "percentage": 13.4, "direction": "increases" }
    ]
  }
}
```

---

## Authentication (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **anon public key**
3. Add to `frontend/.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Enable **Email Auth** in Supabase Dashboard → Authentication → Providers

> **Demo mode**: Click "Continue as Demo User" on the login page — no Supabase required.

---

## LLM / Chatbot Configuration

### Option A — OpenAI
```bash
# backend/.env
OPENAI_API_KEY=sk-...
```

### Option B — Groq (free, fast Llama)
```bash
# backend/.env
GROQ_API_KEY=gsk_...
```
Get a free key at [console.groq.com](https://console.groq.com)

### Fallback
If neither key is set, the chatbot uses a rule-based engine with full knowledge of all 12 machines — no API key needed.

---

## Using the Real AI4I Dataset

Download from [UCI ML Repository](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset):

```bash
# Place the downloaded file here:
backend/data/ai4i_dataset.csv
```

Re-run training:
```bash
cd backend && python scripts/train_model.py
```

---

## Bulk CSV Upload Format

```csv
machine_id,Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min]
CNC-01,M,300.5,310.2,1420,42.5,180
CNC-02,H,301.1,311.8,1650,38.2,95
```

---

## Dashboard Features

| Page              | Description                                     |
|-------------------|-------------------------------------------------|
| Dashboard         | KPI cards, incident trends, alert distribution  |
| Live Monitoring   | Real-time machine grid with live telemetry      |
| Machine Failure AI| Manual + bulk CSV prediction with SHAP viz      |
| Anomaly Detection | Isolation Forest fleet scores + radar chart     |
| AI Assistant      | LangChain chatbot with machine knowledge base   |
| Analytics         | MTBF, failure trends, OEE, scatter plots        |
| Incident Reports  | Tracked incidents with status and assignees     |
| Settings          | Thresholds, API keys, Supabase config           |
