import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { ThemeProvider } from 'next-themes';

// Mock contexts
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1' },
    role: 'super_admin',
    permissions: {
      canManagePolicies: true,
      canTogglePilotMode: true,
    },
    organization: { 
      id: 'org-1', 
      name: 'Test Org', 
      plan_type: 'institution', 
      max_admins: 10, 
      max_students: 1000, 
      max_devices: 2000, 
      features_enabled: ['sso', 'custom_branding'],
      audit_log_retention_days: 90,
      tamper_event_retention_days: 30
    },
    isAdmin: true,
    ethicsAccepted: true,
    loading: false,
  }),
}));

// Mock Supabase
const mockSupabaseSelect = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: vi.fn().mockImplementation(() => {
        return {
          eq: vi.fn().mockImplementation(() => {
            return {
              order: vi.fn().mockImplementation(() => {
                return {
                  limit: vi.fn().mockImplementation(() => {
                    return Promise.resolve({ data: getMockDataForTable(table), error: null });
                  }),
                  then: (cb: any) => cb({ data: getMockDataForTable(table), error: null })
                };
              }),
              in: vi.fn().mockImplementation(() => {
                return Promise.resolve({ data: getMockDataForTable(table), error: null });
              }),
              maybeSingle: vi.fn().mockImplementation(() => {
                return Promise.resolve({ data: getMockDataForTable(table)?.[0], error: null });
              }),
              then: (cb: any) => cb({ data: getMockDataForTable(table), error: null })
            };
          }),
          order: vi.fn().mockImplementation(() => {
            return Promise.resolve({ data: getMockDataForTable(table), error: null });
          })
        };
      })
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

function getMockDataForTable(table: string) {
  switch (table) {
    case 'exam_policies':
      return [{
        id: 'pol-1',
        title: 'Math Final Exam',
        description: 'No AI tools allowed',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 86400000).toISOString(),
        is_active: true,
        blocked_categories: ['AI Tools']
      }];
    case 'profiles':
      return [];
    case 'user_roles':
      return [];
    case 'ai_services':
      return [{ id: 'ai-1', name: 'ChatGPT', category: 'AI Tools', is_blocked_during_exam: true }];
    case 'enforcement_config':
      return [{ id: 'enf-1', status: 'active', pilot_mode: false }];
    case 'audit_logs':
      return [];
    case 'tamper_events':
      return [];
    default:
      return [];
  }
}

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe('Admin Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard with exam policies', async () => {
    renderWithProviders(<AdminDashboard />);
    
    // Check header
    expect(screen.getByText('HumanFirst')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    
    // Check if policies are rendered
    await waitFor(() => {
      expect(screen.getByText('Math Final Exam')).toBeInTheDocument();
    });
    expect(screen.getByText('No AI tools allowed')).toBeInTheDocument();
  });

  it('renders AI services registry', async () => {
    renderWithProviders(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('AI Services Registry')).toBeInTheDocument();
      expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    });
  });
});
