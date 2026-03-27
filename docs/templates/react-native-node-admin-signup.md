# React Native + Node.js Admin Signup Templates

**HumanFirst Pilot v0.1 - Reference Implementation**

These templates provide a starting point for building the admin signup flow in a React Native mobile app with Node.js backend. 

> ⚠️ **Note**: This is reference code for external development. The Lovable project uses React Web + Supabase.

---

## 1. Node.js Backend

### Project Structure
```
backend/
├── src/
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Institution.js
│   │   └── Admin.js
│   ├── routes/
│   │   └── auth.js
│   ├── utils/
│   │   └── jwt.js
│   └── index.js
├── package.json
└── .env
```

### package.json
```json
{
  "name": "humanfirst-backend",
  "version": "0.1.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### src/models/Institution.js
```javascript
const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Institution name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['k12', 'higher_ed', 'corporate', 'other'],
    default: 'k12'
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

institutionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Institution', institutionSchema);
```

### src/models/Admin.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: ['owner', 'standard'],
    default: 'standard'
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.updatedAt = Date.now();
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
```

### src/utils/jwt.js
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (adminId, institutionId, role) => {
  return jwt.sign(
    { 
      adminId, 
      institutionId, 
      role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
```

### src/middleware/auth.js
```javascript
const { verifyToken } = require('../utils/jwt');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const decoded = verifyToken(token);
    const admin = await Admin.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or inactive'
      });
    }

    req.admin = admin;
    req.institutionId = decoded.institutionId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const requireOwner = (req, res, next) => {
  if (req.admin.role !== 'owner') {
    return res.status(403).json({
      success: false,
      message: 'Owner access required'
    });
  }
  next();
};

module.exports = { protect, requireOwner };
```

### src/controllers/authController.js
```javascript
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Institution = require('../models/Institution');
const { generateToken } = require('../utils/jwt');

// @desc    Register first admin (Owner) with new institution
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, fullName, institutionName, institutionSlug, institutionType } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if institution slug exists
    const existingInstitution = await Institution.findOne({ slug: institutionSlug });
    if (existingInstitution) {
      return res.status(400).json({
        success: false,
        message: 'Institution slug already taken'
      });
    }

    // Create institution
    const institution = await Institution.create({
      name: institutionName,
      slug: institutionSlug,
      type: institutionType || 'k12'
    });

    // Create owner admin
    const admin = await Admin.create({
      email,
      password,
      fullName,
      role: 'owner',
      institutionId: institution._id
    });

    // Generate JWT
    const token = generateToken(admin._id, institution._id, admin.role);

    res.status(201).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role
        },
        institution: {
          id: institution._id,
          name: institution.name,
          slug: institution.slug,
          type: institution.type
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin with password
    const admin = await Admin.findOne({ email }).select('+password').populate('institutionId');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT
    const token = generateToken(admin._id, admin.institutionId._id, admin.role);

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role
        },
        institution: {
          id: admin.institutionId._id,
          name: admin.institutionId.name,
          slug: admin.institutionId.slug
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Invite new admin (by Owner)
// @route   POST /api/auth/invite
// @access  Private (Owner only)
exports.inviteAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, fullName, role } = req.body;

    // Only allow standard role invites (owner cannot be invited)
    if (role && role !== 'standard') {
      return res.status(400).json({
        success: false,
        message: 'Can only invite standard admins'
      });
    }

    // Check if email exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate temporary password (in production, use invitation tokens)
    const tempPassword = Math.random().toString(36).slice(-12);

    // Create admin
    const admin = await Admin.create({
      email,
      password: tempPassword,
      fullName,
      role: 'standard',
      institutionId: req.institutionId
    });

    // In production: Send invitation email with tempPassword or reset link

    res.status(201).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role
        },
        // Remove in production - only for demo
        tempPassword
      }
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during invitation'
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).populate('institutionId');
    
    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role
        },
        institution: {
          id: admin.institutionId._id,
          name: admin.institutionId.name,
          slug: admin.institutionId.slug,
          type: admin.institutionId.type
        }
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
```

### src/routes/auth.js
```javascript
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, inviteAdmin, getMe } = require('../controllers/authController');
const { protect, requireOwner } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name required'),
  body('institutionName').trim().isLength({ min: 3, max: 100 }).withMessage('Institution name required'),
  body('institutionSlug')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must be lowercase alphanumeric with hyphens')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

const inviteValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name required')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/invite', protect, requireOwner, inviteValidation, inviteAdmin);
router.get('/me', protect, getMe);

