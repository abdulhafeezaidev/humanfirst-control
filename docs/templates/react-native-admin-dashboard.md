# React Native Admin Dashboard – HumanFirst v0.1

Reference implementation for a mobile admin dashboard using React Native, Expo, and React Navigation.

---

## Project Structure

```
mobile-admin/
├── src/
│   ├── api/
│   │   └── dashboard.ts
│   ├── components/
│   │   ├── MetricCard.tsx
│   │   ├── QuickActions.tsx
│   │   ├── RecentActivity.tsx
│   │   └── PrivacyNotice.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── navigation/
│   │   └── DashboardNavigator.tsx
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── PoliciesScreen.tsx
│   │   ├── StudentsScreen.tsx
│   │   ├── AdminManagementScreen.tsx
│   │   └── LogsScreen.tsx
│   ├── types/
│   │   └── dashboard.ts
│   └── utils/
│       └── formatters.ts
├── App.tsx
└── package.json
```

---

## Types (`src/types/dashboard.ts`)

```typescript
export type AdminRole = 'owner' | 'standard';

export interface Institution {
  id: string;
  name: string;
  type: 'school' | 'college' | 'university' | 'other';
  createdAt: string;
  pilotExpiresAt?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  institutionId: string;
}

export interface DashboardMetrics {
  studentCount: number;
  activePolicies: number;
  totalPolicies: number;
  unresolvedAlerts: number;
  totalAlerts: number;
  enforcementStatus: 'inactive' | 'simulated' | 'active';
  pilotDaysRemaining?: number;
}

export interface Policy {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  blockedCategories: string[];
}

export interface EnforcementAlert {
  id: string;
  type: string;
  deviceId: string;
  timestamp: string;
  resolved: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'policy' | 'alert' | 'user';
  action: string;
  description: string;
  timestamp: string;
  resolved?: boolean;
}
```

---

## API Layer (`src/api/dashboard.ts`)

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardMetrics, Policy, EnforcementAlert, Admin } from '../types/dashboard';

const API_URL = 'https://api.humanfirst.dev/v1';

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT to all requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardApi = {
  // Get dashboard metrics
  async getMetrics(): Promise<DashboardMetrics> {
    const { data } = await api.get('/dashboard/metrics');
    return data;
  },

  // Get policies
  async getPolicies(): Promise<Policy[]> {
    const { data } = await api.get('/policies');
    return data;
  },

  // Create policy
  async createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
    const { data } = await api.post('/policies', policy);
    return data;
  },

  // Update policy
  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
    const { data } = await api.patch(`/policies/${id}`, updates);
    return data;
  },

  // Delete policy
  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/policies/${id}`);
  },

  // Get enforcement alerts
  async getAlerts(): Promise<EnforcementAlert[]> {
    const { data } = await api.get('/alerts');
    return data;
  },

  // Resolve alert
  async resolveAlert(id: string): Promise<void> {
    await api.post(`/alerts/${id}/resolve`);
  },

  // Get admins (owner only)
  async getAdmins(): Promise<Admin[]> {
    const { data } = await api.get('/admins');
    return data;
  },

  // Invite admin (owner only)
  async inviteAdmin(email: string, role: 'standard'): Promise<void> {
    await api.post('/admins/invite', { email, role });
  },

  // Remove admin (owner only)
  async removeAdmin(id: string): Promise<void> {
    await api.delete(`/admins/${id}`);
  },
};
```

---

## Components

