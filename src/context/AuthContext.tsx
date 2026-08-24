'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Shop, GstSettings, Profile } from '@/types/database';
import { Storage } from '@/services/storage';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  shop: Shop | null;
  gstSettings: GstSettings | null;
  loading: boolean;
  refreshShop: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  shop: null,
  gstSettings: null,
  loading: true,
  refreshShop: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadUserContext(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setShop(null);
          setGstSettings(null);
          setLoading(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const initAuth = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          await loadUserContext(currentUser);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext Init Error]', err);
        setLoading(false);
      }
    } else {
      // Mock fallback if Supabase env not set
      setShop(Storage.getShop());
      setGstSettings(Storage.getGstSettings());
      setLoading(false);
    }
  };

  const loadUserContext = async (currentUser: User) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || 'Shop Owner',
          role: 'owner',
          created_at: currentUser.created_at,
        });
      }

      // 2. Fetch Shop where owner_id = currentUser.id
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', currentUser.id)
        .limit(1)
        .maybeSingle();

      if (shopData) {
        const normalizedShop: Shop = {
          id: shopData.id,
          owner_id: shopData.owner_id,
          name: shopData.name || shopData.shop_name || 'My Shop',
          address: shopData.address || '',
          phone: shopData.phone || '',
          gst_number: shopData.gst_number || shopData.gstin || '',
          state_code: shopData.state_code || '',
          created_at: shopData.created_at,
        };
        setShop(normalizedShop);

        // 3. Fetch GST Settings
        const { data: gstData } = await supabase
          .from('gst_settings')
          .select('*')
          .eq('shop_id', shopData.id)
          .maybeSingle();

        if (gstData) {
          setGstSettings(gstData as GstSettings);
        }
      } else {
        setShop(null);
        setGstSettings(null);
      }
    } catch (err) {
      console.error('[AuthContext loadUserContext Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshShop = async () => {
    if (user) {
      setLoading(true);
      await loadUserContext(user);
    }
  };

  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setShop(null);
    setGstSettings(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        shop,
        gstSettings,
        loading,
        refreshShop,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
