/**
 * Deterministic Device Trust Scoring System
 * 
 * Uses non-ML signals to calculate device trust scores:
 * - Tamper event frequency and severity
 * - Enforcement stability (uptime, consistency)
 * - Time-based decay for historical events
 * - Network integrity signals
 * - Policy compliance patterns
 */

// Trust level definitions
export type TrustLevel = 'high' | 'medium' | 'low' | 'critical';

export interface TrustScore {
  score: number;           // 0-100
  level: TrustLevel;
  breakdown: TrustBreakdown;
  factors: TrustFactor[];
  lastCalculated: number;
  deviceId: string;
}

export interface TrustBreakdown {
  tamperScore: number;       // 0-30 points
  stabilityScore: number;    // 0-25 points
  complianceScore: number;   // 0-25 points
  networkScore: number;      // 0-10 points
  historyScore: number;      // 0-10 points
}

export interface TrustFactor {
  id: string;
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  value: number;
  description: string;
  recommendation?: string;
}

export interface TamperEventInput {
  id: string;
  eventType: string;
  timestamp: number;
  resolved: boolean;
  severity?: 'low' | 'medium' | 'high';
}

export interface EnforcementSession {
  startTime: number;
  endTime?: number;
  policyId: string;
  wasInterrupted: boolean;
  tamperEvents: number;
}

export interface DeviceTrustInput {
  deviceId: string;
  tamperEvents: TamperEventInput[];
  enforcementSessions: EnforcementSession[];
  firstSeenAt: number;
  lastActiveAt: number;
  totalExamsTaken: number;
  networkAnomalies: number;
  policyViolations: number;
  successfulExams: number;
}

// Scoring configuration
export interface TrustScoringConfig {
  // Tamper event weights
  tamperEventWeights: Record<string, number>;
  
  // Time decay settings
  decayHalfLifeDays: number;
  
  // Thresholds
  highTrustThreshold: number;
  mediumTrustThreshold: number;
  lowTrustThreshold: number;
  
  // Stability settings
  minSessionsForStability: number;
  
  // Maximum points per category
  maxTamperScore: number;
  maxStabilityScore: number;
  maxComplianceScore: number;
  maxNetworkScore: number;
  maxHistoryScore: number;
}

// Default configuration
export const DEFAULT_TRUST_CONFIG: TrustScoringConfig = {
  tamperEventWeights: {
    'app_backgrounded': 2,
    'app_closed_during_exam': 5,
    'network_disconnected': 3,
    'network_reconnected': 0, // Neutral
    'connectivity_issue_detected': 4,
    'extended_focus_loss': 3,
    'dns_manipulation_detected': 8,
    'extension_disabled': 10,
    'policy_bypassed': 10,
    'unknown': 5,
  },
  decayHalfLifeDays: 30,
  highTrustThreshold: 80,
  mediumTrustThreshold: 60,
  lowTrustThreshold: 40,
  minSessionsForStability: 3,
  maxTamperScore: 30,
  maxStabilityScore: 25,
  maxComplianceScore: 25,
  maxNetworkScore: 10,
  maxHistoryScore: 10,
};

/**
 * Calculate time-based decay factor
 * Events lose impact over time following exponential decay
 */