### MetricCard (`src/components/MetricCard.tsx`)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'success';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'default',
  icon,
}) => {
  const variantStyles = {
    default: { backgroundColor: '#f8f9fa', borderColor: '#e9ecef' },
    warning: { backgroundColor: '#fff3cd', borderColor: '#ffc107' },
    success: { backgroundColor: '#d4edda', borderColor: '#28a745' },
  };

  return (
    <View style={[styles.card, variantStyles[variant]]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
  },
  subtitle: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
  },
});
```

### QuickActions (`src/components/QuickActions.tsx`)

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminRole } from '../types/dashboard';

interface QuickActionsProps {
  role: AdminRole;
  onCreatePolicy: () => void;
  onInviteAdmin: () => void;
  onViewTransparency: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  role,
  onCreatePolicy,
  onInviteAdmin,
  onViewTransparency,
}) => {
  const isOwner = role === 'owner';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.action} onPress={onCreatePolicy}>
          <Ionicons name="add-circle-outline" size={24} color="#007bff" />
          <Text style={styles.actionText}>New Policy</Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity style={styles.action} onPress={onInviteAdmin}>
            <Ionicons name="person-add-outline" size={24} color="#007bff" />
            <Text style={styles.actionText}>Invite Admin</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.action} onPress={onViewTransparency}>
          <Ionicons name="document-text-outline" size={24} color="#007bff" />
          <Text style={styles.actionText}>Transparency</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  actionText: {
    fontSize: 11,
    color: '#495057',
    marginTop: 4,
    textAlign: 'center',
  },
});
```

### PrivacyNotice (`src/components/PrivacyNotice.tsx`)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PrivacyNotice: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={16} color="#007bff" />
        <Text style={styles.title}>Privacy First</Text>
      </View>
      <Text style={styles.text}>
        HumanFirst does <Text style={styles.bold}>not</Text> read student content, 
        keystrokes, or monitor screen activity. We only track focus mode compliance.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e7f1ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#b6d4fe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  text: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
});
```

---

## Dashboard Screen (`src/screens/DashboardScreen.tsx`)

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../api/dashboard';
import { DashboardMetrics } from '../types/dashboard';
import { MetricCard } from '../components/MetricCard';
import { QuickActions } from '../components/QuickActions';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { RecentActivity } from '../components/RecentActivity';

// Mock data for pilot
const MOCK_METRICS: DashboardMetrics = {
  studentCount: 127,
  activePolicies: 2,
  totalPolicies: 5,
  unresolvedAlerts: 3,
  totalAlerts: 15,
  enforcementStatus: 'simulated',
  pilotDaysRemaining: 21,
};

export const DashboardScreen: React.FC = () => {
  const { admin, institution } = useAuth();
  const navigation = useNavigation();
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      // Use mock data for pilot, replace with API call in production
      // const data = await dashboardApi.getMetrics();
      setMetrics(MOCK_METRICS);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const isOwner = admin?.role === 'owner';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.institutionName}>{institution?.name}</Text>
            <Text style={styles.roleLabel}>
              {isOwner ? 'Owner' : 'Standard Admin'}
            </Text>
          </View>
          {metrics?.pilotDaysRemaining && (
            <View style={styles.pilotBadge}>
              <Text style={styles.pilotText}>
                Pilot: {metrics.pilotDaysRemaining} days left
              </Text>
            </View>
          )}
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Students"
            value={metrics?.studentCount ?? 0}
            subtitle="Enrolled"
          />
          <MetricCard
            title="Policies"
            value={`${metrics?.activePolicies ?? 0}/${metrics?.totalPolicies ?? 0}`}
            subtitle="Active"
            variant={metrics?.activePolicies ? 'success' : 'default'}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            title="Alerts"
            value={metrics?.unresolvedAlerts ?? 0}
            subtitle={`${metrics?.totalAlerts ?? 0} total`}
            variant={metrics?.unresolvedAlerts ? 'warning' : 'default'}
          />
          <MetricCard
            title="Status"
            value={
              metrics?.enforcementStatus === 'active'
                ? 'Active'
                : metrics?.enforcementStatus === 'simulated'
                ? 'Pilot'
                : 'Inactive'
            }
            variant={metrics?.enforcementStatus === 'active' ? 'success' : 'default'}
          />
        </View>

        {/* Quick Actions */}
        <QuickActions
          role={admin?.role ?? 'standard'}
          onCreatePolicy={() => navigation.navigate('Policies' as never)}
          onInviteAdmin={() => navigation.navigate('AdminManagement' as never)}
          onViewTransparency={() => {/* Open transparency view */}}
        />

        {/* Privacy Notice */}
        <PrivacyNotice />

        {/* Recent Activity - Placeholder */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.placeholder}>Activity feed coming soon...</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  institutionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  roleLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  pilotBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pilotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  activitySection: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  placeholder: {
    color: '#6c757d',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
```

