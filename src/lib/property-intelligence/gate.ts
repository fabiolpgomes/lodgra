const PROPERTY_INTELLIGENCE_GATE_ENV = 'PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED'

export function isPropertyIntelligenceAnalysisEnabled() {
  return process.env[PROPERTY_INTELLIGENCE_GATE_ENV] !== 'false'
}

export function getPropertyIntelligenceGateMessage() {
  return 'Property Intelligence analysis is disabled by feature gate.'
}
