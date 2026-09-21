import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from './Auth';
import * as AuthContext from '@/contexts/AuthContext';
import { ThemeProvider } from 'next-themes';

// Mock the AuthContext
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    role: null,
    session: null,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: mockSignOut,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe('Auth Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders role selection screen initially', () => {
    renderWithProviders(<Auth />);
    
    expect(screen.getByText('Welcome to HumanFirst')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('navigates to login form when role is selected', () => {
    renderWithProviders(<Auth />);
    
    // Click Administrator card
    fireEvent.click(screen.getByText('Administrator'));
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('submits login form with valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });
    renderWithProviders(<Auth />);
    
    // Go to login
    fireEvent.click(screen.getByText('Administrator'));
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' },
    });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('admin@example.com', 'password123');
    });
  });

  it('shows validation errors for invalid password', async () => {
    renderWithProviders(<Auth />);
    
    // Go to login
    fireEvent.click(screen.getByText('Administrator'));
    
    // Fill valid email but invalid short password
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'short' },
    });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('can toggle between login and signup', () => {
    renderWithProviders(<Auth />);
    
    // Go to login
    fireEvent.click(screen.getByText('Administrator'));
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    
    // Click sign up link
    fireEvent.click(screen.getByText('Sign up'));
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
  });
});
