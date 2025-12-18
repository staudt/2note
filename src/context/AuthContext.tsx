import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isAuthEnabled } from '../firebase/config';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthEnabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  userId: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Default user ID for local development (no auth)
const LOCAL_USER_ID = 'local-user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isAuthEnabled);

  useEffect(() => {
    if (!isAuthEnabled || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  // User ID for storage - use Firebase UID if authenticated, otherwise local ID
  const userId = user?.uid || LOCAL_USER_ID;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthEnabled,
        signInWithGoogle,
        signOut,
        userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