export function calculateDecayFactor(
  eventTimestamp: number,
  halfLifeDays: number = 30
): number {
  const now = Date.now();
  const ageMs = now - eventTimestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay: factor = 0.5^(age/halfLife)
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * Get severity multiplier for tamper events
 */
function getSeverityMultiplier(severity?: 'low' | 'medium' | 'high'): number {
  switch (severity) {
    case 'high': return 1.5;
    case 'medium': return 1.0;
    case 'low': return 0.5;
    default: return 1.0;
  }
}

/**
 * Calculate tamper score (0-30 points)
 * Lower is worse, starts at max and deducts for events
 */
export function calculateTamperScore(
  events: TamperEventInput[],
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  let totalPenalty = 0;

  // Group events by type for analysis
  const eventsByType = new Map<string, TamperEventInput[]>();
  events.forEach(event => {
    const existing = eventsByType.get(event.eventType) || [];
    existing.push(event);
    eventsByType.set(event.eventType, existing);
  });

  // Calculate penalty for each event type
  eventsByType.forEach((typeEvents, eventType) => {
    const baseWeight = config.tamperEventWeights[eventType] || config.tamperEventWeights['unknown'];
    
    let typePenalty = 0;
    typeEvents.forEach(event => {
      const decayFactor = calculateDecayFactor(event.timestamp, config.decayHalfLifeDays);
      const severityMult = getSeverityMultiplier(event.severity);
      const resolvedMult = event.resolved ? 0.5 : 1.0; // Resolved events count less
      
      typePenalty += baseWeight * decayFactor * severityMult * resolvedMult;
    });

    if (typePenalty > 0) {
      factors.push({
        id: `tamper_${eventType}`,
        name: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        impact: 'negative',
        weight: baseWeight,
        value: -Math.round(typePenalty * 10) / 10,
        description: `${typeEvents.length} occurrence${typeEvents.length > 1 ? 's' : ''} detected`,
        recommendation: getRecommendation(eventType),
      });
    }

    totalPenalty += typePenalty;
  });

  // No events is positive
  if (events.length === 0) {
    factors.push({
      id: 'tamper_clean',
      name: 'No Tamper Events',
      impact: 'positive',
      weight: 0,
      value: config.maxTamperScore,
      description: 'Device has no recorded tamper events',
    });
  }

  // Calculate final score (max - penalty, clamped to 0)
  const score = Math.max(0, config.maxTamperScore - totalPenalty);
  
  return { score, factors };
}

/**
 * Calculate enforcement stability score (0-25 points)
 */
export function calculateStabilityScore(
  sessions: EnforcementSession[],
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  
  if (sessions.length === 0) {
    factors.push({
      id: 'stability_no_sessions',
      name: 'No Exam Sessions',
      impact: 'neutral',
      weight: 0,
      value: config.maxStabilityScore * 0.5, // Neutral starting point
      description: 'Device has no recorded exam sessions yet',
    });
    return { score: config.maxStabilityScore * 0.5, factors };
  }

  // Calculate metrics
  const completedSessions = sessions.filter(s => s.endTime && !s.wasInterrupted);
  const interruptedSessions = sessions.filter(s => s.wasInterrupted);
  const completionRate = sessions.length > 0 
    ? completedSessions.length / sessions.length 
    : 0;

  // Average tamper events per session
  const totalTamperEvents = sessions.reduce((sum, s) => sum + s.tamperEvents, 0);
  const avgTamperPerSession = sessions.length > 0 
    ? totalTamperEvents / sessions.length 
    : 0;

  // Session consistency (time between sessions)
  let consistencyScore = 1.0;
  if (sessions.length >= 2) {
    const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);
    const gaps: number[] = [];
    for (let i = 1; i < sortedSessions.length; i++) {
      gaps.push(sortedSessions[i].startTime - (sortedSessions[i-1].endTime || sortedSessions[i-1].startTime));
    }
    // Consistent usage is positive
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapVariance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const gapStdDev = Math.sqrt(gapVariance);
    // Lower variance = more consistent
    consistencyScore = Math.max(0, 1 - (gapStdDev / (avgGap + 1)));
  }

  // Calculate component scores
  const completionPoints = completionRate * 10; // 0-10
  const tamperPoints = Math.max(0, 8 - avgTamperPerSession * 2); // 0-8
  const consistencyPoints = consistencyScore * 7; // 0-7

  // Add factors
  factors.push({
    id: 'stability_completion',
    name: 'Session Completion Rate',
    impact: completionRate >= 0.8 ? 'positive' : completionRate >= 0.5 ? 'neutral' : 'negative',
    weight: 10,
    value: Math.round(completionPoints * 10) / 10,
    description: `${Math.round(completionRate * 100)}% of sessions completed without interruption`,
    recommendation: completionRate < 0.8 ? 'Investigate session interruption causes' : undefined,
  });

  factors.push({
    id: 'stability_tamper_rate',
    name: 'Events Per Session',
    impact: avgTamperPerSession <= 1 ? 'positive' : avgTamperPerSession <= 3 ? 'neutral' : 'negative',
    weight: 8,
    value: Math.round(tamperPoints * 10) / 10,
    description: `Average of ${avgTamperPerSession.toFixed(1)} events per session`,
    recommendation: avgTamperPerSession > 2 ? 'Review device setup and user guidance' : undefined,
  });

  if (sessions.length >= config.minSessionsForStability) {
    factors.push({
      id: 'stability_consistency',
      name: 'Usage Consistency',
      impact: consistencyScore >= 0.7 ? 'positive' : 'neutral',
      weight: 7,
      value: Math.round(consistencyPoints * 10) / 10,
      description: 'Regularity of device usage patterns',
    });
  }

  const score = Math.min(config.maxStabilityScore, completionPoints + tamperPoints + consistencyPoints);
  
  return { score, factors };
}

/**
 * Calculate compliance score (0-25 points)
 */
