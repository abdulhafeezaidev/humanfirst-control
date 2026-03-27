// Auth Context - Provides authentication state and role-based permissions
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPermissions, isAdminRole, hasAdminViewAccess, canPerformMutations, Permissions, AppRole } from '@/lib/permissions';
import { Organization } from '@/types/organization';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  permissions: Permissions;
  organization: Organization | null;
  ethicsAccepted: boolean;
  loading: boolean;
  isAdmin: boolean;
  hasViewAccess: boolean;
  canMutate: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshEthicsStatus: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [ethicsAccepted, setEthicsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  const permissions = getPermissions(role);
  const isAdmin = isAdminRole(role);
  const hasViewAccess = hasAdminViewAccess(role);
  const canMutate = canPerformMutations(role);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) {
      setRole(data.role as AppRole);
    }
  };

  const fetchEthicsStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('ethics_accepted_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data && !error) {
      setEthicsAccepted(data.ethics_accepted_at !== null);
    }
  };

  const fetchOrganization = async (userId: string) => {
    // First get the user's organization_id from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (profile?.organization_id) {
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();
      
      if (org && !error) {
        setOrganization(org as Organization);
      }
    }
  };

  const refreshEthicsStatus = async () => {
    if (user) {
      await fetchEthicsStatus(user.id);
    }
  };

  const refreshOrganization = async () => {
    if (user) {
      await fetchOrganization(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role and ethics fetch with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchEthicsStatus(session.user.id);
            fetchOrganization(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setEthicsAccepted(false);
          setOrganization(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchEthicsStatus(session.user.id);
        fetchOrganization(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setEthicsAccepted(false);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      permissions, 
      organization, 
      isAdmin, 
      hasViewAccess,
      canMutate,
      ethicsAccepted, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      refreshEthicsStatus, 
      refreshOrganization 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
