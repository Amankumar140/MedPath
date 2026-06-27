import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logoImage from "../assets/medpath_logo.png";

export function SignupPage() {
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "bg-error", "bg-tertiary-container", "bg-secondary", "bg-secondary"];
    return { score, label: labels[score], color: colors[score] };
  })();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setLoadingSubmit(true);
    setErrorMsg("");
    try {
      await signupWithEmail(email, password, fullName);
      navigate("/home");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed. Please try another email.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
      navigate("/home");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Google authentication failed.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex font-sans text-on-surface antialiased bg-background ${theme === "light" ? "light" : "dark"}`}>
      
      {/* Left Branded Panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden flex-col justify-between p-10">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary/80"></div>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
        {/* Animated ambient orbs */}
        <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-secondary/20 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] rounded-full bg-on-primary/10 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
        
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-2 hover:opacity-90 transition-all cursor-pointer">
            <img alt="MedPath" className="w-10 h-10 object-contain" src={logoImage} />
            <span className="text-on-primary font-bold text-2xl tracking-tight">MedPath</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-on-primary text-4xl font-bold leading-tight mb-5 tracking-tight">
            Your Healthcare Journey Starts Here
          </h2>
          <p className="text-on-primary/70 text-base leading-relaxed mb-8">
            Join thousands of patients who use MedPath's clinical AI to find the best specialists and hospitals for their unique health needs.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-5">
            {[
              { value: "15k+", label: "Patients" },
              { value: "98.4%", label: "Accuracy" },
              { value: "60s", label: "Avg. Time" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-on-primary text-2xl font-bold">{stat.value}</p>
                <p className="text-on-primary/50 text-xs mt-0.5 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-on-primary/50 text-xs">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <span>256-bit AES encryption • SOC2 Type II certified</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-15%] right-[-15%] w-[400px] h-[400px] rounded-full bg-primary-fixed-dim/15 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-secondary-container/10 blur-[100px]"></div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 z-20 p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all active:scale-95 flex items-center justify-center border border-outline-variant/30 cursor-pointer"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined text-[18px]">
            {theme === "light" ? "dark_mode" : "light_mode"}
          </span>
        </button>

        <main className="w-full max-w-[420px] px-6 sm:px-8 z-10 relative py-8">
          {/* Mobile-only logo */}
          <Link to="/" className="lg:hidden mb-8 flex items-center gap-3 justify-center hover:opacity-90 transition-all cursor-pointer">
            <img alt="MedPath" className="w-10 h-10 object-contain" src={logoImage} />
            <span className="font-bold text-2xl tracking-tight text-primary">MedPath</span>
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight mb-1">Create your account</h1>
            <p className="text-on-surface-variant text-sm">Get started with personalized medical guidance.</p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 p-3 bg-error-container/80 text-on-error-container rounded-xl text-sm border border-error/15 flex items-start gap-2.5 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px] mt-0.5 text-error flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Google signup */}
          <button 
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-outline-variant/40 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low hover:border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 cursor-pointer disabled:opacity-60 mb-5" 
            type="button"
          >
            {loadingGoogle ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                <span className="text-sm font-medium text-on-surface">Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-background text-xs text-on-surface-variant/70 uppercase tracking-widest font-medium">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="fullName">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">person</span>
                </div>
                <input 
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-200" 
                  id="fullName" 
                  name="fullName" 
                  placeholder="John Doe" 
                  required 
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="signup-email">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">mail</span>
                </div>
                <input 
                  className="block w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-200" 
                  id="signup-email" 
                  name="email" 
                  placeholder="name@example.com" 
                  required 
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="signup-password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">lock</span>
                </div>
                <input 
                  className="block w-full pl-10 pr-11 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-200" 
                  id="signup-password" 
                  name="password" 
                  placeholder="Min. 8 characters" 
                  required 
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-outline hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level} 
                        className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                          level <= passwordStrength.score ? passwordStrength.color : "bg-outline-variant/30"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score <= 1 ? "text-error" : 
                    passwordStrength.score === 2 ? "text-on-tertiary-container" : "text-secondary"
                  }`}>{passwordStrength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">lock</span>
                </div>
                <input 
                  className={`block w-full pl-10 pr-11 py-2.5 bg-surface-container-lowest border rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:ring-2 outline-none transition-all duration-200 ${
                    confirmPassword && confirmPassword !== password 
                      ? "border-error/50 focus:border-error focus:ring-error/15" 
                      : confirmPassword && confirmPassword === password
                        ? "border-secondary/50 focus:border-secondary focus:ring-secondary/15"
                        : "border-outline-variant/40 focus:border-primary focus:ring-primary/15"
                  }`}
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="••••••••" 
                  required 
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-outline hover:text-on-surface-variant transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">{showConfirm ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">close</span>
                  Passwords don't match
                </p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="mt-1 text-xs text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Passwords match
                </p>
              )}
            </div>

            <button 
              disabled={loadingSubmit || (confirmPassword && confirmPassword !== password)}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl font-medium text-sm text-on-primary bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-60 cursor-pointer shadow-lg shadow-primary/20 active:scale-[0.98] mt-1" 
              type="submit"
            >
              {loadingSubmit ? (
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-xs text-on-surface-variant/60 text-center leading-relaxed pt-0.5">
              By creating an account, you agree to our{" "}
              <a href="#terms" className="text-primary hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#privacy" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link className="font-semibold text-primary hover:text-primary/80 transition-colors" to="/login">
              Sign in
            </Link>
          </p>

          {/* HIPAA badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-on-surface-variant/50 text-xs">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
            <span>End-to-end encrypted & HIPAA compliant</span>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SignupPage;
