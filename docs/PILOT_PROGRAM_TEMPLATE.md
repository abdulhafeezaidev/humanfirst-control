# HumanFirst Pilot Program Template

## Overview

This document defines the standard configuration for institutional pilot programs. Use this template to onboard new pilot institutions with consistent expectations and success criteria.

---

## 1. Pilot Configuration

### Duration

| Phase | Duration | Description |
|-------|----------|-------------|
| **Kickoff** | Week 1 | Admin onboarding, device registration, initial training |
| **Ramp-up** | Weeks 2-3 | First policies deployed, limited student cohort |
| **Full Pilot** | Weeks 4-8 | Full feature access, expanded enrollment |
| **Evaluation** | Weeks 9-10 | Data review, stakeholder feedback, decision |
| **Total** | 10 weeks | Standard pilot duration |

### Feature Access

```yaml
pilot_features:
  enabled:
    - basic_policies          # Exam/Focus mode creation
    - tamper_detection        # Device integrity monitoring
    - student_transparency    # Student-facing policy view
    - admin_dashboard         # Core management interface
    - audit_logs              # Basic action logging (30-day retention)
    - pilot_analytics         # Weekly metrics reports
    
  limited:
    - policy_sharing          # Max 3 shared policies
    - device_registration     # Max 10 devices per admin
    
  disabled:
    - custom_branding         # Requires Standard plan
    - api_access              # Requires Institution plan
    - sso_integration         # Requires Institution plan
    - advanced_analytics      # Requires Standard plan
```

### Usage Limits

| Resource | Pilot Limit | Standard | Institution |
|----------|-------------|----------|-------------|
| Admins | 2 | 5 | Unlimited |
| Students | 50 | 500 | Unlimited |
| Devices | 10 | 100 | Unlimited |
| Active Policies | 5 | 25 | Unlimited |
| Audit Log Retention | 30 days | 90 days | 365 days |
| Tamper Event Retention | 14 days | 60 days | 180 days |

---

## 2. Success Criteria

### Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Enforcement Uptime** | ≥ 99% | System availability during exam windows |
| **Compliance Rate** | ≥ 85% | Sessions without tamper events / Total sessions |
| **Policy Adoption** | ≥ 3 policies | Number of unique policies created |
| **Admin Engagement** | ≥ 2x/week | Average admin dashboard logins |
| **Student Coverage** | ≥ 30 students | Unique students with policy assignments |
| **Resolution Rate** | ≥ 90% | Tamper events reviewed / Total events |

### Qualitative Indicators

- [ ] Admin team completes training module
- [ ] First exam successfully enforced
- [ ] Positive feedback from IT/compliance stakeholders
- [ ] No privacy concerns raised by students/parents
- [ ] Institution requests feature expansion

### Weekly Health Score

```
Health Score = (
  (Uptime × 0.25) +
  (Compliance × 0.25) +
  (Engagement × 0.20) +
  (Coverage × 0.15) +
  (Resolution × 0.15)
) / 100

Rating:
  90-100: Excellent - Ready for upgrade
  75-89:  Good - On track
  60-74:  Needs Attention - Review with institution
  <60:    At Risk - Intervention required
```

---

## 3. Exit Outcomes

### Upgrade Path (Success)

**Trigger Conditions:**
- Health Score ≥ 75 for final 4 weeks
- Stakeholder approval obtained
- Budget confirmed

**Upgrade Process:**
1. Lock in pricing tier (Standard/Institution)
2. Extend limits based on selected plan
3. Enable premium features
4. Migrate pilot data to production retention
5. Schedule onboarding for expanded rollout

### Extension (More Time Needed)

**Trigger Conditions:**
- Health Score 60-74
- Institution requests additional evaluation time
- Specific blockers identified and actionable

**Extension Terms:**
- Maximum 4 additional weeks
- Same feature/limit restrictions
- Weekly check-ins required
- Clear remediation plan

### Discontinuation (Not a Fit)

**Trigger Conditions:**
- Health Score < 60 for 3+ consecutive weeks
- Institution decides not to proceed
- Critical unresolved concerns

**Offboarding Process:**
1. Export compliance reports (PDF)
2. Provide data summary (no PII)
3. Disable all enforcement
4. Archive (not delete) audit logs for 30 days
5. Conduct exit interview
6. Document lessons learned

---

## 4. Data Handling

### During Pilot

| Data Type | Collection | Retention | Access |
|-----------|------------|-----------|--------|
| Policy Events | Aggregated | 14 days | Admin only |
| Tamper Events | Device-level | 14 days | Admin only |
| Audit Logs | Action-level | 30 days | Super Admin |
| Student Data | Email only | Pilot duration | System only |

### After Pilot

- **Upgrade**: Data migrates to production retention policies
- **Discontinue**: All data purged within 30 days per GDPR/FERPA

---

## 5. Support & Communication

### Touchpoints

| Week | Activity | Owner |
|------|----------|-------|
| 0 | Kickoff call | Customer Success |
| 1 | Training session | Customer Success |
| 2 | First exam check-in | Technical Support |
| 4 | Mid-pilot review | Account Manager |
| 6 | Stakeholder feedback | Customer Success |
| 8 | Metrics review | Account Manager |
| 10 | Decision meeting | Account Manager |

### Escalation Path

```
L1: In-app help → Self-service docs
L2: Support ticket → 24hr response
L3: Scheduled call → Customer Success
L4: Executive escalation → Account Manager
```

---

## 6. Pilot Agreement Checklist

### Institution Commits To:

- [ ] Designate primary admin contact
- [ ] Complete admin training within Week 1
- [ ] Run minimum 3 exam/focus sessions
- [ ] Participate in weekly check-ins
- [ ] Provide stakeholder feedback by Week 8
- [ ] Make upgrade/discontinue decision by Week 10

### HumanFirst Commits To:

- [ ] Complete onboarding within 48 hours
- [ ] Respond to support tickets within 24 hours
- [ ] Provide weekly metrics reports
- [ ] Conduct mid-pilot and final reviews
- [ ] Honor data deletion within 30 days if discontinued
- [ ] Lock pricing for 60 days post-pilot

---

## Appendix: Pilot Configuration JSON

```json
{
  "pilot_config": {
    "duration_weeks": 10,
    "plan_type": "pilot",
    "limits": {
      "max_admins": 2,
      "max_students": 50,
      "max_devices": 10,
      "max_policies": 5
    },
    "features": {
      "basic_policies": true,
      "tamper_detection": true,
      "student_transparency": true,
      "admin_dashboard": true,
      "audit_logs": true,
      "pilot_analytics": true,
      "policy_sharing": "limited",
      "custom_branding": false,
      "api_access": false,
      "sso": false
    },
    "retention": {
      "audit_logs_days": 30,
      "tamper_events_days": 14
    },
    "success_criteria": {
      "min_uptime_percent": 99,
      "min_compliance_percent": 85,
      "min_policies_created": 3,
      "min_students_enrolled": 30,
      "min_admin_logins_weekly": 2
    }
  }
}
```
