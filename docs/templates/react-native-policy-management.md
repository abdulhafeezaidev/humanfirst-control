# React Native + Node.js Policy Management Template

## Overview

This template provides reference code for implementing the HumanFirst Policy Management module in a React Native mobile app with Node.js backend, following the POLICY_ENGINE.md specification.

---

## Policy Schema (POLICY_ENGINE.md Compliant)

```typescript
// types/policy.ts
export type PolicyType = 'exam' | 'focus';
export type EnforcementLevel = 'strict' | 'soft';
export type PolicyStatus = 'active' | 'disabled' | 'scheduled';
export type AssignmentType = 'institution' | 'individual';

export interface Policy {
  policyId: string;
  policyName: string;
  policyType: PolicyType;
  activeFrom: string; // ISO timestamp
  activeTo: string;   // ISO timestamp
  blockedServices: string[];
  enforcementLevel: EnforcementLevel;
  institutionId: string;
  status: PolicyStatus;
  assignmentType: AssignmentType;
  priority: number; // Exam=10, Focus=5
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAssignment {
  id: string;
  policyId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  revokedAt?: string;
  notes?: string;
}

export interface PolicyAssignmentLog {
  id: string;
  policyId: string;
  action: 'assigned' | 'revoked' | 'created' | 'updated' | 'deleted';
  actorId: string;
  targetUserId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Priority constants (Exam > Focus)
export const POLICY_PRIORITY: Record<PolicyType, number> = {
  exam: 10,
  focus: 5,
};
```

---

## Node.js Backend

### Policy Model (MongoDB)

```javascript
// models/Policy.js
const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
  policyName: { type: String, required: true },
  policyType: { type: String, enum: ['exam', 'focus'], required: true },
  activeFrom: { type: Date, required: true },
  activeTo: { type: Date, required: true },
  blockedServices: [String],
  blockedCategories: [String],
  enforcementLevel: { type: String, enum: ['strict', 'soft'], default: 'strict' },
  status: { type: String, enum: ['active', 'disabled', 'scheduled'], default: 'active' },
  assignmentType: { type: String, enum: ['institution', 'individual'], default: 'institution' },
  priority: { type: Number, default: 10 },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

// Index for efficient queries
PolicySchema.index({ institutionId: 1, status: 1, activeFrom: 1, activeTo: 1 });

module.exports = mongoose.model('Policy', PolicySchema);
```

### Policy Assignment Model

```javascript
// models/PolicyAssignment.js
const mongoose = require('mongoose');

const PolicyAssignmentSchema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  revokedAt: Date,
  notes: String,
}, { timestamps: true });

PolicyAssignmentSchema.index({ policyId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PolicyAssignment', PolicyAssignmentSchema);
```

### Policy Assignment Log Model

```javascript
// models/PolicyAssignmentLog.js
const mongoose = require('mongoose');

const PolicyAssignmentLogSchema = new mongoose.Schema({
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  action: { type: String, enum: ['assigned', 'revoked', 'created', 'updated', 'deleted'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

PolicyAssignmentLogSchema.index({ policyId: 1, createdAt: -1 });

module.exports = mongoose.model('PolicyAssignmentLog', PolicyAssignmentLogSchema);
```

### Policy Controller

