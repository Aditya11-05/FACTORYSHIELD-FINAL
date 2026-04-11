import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PredictionInput {
  machine_id?:          string
  machine_type?:        string
  air_temperature:      number
  process_temperature:  number
  rotational_speed:     number
  torque:               number
  tool_wear:            number
  include_explanation?: boolean
}

export interface ShapContribution {
  feature:    string
  value:      number
  percentage: number
  direction:  string
}

export interface PredictionResult {
  machine_id:                 string
  failure_probability:        number
  predicted_failure:          boolean
  failure_type:               string
  risk_level:                 'Low' | 'Medium' | 'High' | 'Critical'
  maintenance_recommendation: string
  explanation?: {
    method:        string
    contributions: ShapContribution[]
    base_value:    number
  }
}

export interface AnomalyResult {
  machine_id:    string
  anomaly_score: number
  is_anomaly:    boolean
  status:        'Normal' | 'Warning' | 'Critical'
  last_checked:  string
  recommendation: string
}

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// ─── API Calls ────────────────────────────────────────────────────────────────
export async function predictFailure(input: PredictionInput): Promise<PredictionResult> {
  const { data } = await api.post<PredictionResult>('/api/predict', input)
  return data
}

export async function predictBulk(file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/api/predict-bulk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getAnomalies(): Promise<{ machines: AnomalyResult[] }> {
  const { data } = await api.get<{ machines: AnomalyResult[] }>('/api/anomaly')
  return data
}

export async function chatWithAI(message: string, history: ChatMessage[] = []) {
  const { data } = await api.post<{ reply: string }>('/api/chat', { message, history })
  return data.reply
}
