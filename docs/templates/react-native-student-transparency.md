# React Native Student Transparency Screen Template

## Overview
This template provides a reference implementation for the Student Transparency screen in React Native (Expo) for HumanFirst v0.1.

## Screen Structure

```tsx
// screens/StudentTransparencyScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ActivePolicyCard from '../components/student/ActivePolicyCard';
import BlockedServicesCard from '../components/student/BlockedServicesCard';
import UpcomingPoliciesCard from '../components/student/UpcomingPoliciesCard';
import PrivacyGuaranteesCard from '../components/student/PrivacyGuaranteesCard';

interface Policy {
  id: string;
  title: string;
  description: string | null;
  policy_type: 'exam' | 'focus';
  start_time: string;
  end_time: string;
  blocked_categories: string[];
  enforcement_level: 'strict' | 'soft';
  is_active: boolean;
}

interface AIService {
  id: string;
  name: string;
  category: string;
  is_blocked_during_exam: boolean;
}

interface EnforcementConfig {
  status: 'not_connected' | 'connected_simulated' | 'active';
  pilot_mode: boolean;
}

export default function StudentTransparencyScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [upcomingPolicies, setUpcomingPolicies] = useState<Policy[]>([]);
  const [blockedServices, setBlockedServices] = useState<AIService[]>([]);
  const [enforcementConfig, setEnforcementConfig] = useState<EnforcementConfig | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch active policy using RPC
      const { data: activePolicyData } = await supabase.rpc('get_active_exam_policy');
      if (activePolicyData && activePolicyData.length > 0) {
        setActivePolicy(activePolicyData[0]);
      } else {
        setActivePolicy(null);
      }

      // Fetch all active policies for upcoming
      const { data: policiesData } = await supabase
        .from('exam_policies')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (policiesData) {
        const now = new Date();
        const upcoming = policiesData.filter(
          (p) => p.is_active && isAfter(new Date(p.start_time), now)
        );
        setUpcomingPolicies(upcoming);
      }

      // Fetch blocked services
      const { data: servicesData } = await supabase
        .from('ai_services')
        .select('id, name, category, is_blocked_during_exam')
        .eq('is_blocked_during_exam', true)
        .order('category');

      if (servicesData) {
        setBlockedServices(servicesData);
      }

      // Fetch enforcement config
      const { data: configData } = await supabase
        .from('enforcement_config')
        .select('status, pilot_mode')
        .limit(1)
        .maybeSingle();

      if (configData) {
        setEnforcementConfig(configData);
      }
    } catch (error) {
      console.error('Error fetching transparency data:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel('transparency-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_policies' }, fetchData)
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Policy Transparency</Text>
          <Text style={styles.subtitle}>
            See what restrictions apply and why
          </Text>
        </View>

        {/* Active Policy Card */}
        <ActivePolicyCard policy={activePolicy} />

        {/* Blocked Services */}
        {activePolicy && blockedServices.length > 0 && (
          <BlockedServicesCard
            services={blockedServices}
            enforcementStatus={enforcementConfig?.status || 'not_connected'}
          />
        )}

        {/* Upcoming Policies */}
        <UpcomingPoliciesCard policies={upcomingPolicies} />

        {/* Privacy Guarantees */}
        <PrivacyGuaranteesCard />

        {/* Trust Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            HumanFirst believes education thrives on trust, not surveillance.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
```

## Component: ActivePolicyCard