```javascript
// controllers/policyController.js
const Policy = require('../models/Policy');
const PolicyAssignment = require('../models/PolicyAssignment');
const PolicyAssignmentLog = require('../models/PolicyAssignmentLog');

const POLICY_PRIORITY = { exam: 10, focus: 5 };

// Log policy action
const logPolicyAction = async (policyId, action, actorId, institutionId, targetUserId = null, metadata = {}) => {
  await PolicyAssignmentLog.create({
    policyId,
    action,
    actorId,
    targetUserId,
    institutionId,
    metadata,
  });
};

// Create policy
exports.createPolicy = async (req, res) => {
  try {
    const { policyName, policyType, activeFrom, activeTo, blockedServices, blockedCategories, enforcementLevel, assignmentType } = req.body;
    
    // Exam policies always have strict enforcement
    const level = policyType === 'exam' ? 'strict' : (enforcementLevel || 'soft');
    const priority = POLICY_PRIORITY[policyType];
    
    const policy = await Policy.create({
      policyName,
      policyType,
      activeFrom,
      activeTo,
      blockedServices: blockedServices || [],
      blockedCategories: blockedCategories || [],
      enforcementLevel: level,
      assignmentType: assignmentType || 'institution',
      priority,
      institutionId: req.admin.institutionId,
      createdBy: req.admin._id,
    });
    
    await logPolicyAction(policy._id, 'created', req.admin._id, req.admin.institutionId, null, { policyName, policyType });
    
    res.status(201).json({ success: true, policy });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all policies for institution
exports.getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ institutionId: req.admin.institutionId })
      .sort({ createdAt: -1 });
    res.json({ success: true, policies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update policy
exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Recalculate priority if type changed
    if (updates.policyType) {
      updates.priority = POLICY_PRIORITY[updates.policyType];
      if (updates.policyType === 'exam') {
        updates.enforcementLevel = 'strict';
      }
    }
    
    const policy = await Policy.findOneAndUpdate(
      { _id: id, institutionId: req.admin.institutionId },
      updates,
      { new: true }
    );
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    await logPolicyAction(policy._id, 'updated', req.admin._id, req.admin.institutionId, null, updates);
    
    res.json({ success: true, policy });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete policy
exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findOneAndDelete({ _id: id, institutionId: req.admin.institutionId });
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    // Delete all assignments
    await PolicyAssignment.deleteMany({ policyId: id });
    
    await logPolicyAction(id, 'deleted', req.admin._id, req.admin.institutionId, null, { policyName: policy.policyName });
    
    res.json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle policy active state
exports.togglePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findOne({ _id: id, institutionId: req.admin.institutionId });
    
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }
    
    policy.status = policy.status === 'active' ? 'disabled' : 'active';
    await policy.save();
    
    await logPolicyAction(policy._id, 'updated', req.admin._id, req.admin.institutionId, null, { status: policy.status });
    
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign student to policy
exports.assignStudent = async (req, res) => {
  try {
    const { policyId } = req.params;
    const { userId, notes } = req.body;
    
    const assignment = await PolicyAssignment.create({
      policyId,
      userId,
      institutionId: req.admin.institutionId,
      assignedBy: req.admin._id,
      notes,
    });
    
    await logPolicyAction(policyId, 'assigned', req.admin._id, req.admin.institutionId, userId);
    
    res.status(201).json({ success: true, assignment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Student already assigned' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Revoke student assignment
exports.revokeAssignment = async (req, res) => {
  try {
    const { policyId, userId } = req.params;
    
    const assignment = await PolicyAssignment.findOneAndUpdate(
      { policyId, userId, revokedAt: null },
      { revokedAt: new Date() },
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    await logPolicyAction(policyId, 'revoked', req.admin._id, req.admin.institutionId, userId);
    
    res.json({ success: true, message: 'Assignment revoked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get assignments for policy
exports.getPolicyAssignments = async (req, res) => {
  try {
    const { policyId } = req.params;
    
    const assignments = await PolicyAssignment.find({ policyId, revokedAt: null })
      .populate('userId', 'name email');
    
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get assignment logs for policy
exports.getPolicyLogs = async (req, res) => {
  try {
    const { policyId } = req.params;
    
    const logs = await PolicyAssignmentLog.find({ policyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actorId', 'name')
      .populate('targetUserId', 'name email');
    
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get effective policy for user (conflict resolution: Exam > Focus)
exports.getEffectivePolicyForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    
    // Get user's institution
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Find active policies (institution-wide or assigned to user)
    const assignments = await PolicyAssignment.find({ userId, revokedAt: null }).select('policyId');
    const assignedPolicyIds = assignments.map(a => a.policyId);
    
    const effectivePolicy = await Policy.findOne({
      institutionId: user.institutionId,
      status: 'active',
      activeFrom: { $lte: now },
      activeTo: { $gte: now },
      $or: [
        { assignmentType: 'institution' },
        { _id: { $in: assignedPolicyIds } },
      ],
    }).sort({ priority: -1, activeFrom: -1 }); // Exam (10) > Focus (5)
    
    res.json({ success: true, policy: effectivePolicy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Policy Routes

```javascript
// routes/policy.js
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(requireAuth, requireAdmin);

