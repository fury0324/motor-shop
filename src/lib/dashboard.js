import { callApi } from './api'

export async function getDashboardStats() {
  return callApi('getDashboardStats')
}

export async function getPredictiveAnalysis() {
  return callApi('getPredictiveAnalysis')
}

export async function getPredictiveAiInsights() {
  return callApi('getPredictiveAiInsights')
}