```tsx
// components/student/ActivePolicyCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';

interface Policy {
  id: string;
  title: string;
  description?: string | null;
  policy_type: 'exam' | 'focus';
  start_time: string;
  end_time: string;
  blocked_categories: string[];
  enforcement_level: 'strict' | 'soft';
}

interface Props {
  policy: Policy | null;
}

export default function ActivePolicyCard({ policy }: Props) {
  if (!policy) {
    return (
      <View style={[styles.card, styles.cardSuccess]}>
        <View style={[styles.iconContainer, styles.iconSuccess]}>
          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>No Active Restrictions</Text>
          <Text style={styles.description}>
            You have full access to all services. No policies are currently in effect.
          </Text>
        </View>
      </View>
    );
  }

  const isExam = policy.policy_type === 'exam';
  const primaryColor = isExam ? '#EF4444' : '#F59E0B';

  return (
    <View style={[styles.card, { borderColor: primaryColor + '40' }]}>
      <View style={[styles.iconContainer, { backgroundColor: primaryColor + '15' }]}>
        <Ionicons
          name={isExam ? 'alert-circle' : 'shield'}
          size={32}
          color={primaryColor}
        />
      </View>
      <View style={styles.content}>
        {/* Type Badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
            <Text style={[styles.badgeText, { color: primaryColor }]}>
              {policy.policy_type.toUpperCase()} MODE
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeTextMuted}>
              {policy.enforcement_level === 'strict' ? 'Strictly Enforced' : 'Soft Enforcement'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{policy.title}</Text>
        
        {policy.description && (
          <Text style={styles.description}>{policy.description}</Text>
        )}

        {/* Time Window */}
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.timeText}>
            Ends {formatDistanceToNow(new Date(policy.end_time), { addSuffix: true })}
          </Text>
        </View>

        {/* Blocked Categories */}
        <View style={styles.categoriesRow}>
          {policy.blocked_categories.map((cat) => (
            <View key={cat} style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{cat} Blocked</Text>
            </View>
          ))}
        </View>

        {/* Transparency Notice */}
        <View style={[styles.notice, { backgroundColor: primaryColor + '08' }]}>
          <Text style={styles.noticeTitle}>Why this restriction:</Text>
          <Text style={styles.noticeText}>
            {isExam
              ? `Access to ${policy.blocked_categories.join(', ')} services is restricted to maintain academic integrity.`
              : `Focus mode limits access to ${policy.blocked_categories.join(', ')} to help you concentrate.`}
            {' '}Your privacy remains fully protected.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSuccess: {
    borderColor: '#10B98140',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconSuccess: {
    backgroundColor: '#10B98115',
  },
  content: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextMuted: {
    fontSize: 10,
    color: '#6B7280',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  notice: {
    padding: 12,
    borderRadius: 12,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});
```

## Component: PrivacyGuaranteesCard

```tsx
// components/student/PrivacyGuaranteesCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const guarantees = [
  { icon: 'eye-off-outline', title: 'No Content Reading', desc: 'Your documents stay private' },
  { icon: 'key-outline', title: 'No Keystroke Logging', desc: 'Your typing is never tracked' },
  { icon: 'desktop-outline', title: 'No Screen Recording', desc: 'Your screen is never captured' },
  { icon: 'mic-off-outline', title: 'No Audio/Video', desc: 'Camera and mic never accessed' },
  { icon: 'analytics-outline', title: 'No Behavior Scoring', desc: 'We don\'t analyze patterns' },
  { icon: 'shield-checkmark-outline', title: 'No Accusations', desc: 'Policies, not judgments' },
];

export default function PrivacyGuaranteesCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        </View>
        <View>
          <Text style={styles.title}>Your Privacy Guarantees</Text>
          <Text style={styles.subtitle}>What we never do</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {guarantees.map((item) => (
          <View key={item.title} style={styles.guarantee}>
            <View style={styles.guaranteeIcon}>
              <Ionicons name={item.icon as any} size={18} color="#10B981" />
            </View>
            <View style={styles.guaranteeContent}>
              <Text style={styles.guaranteeTitle}>{item.title}</Text>
              <Text style={styles.guaranteeDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  grid: {
    gap: 12,
  },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#10B98108',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B98120',
  },
  guaranteeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guaranteeContent: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  guaranteeDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
});
```

## Key Features

### Read-Only Design
- No edit buttons or actions that could modify policies
- Clear visual hierarchy showing policy status
- Pull-to-refresh for latest data

### Privacy-First Messaging
- Every card reinforces privacy guarantees
- Clear explanation of WHY restrictions exist
- No guilt-inducing or accusatory language

### Real-Time Updates
- Supabase real-time subscription for policy changes
- 30-second polling for time-based updates
- Immediate reflection of policy start/end

### Accessibility
- Proper color contrast
- Screen reader friendly labels
- Touch targets meet minimum size requirements

## Ethics Compliance

This screen explicitly does NOT:
- ❌ Show any override or bypass options
- ❌ Display personal usage data
- ❌ Track or log student interactions
- ❌ Make accusations about behavior
- ❌ Score or rate the student

It ONLY shows:
- ✅ Current active policy (if any)
- ✅ Policy type, time window, blocked categories
- ✅ Upcoming scheduled policies
- ✅ Privacy guarantees

---

*Template version: v0.1 | HumanFirst Pilot*
