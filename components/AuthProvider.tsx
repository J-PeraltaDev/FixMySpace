"use client";

import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { ensureWorkerProfile } from "@/lib/firebase-data";
import type { UserProfile, UserRole } from "@/lib/types";

type RegisterInput = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  municipality: string;
  role: UserRole;
};

type AuthContextValue = {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateLocalProfile: (profile: UserProfile) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (code.includes("invalid-credential")) return "Correo o contraseña incorrectos.";
  if (code.includes("email-already-in-use")) return "Este correo ya está registrado.";
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("network-request-failed")) return "No pudimos conectar con Firebase. Revisa tu conexión.";

  return "Ocurrió un problema. Intenta nuevamente.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setError("");

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          setProfile({ uid: user.uid, ...(snapshot.data() as Omit<UserProfile, "uid">) });
        } else {
          setProfile({
            uid: user.uid,
            role: "cliente",
            fullName: user.displayName || "Usuario FixMySpace",
            phone: "",
            email: user.email || "",
            municipality: "",
          });
        }
      } catch {
        setProfile({
          uid: user.uid,
          role: "cliente",
          fullName: user.displayName || "Usuario FixMySpace",
          phone: "",
          email: user.email || "",
          municipality: "",
        });
        setError("Sesión activa, pero no se pudo leer el perfil en Firestore.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (loginError) {
      const message = friendlyAuthError(loginError);
      setError(message);
      throw new Error(message);
    }
  }

  async function register(input: RegisterInput) {
    setError("");
    try {
      const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
      await updateProfile(credential.user, { displayName: input.fullName });

      const userProfile: UserProfile = {
        uid: credential.user.uid,
        role: input.role,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        municipality: input.municipality,
        avatarUrl: "",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", credential.user.uid), userProfile);

      if (input.role === "trabajador") {
        await ensureWorkerProfile(credential.user.uid, input.municipality);
      }

      setProfile(userProfile);
    } catch (registerError) {
      const message = friendlyAuthError(registerError);
      setError(message);
      throw new Error(message);
    }
  }

  async function logout() {
    setError("");
    await signOut(auth);
  }

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      error,
      login,
      register,
      logout,
      updateLocalProfile: setProfile,
    }),
    [firebaseUser, profile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
