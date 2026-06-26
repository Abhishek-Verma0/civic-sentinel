import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Shield, Mail, Lock, User, Eye, EyeOff, AlertCircle, Sparkles, LogIn, UserPlus } from "lucide-react";
import { motion } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (user: any, role: "citizen" | "authority") => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"citizen" | "authority">("citizen");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (!isLogin && !displayName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // LOG IN with auto-registration fallback for demo accounts
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          const isDemoCredential = email === "admin@civicsentinel.com" || email === "citizen@civicsentinel.com";
          if (isDemoCredential && (signInErr.code === "auth/invalid-credential" || signInErr.code === "auth/user-not-found")) {
            console.log("Demo credential not found, auto-registering...");
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw signInErr;
          }
        }
        const user = userCredential.user;

        // Fetch user profile from firestore to retrieve role
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userRole: "citizen" | "authority" = "citizen";
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          userRole = userData.role || "citizen";
        } else {
          // Fallback: If user doc does not exist, default based on email or create one
          userRole = email.includes("admin") ? "authority" : "citizen";
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email || email,
            displayName: user.displayName || displayName || (userRole === "authority" ? "Chief Dispatcher" : "Model Citizen"),
            role: userRole,
            createdAt: new Date().toISOString()
          });
        }

        setSuccessMsg("Logged in successfully!");
        setTimeout(() => {
          onAuthSuccess(user, userRole);
        }, 500);

      } else {
        // REGISTER NEW ACCOUNT
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save profile in Firestore
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || email,
          displayName: displayName,
          role: role,
          createdAt: new Date().toISOString()
        });

        setSuccessMsg("Account created and registered successfully!");
        setTimeout(() => {
          onAuthSuccess(user, role);
        }, 800);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Improve Firebase error readability
      let friendlyError = err.message || "An error occurred. Please try again.";
      if (err.code === "auth/invalid-credential") {
        friendlyError = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        friendlyError = "This email is already in use by another account.";
      } else if (err.code === "auth/weak-password") {
        friendlyError = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        friendlyError = "Please enter a valid email address.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (testEmail: string, testRole: "citizen" | "authority") => {
    setError(null);
    setSuccessMsg(null);
    setIsLogin(true);
    setEmail(testEmail);
    setPassword(testEmail.includes("admin") ? "admin123" : "citizen123");
    setRole(testRole);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden"
      >
        {/* BRAND BANNER */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#4f46e5_0%,transparent_50%)] opacity-30"></div>
          <div className="relative flex flex-col items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg border border-indigo-500">
              <Shield className="w-6 h-6 text-indigo-50" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">CivicSentinel</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Secure Citizen & Dispatch Access Portal</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 py-4 text-xs font-bold transition-all text-center flex items-center justify-center gap-2 border-b-2 ${
              isLogin 
                ? "border-indigo-600 text-indigo-700 bg-slate-50/40 font-extrabold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 py-4 text-xs font-bold transition-all text-center flex items-center justify-center gap-2 border-b-2 ${
              !isLogin 
                ? "border-indigo-600 text-indigo-700 bg-slate-50/40 font-extrabold" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Account
          </button>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleAuth} className="p-6 space-y-4">
          
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium">
              <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* NAME FIELD (REGISTER ONLY) */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="E.g. Jane Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-hidden transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-hidden transition-all"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-10 py-2.5 text-xs outline-hidden transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ROLE SELECTOR (REGISTER ONLY) */}
          {!isLogin && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Select Profile Role</label>
              <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole("citizen")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    role === "citizen"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Citizen / Civilian
                </button>
                <button
                  type="button"
                  onClick={() => setRole("authority")}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    role === "authority"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Authority / Officer
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic text-center">
                {role === "citizen" 
                  ? "Access to submit local issues and view the civic map." 
                  : "Access to municipal control dashboards, SLA targets, and dispatch operations."}
              </p>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs py-3 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isLogin ? (
              "Sign In to CivicSentinel"
            ) : (
              "Register & Initialize Profile"
            )}
          </button>
        </form>

        {/* DEMO / TEST ACCOUNT QUICK AUTOFILLS */}
        <div className="px-6 pb-6 pt-2 bg-slate-50/50 border-t border-slate-100/80 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Interactive Demo Login Shortcuts</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleAutofill("citizen@civicsentinel.com", "citizen")}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 text-left transition-all cursor-pointer group active:scale-[0.97]"
            >
              <div className="text-[10px] font-black uppercase text-indigo-600 tracking-wide">Test Citizen</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">citizen@civicsentinel.com</div>
              <div className="text-[9px] text-slate-400 italic mt-0.5">Password: citizen123</div>
            </button>
            <button
              onClick={() => handleAutofill("admin@civicsentinel.com", "authority")}
              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 text-left transition-all cursor-pointer group active:scale-[0.97]"
            >
              <div className="text-[10px] font-black uppercase text-indigo-600 tracking-wide">Test Admin / Officer</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">admin@civicsentinel.com</div>
              <div className="text-[9px] text-slate-400 italic mt-0.5">Password: admin123</div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Inline fallback check for CheckCircle to avoid any import mismatch
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
