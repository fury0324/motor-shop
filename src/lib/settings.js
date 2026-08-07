// src/lib/settings.js
// Thin wrappers over callApi (see src/lib/api.js) for the shared app
// settings doc — same one-liner style as src/lib/aiApi.js.
import { callApi } from './api'

export const getSettings = () => callApi('getSettings', {})
export const updateSettings = (installmentMarkupPercent) => callApi('updateSettings', { installmentMarkupPercent })