module.exports = router;
```

### src/index.js
```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
```

### .env (example)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/humanfirst
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

---

## 2. React Native Frontend

### Project Structure
```
mobile/
├── src/
│   ├── api/
│   │   └── auth.ts
│   ├── components/
│   │   └── Input.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── screens/
│   │   ├── SignupScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── types/
│       └── auth.ts
├── App.tsx
└── package.json
```

### package.json
```json
{
  "name": "humanfirst-mobile",
  "version": "0.1.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-secure-store": "~13.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "axios": "^1.6.2",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0"
  }
}
```

### src/types/auth.ts
```typescript
export interface Admin {
  id: string;
  email: string;
  fullName: string;
  role: 'owner' | 'standard';
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  type?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    admin: Admin;
    institution: Institution;
    token: string;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  institutionName: string;
  institutionSlug: string;
  institutionType?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
```

### src/api/auth.ts
```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterPayload, LoginPayload } from '../types/auth';

const API_URL = 'http://localhost:3000/api'; // Change for production

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', payload);
    if (response.data.success) {
      await SecureStore.setItemAsync('authToken', response.data.data.token);
    }
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', payload);
    if (response.data.success) {
      await SecureStore.setItemAsync('authToken', response.data.data.token);
    }
    return response.data;
  },

  getMe: async (): Promise<AuthResponse> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync('authToken');
  },

  getToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync('authToken');
  },
};
```

### src/contexts/AuthContext.tsx
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth';
import { Admin, Institution, RegisterPayload, LoginPayload } from '../types/auth';

interface AuthContextType {
  admin: Admin | null;
  institution: Institution | null;
  loading: boolean;
  isAuthenticated: boolean;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authApi.getToken();
      if (token) {
        const response = await authApi.getMe();
        if (response.success) {
          setAdmin(response.data.admin);
          setInstitution(response.data.institution);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    if (response.success) {
      setAdmin(response.data.admin);
      setInstitution(response.data.institution);
    }
  };

  const login = async (payload: LoginPayload) => {
    const response = await authApi.login(payload);
    if (response.success) {
      setAdmin(response.data.admin);
      setInstitution(response.data.institution);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setAdmin(null);
    setInstitution(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        institution,
        loading,
        isAuthenticated: !!admin,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### src/screens/SignupScreen.tsx
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState<'account' | 'institution'>('account');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    institutionName: '',
    institutionSlug: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleAccountNext = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setStep('institution');
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleSubmit = async () => {
    if (!formData.institutionName || !formData.institutionSlug) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await register({
        ...formData,
        institutionType: 'k12',
      });
      Alert.alert('Success', 'Institution created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>HumanFirst</Text>
        <Text style={styles.subtitle}>
          {step === 'account' ? 'Create Admin Account' : 'Set Up Institution'}
        </Text>
      </View>

      {/* Progress indicator */}
      <View style={styles.progress}>
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={[styles.progressLine, step === 'institution' && styles.progressLineActive]} />
        <View style={[styles.progressDot, step === 'institution' && styles.progressActive]} />
      </View>

      {step === 'account' ? (
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            placeholder="Your full name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="admin@institution.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            placeholder="Minimum 8 characters"
            secureTextEntry
          />

          <TouchableOpacity style={styles.button} onPress={handleAccountNext}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Institution Name</Text>
          <TextInput
            style={styles.input}
            value={formData.institutionName}
            onChangeText={(text) => {
              setFormData({
                ...formData,
                institutionName: text,
                institutionSlug: generateSlug(text),
              });
            }}
            placeholder="Springfield High School"
          />

          <Text style={styles.label}>Institution Slug</Text>
          <TextInput
            style={styles.input}
            value={formData.institutionSlug}
            onChangeText={(text) =>
              setFormData({ ...formData, institutionSlug: text.toLowerCase().replace(/[^a-z0-9-]/g, '') })
            }
            placeholder="springfield-hs"
            autoCapitalize="none"
          />

          <View style={styles.ownerBadge}>
            <Text style={styles.ownerTitle}>You'll be the Owner</Text>
            <Text style={styles.ownerText}>
              As the first admin, you have full control including inviting other admins.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setStep('account')}
            >
              <Text style={styles.buttonSecondaryText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Institution</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressActive: {
    backgroundColor: '#6366f1',
  },
  progressLine: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#6366f1',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonSecondaryText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPrimary: {
    flex: 2,
  },
  ownerBadge: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  ownerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ownerText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  link: {
    textAlign: 'center',
    color: '#6366f1',
    fontSize: 14,
  },
});

export default SignupScreen;
```

---

## API Endpoints Summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register owner + institution |
| POST | `/api/auth/login` | Public | Login admin |
| GET | `/api/auth/me` | Protected | Get current admin profile |
| POST | `/api/auth/invite` | Owner only | Invite new admin |

---

## Security Notes

1. **JWT tokens** expire after 7 days (configurable)
2. **Passwords** are hashed with bcrypt (12 rounds)
3. **Email uniqueness** is enforced at database level
4. **Owner role** cannot be invited - only first admin becomes owner
5. **No student content** - this is admin-only flow

---

## Next Steps for Production

1. Add email verification
2. Implement password reset
3. Add rate limiting
4. Set up proper MongoDB indexes
5. Add request logging/monitoring
6. Implement invitation tokens with expiry
7. Add 2FA support
