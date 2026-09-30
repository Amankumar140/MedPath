import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationContext";
import { useTheme } from "../context/ThemeContext";
import MedPathLogo from "../components/MedPathLogo";

export function MainLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startNewConsultation } = useConversations();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const drawerRef = useRef(null);
  const hamburgerButtonRef = useRef(null);
  const drawerCloseButtonRef = useRef(null);
  const previousDrawerFocusRef = useRef(null);

  const handleNewConsultation = () => {
    startNewConsultation();
    navigate("/chat/new");
    closeMobileDrawer();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // Close mobile drawer with exit animation
  const closeMobileDrawer = useCallback(() => {
    if (!mobileDrawerOpen) return;
    setDrawerClosing(true);
    setTimeout(() => {
      setMobileDrawerOpen(false);
      setDrawerClosing(false);
    }, 250);
  }, [mobileDrawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    if (mobileDrawerOpen) {
      closeMobileDrawer();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Mobile drawer accessibility: ESC key, focus trap, autofocus close button, return focus on close (C2, C3)
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    previousDrawerFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      drawerCloseButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMobileDrawer();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (previousDrawerFocusRef.current && typeof previousDrawerFocusRef.current.focus === "function") {
        previousDrawerFocusRef.current.focus();
      }
    };
  }, [mobileDrawerOpen, closeMobileDrawer]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  // Shared nav link component for drawer
  const DrawerNavLink = ({ to, icon, label }) => (
    <Link
      to={to}
      onClick={closeMobileDrawer}
      className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium touch-target ${
        isActive(to) || (to === "/hospitals" && location.pathname.startsWith("/hospitals/"))
          ? "text-primary bg-secondary-container shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      {label}
    </Link>
  );

  return (
    <div className={`min-h-screen bg-background text-on-background font-body-md antialiased flex flex-col md:flex-row pb-16 md:pb-0 pt-16 md:pt-0 relative ${theme === "light" ? "light" : "dark"}`}>
      
      {/* Decorative Atmospheric Organic Background Shapes (Material You) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-secondary-container/20 dark:bg-secondary-container/10 blur-3xl" />
        <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] rounded-full bg-tertiary-container/10 dark:bg-tertiary-container/5 blur-3xl" />
      </div>

      {/* TopAppBar (Mobile Only) */}
      <header className="fixed top-0 left-0 w-full h-16 z-50 flex justify-between items-center px-4 bg-surface-container/90 backdrop-blur-xl shadow-sm border-b border-outline-variant/15 md:hidden" role="banner" aria-label="MedPath mobile header">
        <div className="flex items-center gap-2">
          {/* Hamburger Button */}
          <button
            ref={hamburgerButtonRef}
            onClick={() => setMobileDrawerOpen(true)}
            className="touch-target flex items-center justify-center p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-drawer"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <Link to="/" className="text-headline-md font-headline-md font-bold premium-text-gradient hover:opacity-90 transition-all cursor-pointer">
            MedPath
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="touch-target flex items-center justify-center text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-all opacity-85 hover:opacity-100 duration-200 p-2 rounded-lg hover:bg-surface-container-low"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <Link to="/profile" className="w-9 h-9 rounded-full overflow-hidden border-2 border-outline-variant/30 hover:border-secondary transition-all shadow-sm">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="User profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-container text-primary flex items-center justify-center font-bold text-sm uppercase">
                {user?.displayName ? user.displayName.substring(0, 2) : "US"}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Overlay + Panel */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${drawerClosing ? "animate-overlay-out" : "animate-overlay-in"}`}
            onClick={closeMobileDrawer}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <nav
            ref={drawerRef}
            id="mobile-drawer"
            tabIndex={-1}
            className={`absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-surface dark:bg-surface-container shadow-2xl flex flex-col outline-none ${
              drawerClosing ? "animate-drawer-out" : "animate-drawer-in"
            }`}
            aria-label="Mobile navigation"
          >
            {/* Drawer Header */}
            <div className="p-5 pb-4 border-b border-outline-variant/15 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <Link to="/" onClick={closeMobileDrawer} className="flex items-center gap-3 hover:opacity-90 transition-all">
                  <MedPathLogo size={38} className="rounded-xl shadow-xs" />
                  <div>
                    <h1 className="text-headline-md font-headline-md font-bold premium-text-gradient leading-tight">
                      MedPath
                    </h1>
                    <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Guided Healthcare</p>
                  </div>
                </Link>
                <button
                  ref={drawerCloseButtonRef}
                  onClick={closeMobileDrawer}
                  className="touch-target flex items-center justify-center p-2 rounded-lg hover:bg-surface-container-low text-outline hover:text-primary transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                  aria-label="Close navigation menu"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>
              <button
                onClick={handleNewConsultation}
                className="w-full bg-primary text-on-primary py-3.5 rounded-full font-medium text-label-md hover:bg-primary/90 active:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 touch-target"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                New Consultation
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5">
              <DrawerNavLink to="/home" icon="search" label="Find Healthcare" />
              <DrawerNavLink to="/history" icon="history" label="Consultation History" />
              <DrawerNavLink to="/hospitals" icon="local_hospital" label="Recommended Hospitals" />
              <button
                type="button"
                onClick={() => {
                  navigate("/hospitals", { state: { activeTab: "feedback" } });
                  closeMobileDrawer();
                }}
                className="flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium touch-target text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">rate_review</span>
                Community Reviews
              </button>
              <DrawerNavLink to="/profile" icon="person" label="Profile & Settings" />
            </div>

            {/* Quick Emergency Dialer in mobile drawer */}
            <div className="px-3 py-2">
              <a
                href="tel:112"
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                Emergency Hotline (112)
              </a>
            </div>

            {/* Drawer Footer — User Profile */}
            <div className="p-3 border-t border-outline-variant/15">
              <Link
                to="/profile"
                onClick={closeMobileDrawer}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-container-low rounded-2xl transition-all"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/20 shrink-0 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm uppercase">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="User profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.displayName ? user.displayName.substring(0, 2) : "US"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-label-md font-bold text-primary truncate">
                    {user?.displayName || "MedPath User"}
                  </p>
                  <p className="text-[10px] text-outline truncate font-semibold">
                    {user?.email || "user@medpath.ai"}
                  </p>
                </div>
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* SideNavBar (Desktop Only) */}
      <nav className={`h-full hidden md:flex fixed left-0 top-0 flex-col border-r border-outline-variant/20 bg-surface-container/95 backdrop-blur-xl shadow-sm z-40 transition-transform duration-300 ease-in-out w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Main navigation">
        <div className="p-6 pb-4 border-b border-outline-variant/15 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer group">
              <MedPathLogo size={42} className="rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105" />
              <div>
                <h1 className="text-headline-md font-headline-md font-bold text-primary leading-tight">
                  MedPath
                </h1>
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Guided Healthcare</p>
              </div>
            </Link>
            
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-full hover:bg-surface-container-low text-outline hover:text-primary transition-all cursor-pointer hidden md:flex"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">left_panel_close</span>
            </button>
          </div>
          <button 
            onClick={handleNewConsultation}
            className="w-full bg-primary text-on-primary py-3.5 rounded-full font-medium text-label-md hover:bg-primary/90 active:bg-primary/80 transition-all flex items-center justify-center gap-2 mt-1 shadow-sm hover:shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Consultation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1.5">
          <Link 
            to="/home" 
            className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium ${
              isActive("/home") 
                ? "text-primary bg-secondary-container shadow-xs font-bold" 
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
            Find Healthcare
          </Link>

          <Link 
            to="/history" 
            className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium ${
              isActive("/history") 
                ? "text-primary bg-secondary-container shadow-xs font-bold" 
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
            Consultation History
          </Link>

          <Link 
            to="/hospitals" 
            className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium ${
              isActive("/hospitals") || location.pathname.startsWith("/hospitals/")
                ? "text-primary bg-secondary-container shadow-xs font-bold" 
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">local_hospital</span>
            Recommended Hospitals
          </Link>

          <button
            type="button"
            onClick={() => navigate("/hospitals", { state: { activeTab: "feedback" } })}
            className="flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">rate_review</span>
            Community Reviews
          </button>

          <Link 
            to="/profile" 
            className={`flex items-center gap-4 px-4 py-3 rounded-full transition-all text-label-md font-medium ${
              isActive("/profile") 
                ? "text-primary bg-secondary-container shadow-xs font-bold" 
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            Profile & Settings
          </Link>
        </div>

        {/* Sticky Emergency Helpline card at bottom of sidebar (C4) */}
        <div className="p-3 border-t border-outline-variant/15 bg-surface-container/95 shrink-0">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider block">
                Emergency Hotline
              </span>
              <span className="text-[10px] font-bold bg-red-600/15 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                24/7
              </span>
            </div>
            <p className="text-[11px] text-red-900/80 dark:text-red-200">
              National ambulance & emergency response.
            </p>
            <a
              href="tel:112"
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-full w-full justify-center transition-colors shadow-xs"
              aria-label="Call emergency hotline 112"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              Dial 112
            </a>
          </div>
        </div>

        {/* Profile popover menu overlay click outside handler */}
        {profileMenuOpen && (
          <div 
            className="fixed inset-0 z-45 bg-transparent" 
            onClick={() => setProfileMenuOpen(false)} 
          />
        )}

        {/* Profile Popover Menu Card */}
        <div className="p-3 border-t border-outline-variant/15 flex flex-col gap-1 relative z-50">
          {profileMenuOpen && (
            <div className="absolute bottom-20 left-3 right-3 z-50 bg-surface-container border border-outline-variant/20 rounded-[24px] shadow-lg p-2.5 flex flex-col gap-1 animate-slide-up w-[calc(100%-1.5rem)]">
              <Link 
                to="/profile" 
                onClick={() => setProfileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-all text-label-sm font-medium ${
                  isActive("/profile") 
                    ? "text-primary bg-secondary-container" 
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                Profile Settings
              </Link>
              
              <button 
                onClick={() => {
                  toggleTheme();
                  setProfileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-full transition-all text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              <hr className="border-outline-variant/15 my-1" />

              <button 
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-error-container/20 rounded-full transition-all text-label-sm font-medium text-error cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Logout
              </button>
            </div>
          )}

          {/* Profile Trigger Card */}
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center justify-between p-2 hover:bg-surface-container-low rounded-2xl transition-all text-left cursor-pointer border border-transparent hover:border-outline-variant/10"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={profileMenuOpen}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/20 shrink-0 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm uppercase">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="User profile" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName ? user.displayName.substring(0, 2) : "US"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-label-md font-bold text-primary truncate">
                  {user?.displayName || "MedPath User"}
                </p>
                <p className="text-[10px] text-outline truncate font-semibold">
                  {user?.email || "user@medpath.ai"}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-[20px] shrink-0">
              unfold_more
            </span>
          </button>
        </div>
      </nav>

      {/* Floating Sidebar Toggle Button (Desktop Only) */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-40 p-2.5 bg-surface-container/90 border border-outline-variant/20 rounded-full hover:bg-surface-container-low text-outline hover:text-primary transition-all cursor-pointer shadow-sm hover-lift backdrop-blur-xl"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[22px]">left_panel_open</span>
        </button>
      )}

      {/* Main Content Area */}
      <main 
        className={`flex-grow flex flex-col w-full min-h-[calc(100vh-4rem)] md:min-h-screen transition-all duration-300 ${
          sidebarOpen 
            ? "md:ml-64 md:w-[calc(100%-16rem)] md:pl-0" 
            : "md:ml-0 md:w-full md:pl-16"
        }`} 
        role="main"
      >
        <Outlet />
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 border-t border-outline-variant/15 bg-surface-container/90 backdrop-blur-xl shadow-lg pb-safe" style={{ minHeight: "4rem" }} aria-label="Mobile navigation">
        <Link 
          to="/home" 
          className={`flex flex-col items-center justify-center touch-target text-on-surface-variant hover:text-primary ${
            isActive("/home") ? "text-primary bg-secondary-container rounded-full px-4 py-1.5 font-medium" : ""
          }`}
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] mt-0.5">Home</span>
        </Link>
        <button 
          onClick={handleNewConsultation}
          className={`flex flex-col items-center justify-center touch-target text-on-surface-variant hover:text-primary ${
            location.pathname.startsWith("/chat/") ? "text-primary bg-secondary-container rounded-full px-4 py-1.5 font-medium" : ""
          }`}
        >
          <span className="material-symbols-outlined">chat_bubble</span>
          <span className="text-[10px] mt-0.5">AI Chat</span>
        </button>
        <Link 
          to="/hospitals" 
          className={`flex flex-col items-center justify-center touch-target text-on-surface-variant hover:text-primary ${
            isActive("/hospitals") || location.pathname.startsWith("/hospitals/") ? "text-primary bg-secondary-container rounded-full px-4 py-1.5 font-medium" : ""
          }`}
        >
          <span className="material-symbols-outlined">local_hospital</span>
          <span className="text-[10px] mt-0.5">Hospitals</span>
        </Link>
        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center touch-target text-on-surface-variant hover:text-primary ${
            isActive("/profile") ? "text-primary bg-secondary-container rounded-full px-4 py-1.5 font-medium" : ""
          }`}
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] mt-0.5">Profile</span>
        </Link>
      </nav>

    </div>
  );
}

export default MainLayout;