---

## Navigation (`src/navigation/DashboardNavigator.tsx`)

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

import { DashboardScreen } from '../screens/DashboardScreen';
import { PoliciesScreen } from '../screens/PoliciesScreen';
import { StudentsScreen } from '../screens/StudentsScreen';
import { AdminManagementScreen } from '../screens/AdminManagementScreen';
import { LogsScreen } from '../screens/LogsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator: React.FC = () => {
  const { admin } = useAuth();
  const isOwner = admin?.role === 'owner';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Overview':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Policies':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Students':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Team':
              iconName = focused ? 'person-add' : 'person-add-outline';
              break;
            case 'Logs':
              iconName = focused ? 'list' : 'list-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: '#6c757d',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Overview" component={DashboardScreen} />
      <Tab.Screen name="Policies" component={PoliciesScreen} />
      <Tab.Screen name="Students" component={StudentsScreen} />
      {isOwner && (
        <Tab.Screen 
          name="Team" 
          component={AdminManagementScreen}
          options={{ title: 'Admins' }}
        />
      )}
      <Tab.Screen name="Logs" component={LogsScreen} />
    </Tab.Navigator>
  );
};

export const DashboardNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* Add modal screens here */}
    </Stack.Navigator>
  );
};
```

---

## Node.js Backend Endpoints

Add these to the existing Node.js backend:

```javascript
// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { authenticate, requireOwner } = require('../middleware/auth');
const Policy = require('../models/Policy');
const Student = require('../models/Student');
const Alert = require('../models/Alert');
const Admin = require('../models/Admin');

// GET /api/dashboard/metrics
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { institutionId } = req.admin;

    const [studentCount, policies, alerts] = await Promise.all([
      Student.countDocuments({ institutionId }),
      Policy.find({ institutionId }),
      Alert.find({ institutionId }),
    ]);

    const now = new Date();
    const activePolicies = policies.filter(
      (p) => p.isActive && new Date(p.startTime) <= now && new Date(p.endTime) >= now
    ).length;

    const unresolvedAlerts = alerts.filter((a) => !a.resolved).length;

    res.json({
      studentCount,
      activePolicies,
      totalPolicies: policies.length,
      unresolvedAlerts,
      totalAlerts: alerts.length,
      enforcementStatus: 'simulated', // pilot mode
      pilotDaysRemaining: 21, // Calculate from institution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admins (owner only)
router.get('/', authenticate, requireOwner, async (req, res) => {
  try {
    const admins = await Admin.find({ institutionId: req.admin.institutionId })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admins/invite (owner only)
router.post('/invite', authenticate, requireOwner, async (req, res) => {
  try {
    const { email, role } = req.body;
    // Send invitation email, create pending invite record
    // ...
    res.json({ message: 'Invitation sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admins/:id (owner only)
router.delete('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin || admin.institutionId.toString() !== req.admin.institutionId.toString()) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    if (admin.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove owner' });
    }

    await admin.deleteOne();
    res.json({ message: 'Admin removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## Key Features

### Role-Based Rendering
- **Owner**: Full access to all features including Admin Management tab
- **Standard**: Read/write access to policies and students, no admin management

### Privacy Compliance
- Clear privacy notice stating no content/keystroke monitoring
- Focus-only compliance tracking

### Mock Data for Pilot
- Included mock metrics for testing without live backend
- Easy switch to real API calls

### NIC-Ready
- Clean, modular architecture
- TypeScript types for all data structures
- Separated concerns (API, components, screens)
- Ready for National Informatics Centre deployment guidelines