export function calculateComplianceScore(
  input: DeviceTrustInput,
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  
  // Exam success rate
  const totalExams = input.totalExamsTaken;
  const successRate = totalExams > 0 
    ? input.successfulExams / totalExams 
    : 0;

  // Policy violation rate
  const violationRate = totalExams > 0 
    ? input.policyViolations / totalExams 
    : 0;

  // Calculate points
  const successPoints = totalExams === 0 
    ? 12.5 // Neutral if no exams
    : successRate * 15; // 0-15 based on success rate

  const violationPenalty = Math.min(10, violationRate * 20); // Up to -10 for violations
  const compliancePoints = Math.max(0, 10 - violationPenalty); // 0-10

  // Add factors
  if (totalExams > 0) {
    factors.push({
      id: 'compliance_success',
      name: 'Exam Success Rate',
      impact: successRate >= 0.9 ? 'positive' : successRate >= 0.7 ? 'neutral' : 'negative',
      weight: 15,
      value: Math.round(successPoints * 10) / 10,
      description: `${Math.round(successRate * 100)}% of exams completed successfully`,
    });

    if (input.policyViolations > 0) {
      factors.push({
        id: 'compliance_violations',
        name: 'Policy Violations',
        impact: 'negative',
        weight: 10,
        value: -Math.round(violationPenalty * 10) / 10,
        description: `${input.policyViolations} policy violation${input.policyViolations > 1 ? 's' : ''} recorded`,
        recommendation: 'Review and address policy violations with user',
      });
    }
  } else {
    factors.push({
      id: 'compliance_new',
      name: 'New Device',
      impact: 'neutral',
      weight: 0,
      value: 12.5,
      description: 'No exam history yet for compliance scoring',
    });
  }

  const score = Math.min(config.maxComplianceScore, successPoints + compliancePoints);
  
  return { score, factors };
}

/**
 * Calculate network integrity score (0-10 points)
 */
export function calculateNetworkScore(
  networkAnomalies: number,
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  
  // Each anomaly reduces score
  const penalty = Math.min(config.maxNetworkScore, networkAnomalies * 2);
  const score = config.maxNetworkScore - penalty;

  if (networkAnomalies === 0) {
    factors.push({
      id: 'network_clean',
      name: 'Network Integrity',
      impact: 'positive',
      weight: 10,
      value: config.maxNetworkScore,
      description: 'No network anomalies detected',
    });
  } else {
    factors.push({
      id: 'network_anomalies',
      name: 'Network Anomalies',
      impact: 'negative',
      weight: 10,
      value: -penalty,
      description: `${networkAnomalies} network anomal${networkAnomalies > 1 ? 'ies' : 'y'} detected`,
      recommendation: 'Check for DNS configuration issues or VPN usage',
    });
  }

  return { score, factors };
}

/**
 * Calculate history/longevity score (0-10 points)
 */
export function calculateHistoryScore(
  firstSeenAt: number,
  lastActiveAt: number,
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  
  const now = Date.now();
  const ageDays = (now - firstSeenAt) / (1000 * 60 * 60 * 24);
  const daysSinceActive = (now - lastActiveAt) / (1000 * 60 * 60 * 24);

  // Longevity bonus (up to 5 points)
  const longevityPoints = Math.min(5, ageDays / 30); // 1 point per month, max 5

  // Recent activity bonus (up to 5 points)
  const activityPoints = daysSinceActive <= 7 
    ? 5 
    : daysSinceActive <= 30 
      ? 3 
      : daysSinceActive <= 90 
        ? 1 
        : 0;

  factors.push({
    id: 'history_longevity',
    name: 'Device Longevity',
    impact: ageDays >= 30 ? 'positive' : 'neutral',
    weight: 5,
    value: Math.round(longevityPoints * 10) / 10,
    description: `Device registered ${Math.round(ageDays)} days ago`,
  });

  factors.push({
    id: 'history_activity',
    name: 'Recent Activity',
    impact: daysSinceActive <= 7 ? 'positive' : daysSinceActive <= 30 ? 'neutral' : 'negative',
    weight: 5,
    value: activityPoints,
    description: daysSinceActive <= 1 
      ? 'Active today' 
      : `Last active ${Math.round(daysSinceActive)} days ago`,
  });

  const score = longevityPoints + activityPoints;
  
  return { score, factors };
}

/**
 * Calculate complete trust score for a device
 */