// CRUD
router.post('/', policyController.createPolicy);
router.get('/', policyController.getPolicies);
router.put('/:id', policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.patch('/:id/toggle', policyController.togglePolicy);

// Assignments
router.post('/:policyId/assign', policyController.assignStudent);
router.delete('/:policyId/assign/:userId', policyController.revokeAssignment);
router.get('/:policyId/assignments', policyController.getPolicyAssignments);
router.get('/:policyId/logs', policyController.getPolicyLogs);

// Student-facing (any authenticated user)
router.get('/effective/:userId', requireAuth, policyController.getEffectivePolicyForUser);

module.exports = router;
```

---

## React Native Mobile App

### Policy API Service

```typescript
// services/policyApi.ts
import api from './api';
import type { Policy, PolicyAssignment, PolicyAssignmentLog } from '../types/policy';

export interface PolicyFormData {
  policyName: string;
  policyType: 'exam' | 'focus';
  activeFrom: string;
  activeTo: string;
  blockedServices: string[];
  blockedCategories: string[];
  enforcementLevel: 'strict' | 'soft';
  assignmentType: 'institution' | 'individual';
}

export const policyApi = {
  // Get all policies
  getPolicies: async (): Promise<Policy[]> => {
    const response = await api.get('/policies');
    return response.data.policies;
  },

  // Create policy
  createPolicy: async (data: PolicyFormData): Promise<Policy> => {
    const response = await api.post('/policies', data);
    return response.data.policy;
  },

  // Update policy
  updatePolicy: async (id: string, data: Partial<PolicyFormData>): Promise<Policy> => {
    const response = await api.put(`/policies/${id}`, data);
    return response.data.policy;
  },

  // Delete policy
  deletePolicy: async (id: string): Promise<void> => {
    await api.delete(`/policies/${id}`);
  },

  // Toggle policy status
  togglePolicy: async (id: string): Promise<Policy> => {
    const response = await api.patch(`/policies/${id}/toggle`);
    return response.data.policy;
  },

  // Get assignments
  getAssignments: async (policyId: string): Promise<PolicyAssignment[]> => {
    const response = await api.get(`/policies/${policyId}/assignments`);
    return response.data.assignments;
  },

  // Assign student
  assignStudent: async (policyId: string, userId: string, notes?: string): Promise<PolicyAssignment> => {
    const response = await api.post(`/policies/${policyId}/assign`, { userId, notes });
    return response.data.assignment;
  },

  // Revoke assignment
  revokeAssignment: async (policyId: string, userId: string): Promise<void> => {
    await api.delete(`/policies/${policyId}/assign/${userId}`);
  },

  // Get logs
  getLogs: async (policyId: string): Promise<PolicyAssignmentLog[]> => {
    const response = await api.get(`/policies/${policyId}/logs`);
    return response.data.logs;
  },

  // Get effective policy for user
  getEffectivePolicy: async (userId: string): Promise<Policy | null> => {
    const response = await api.get(`/policies/effective/${userId}`);
    return response.data.policy;
  },
};
```

### Policy List Screen

```tsx
// screens/PolicyListScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { policyApi } from '../services/policyApi';
import type { Policy } from '../types/policy';
import { format } from 'date-fns';

const PolicyListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPolicies = async () => {
    try {
      const data = await policyApi.getPolicies();
      setPolicies(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load policies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPolicies();
    }, [])
  );

  const handleToggle = async (policy: Policy) => {
    try {
      await policyApi.togglePolicy(policy.policyId);
      fetchPolicies();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle policy');
    }
  };

  const handleDelete = (policy: Policy) => {
    Alert.alert(
      'Delete Policy',
      `Are you sure you want to delete "${policy.policyName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await policyApi.deletePolicy(policy.policyId);
              fetchPolicies();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete policy');
            }
          },
        },
      ]
    );
  };

  const isActiveNow = (policy: Policy) => {
    const now = new Date();
    return (
      policy.status === 'active' &&
      new Date(policy.activeFrom) <= now &&
      new Date(policy.activeTo) >= now
    );
  };

  const renderPolicy = ({ item }: { item: Policy }) => (
    <TouchableOpacity
      style={[styles.policyCard, isActiveNow(item) && styles.activeCard]}
      onPress={() => navigation.navigate('PolicyDetail', { policyId: item.policyId })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badges}>
          <View style={[styles.badge, item.policyType === 'exam' ? styles.examBadge : styles.focusBadge]}>
            <Text style={styles.badgeText}>{item.policyType.toUpperCase()}</Text>
          </View>
          {isActiveNow(item) && (
            <View style={[styles.badge, styles.activeBadge]}>
              <Text style={styles.badgeText}>ACTIVE</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => handleToggle(item)}>
          <Ionicons
            name={item.status === 'active' ? 'toggle' : 'toggle-outline'}
            size={28}
            color={item.status === 'active' ? '#22c55e' : '#9ca3af'}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.policyName}>{item.policyName}</Text>

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={16} color="#6b7280" />
        <Text style={styles.timeText}>
          {format(new Date(item.activeFrom), 'MMM d, h:mm a')} - {format(new Date(item.activeTo), 'h:mm a')}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name={item.assignmentType === 'institution' ? 'business-outline' : 'people-outline'}
          size={16}
          color="#6b7280"
        />
        <Text style={styles.infoText}>
          {item.assignmentType === 'institution' ? 'Institution-wide' : 'Individual'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('PolicyEdit', { policy: item })}
        >
          <Ionicons name="create-outline" size={20} color="#3b82f6" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('PolicyAssignments', { policyId: item.policyId })}
        >
          <Ionicons name="people-outline" size={20} color="#8b5cf6" />
          <Text style={styles.actionText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Policies</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('PolicyCreate')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Conflict Notice */}
      <View style={styles.conflictNotice}>
        <Ionicons name="warning-outline" size={20} color="#d97706" />
        <Text style={styles.conflictText}>
          Conflict Resolution: Exam policies always override Focus policies
        </Text>
      </View>

      <FlatList
        data={policies}
        renderItem={renderPolicy}
        keyExtractor={(item) => item.policyId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPolicies(); }} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No policies yet</Text>
              <Text style={styles.emptySubtext}>Create your first exam or focus policy</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  addButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 8 },
  conflictNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', margin: 16, marginTop: 0, padding: 12, borderRadius: 8, gap: 8 },
  conflictText: { flex: 1, fontSize: 13, color: '#92400e' },
  list: { padding: 16, paddingTop: 0 },
  policyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  activeCard: { borderColor: '#22c55e', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  examBadge: { backgroundColor: '#3b82f6' },
  focusBadge: { backgroundColor: '#8b5cf6' },
  activeBadge: { backgroundColor: '#22c55e' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  policyName: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  timeText: { fontSize: 14, color: '#6b7280' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontSize: 14, color: '#6b7280' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 14, color: '#3b82f6' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
});

export default PolicyListScreen;
```

---

## Ethics Compliance

This module follows HumanFirst's core principles:

- ❌ No content reading
- ❌ No keystroke monitoring
- ❌ No behavior scoring
- ❌ No AI detection
- ✅ Only focus mode compliance is tracked

---

## Conflict Resolution

When policies overlap, the system uses this priority:

1. **Exam Policy** (priority: 10) - Always wins
2. **Focus Policy** (priority: 5) - Lower priority

This is deterministic: no edge cases, no debate.
