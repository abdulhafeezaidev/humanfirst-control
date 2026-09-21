import { vi } from 'vitest';

export const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => mockQueryBuilder),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove: vi.fn(),
    })),
  },
};

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  match: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  throwOnError: vi.fn().mockReturnThis(),
  then: vi.fn(),
};

// Auto-mock the @supabase/supabase-js module
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

// Mock the lib/supabase singleton
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Utility to mock DB response
export const setMockQueryResponse = (data: any = null, error: any = null) => {
  mockQueryBuilder.then.mockImplementation((callback: any) => {
    return Promise.resolve(callback({ data, error }));
  });
};