export function calculateTrustScore(
  input: DeviceTrustInput,
  config: TrustScoringConfig = DEFAULT_TRUST_CONFIG
): TrustScore {
  // Calculate all component scores
  const tamper = calculateTamperScore(input.tamperEvents, config);
  const stability = calculateStabilityScore(input.enforcementSessions, config);
  const compliance = calculateComplianceScore(input, config);
  const network = calculateNetworkScore(input.networkAnomalies, config);
  const history = calculateHistoryScore(input.firstSeenAt, input.lastActiveAt, config);

  // Aggregate all factors
  const allFactors = [
    ...tamper.factors,
    ...stability.factors,
    ...compliance.factors,
    ...network.factors,
    ...history.factors,
  ];

  // Calculate total score
  const totalScore = Math.round(
    tamper.score + stability.score + compliance.score + network.score + history.score
  );

  // Determine trust level
  let level: TrustLevel;
  if (totalScore >= config.highTrustThreshold) {
    level = 'high';
  } else if (totalScore >= config.mediumTrustThreshold) {
    level = 'medium';
  } else if (totalScore >= config.lowTrustThreshold) {
    level = 'low';
  } else {
    level = 'critical';
  }

  return {
    score: totalScore,
    level,
    breakdown: {
      tamperScore: Math.round(tamper.score * 10) / 10,
      stabilityScore: Math.round(stability.score * 10) / 10,
      complianceScore: Math.round(compliance.score * 10) / 10,
      networkScore: Math.round(network.score * 10) / 10,
      historyScore: Math.round(history.score * 10) / 10,
    },
    factors: allFactors,
    lastCalculated: Date.now(),
    deviceId: input.deviceId,
  };
}

/**
 * Get recommendation for tamper event type
 */
function getRecommendation(eventType: string): string | undefined {
  const recommendations: Record<string, string> = {
    'app_backgrounded': 'Ensure students understand exam window focus requirements',
    'app_closed_during_exam': 'Investigate if closures were intentional or technical',
    'network_disconnected': 'Check network stability in exam environment',
    'extended_focus_loss': 'Review multi-monitor or window switching behavior',
    'dns_manipulation_detected': 'Investigate potential VPN or DNS bypass attempts',
    'extension_disabled': 'Ensure extension cannot be disabled during exams',
    'policy_bypassed': 'Critical: investigate potential circumvention attempts',
  };
  return recommendations[eventType];
}

/**
 * Get trust level display properties
 */
export function getTrustLevelDisplay(level: TrustLevel): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  icon: 'shield-check' | 'shield' | 'shield-alert' | 'shield-x';
} {
  switch (level) {
    case 'high':
      return {
        label: 'High Trust',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        description: 'Device demonstrates consistent, compliant behavior',
        icon: 'shield-check',
      };
    case 'medium':
      return {
        label: 'Medium Trust',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
        description: 'Some concerns noted; monitor for patterns',
        icon: 'shield',
      };
    case 'low':
      return {
        label: 'Low Trust',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        description: 'Multiple concerns; enhanced monitoring recommended',
        icon: 'shield-alert',
      };
    case 'critical':
      return {
        label: 'Critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        description: 'Significant trust issues; immediate review required',
        icon: 'shield-x',
      };
  }
}

/**
 * Generate admin explanation for trust score
 */
export function generateAdminExplanation(trustScore: TrustScore): string {
  const { score, level, breakdown, factors } = trustScore;
  const display = getTrustLevelDisplay(level);
  
  const negativeFators = factors.filter(f => f.impact === 'negative');
  const positiveFators = factors.filter(f => f.impact === 'positive');
  
  let explanation = `**Trust Score: ${score}/100 (${display.label})**\n\n`;
  explanation += `${display.description}\n\n`;
  
  explanation += `**Score Breakdown:**\n`;
  explanation += `- Tamper Events: ${breakdown.tamperScore}/30\n`;
  explanation += `- Stability: ${breakdown.stabilityScore}/25\n`;
  explanation += `- Compliance: ${breakdown.complianceScore}/25\n`;
  explanation += `- Network: ${breakdown.networkScore}/10\n`;
  explanation += `- History: ${breakdown.historyScore}/10\n\n`;
  
  if (positiveFators.length > 0) {
    explanation += `**Positive Indicators:**\n`;
    positiveFators.slice(0, 3).forEach(f => {
      explanation += `- ${f.name}: ${f.description}\n`;
    });
    explanation += '\n';
  }
  
  if (negativeFators.length > 0) {
    explanation += `**Areas of Concern:**\n`;
    negativeFators.forEach(f => {
      explanation += `- ${f.name}: ${f.description}`;
      if (f.recommendation) {
        explanation += ` *(${f.recommendation})*`;
      }
      explanation += '\n';
    });
  }
  
  return explanation;
}
