import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationContext";
import { useTheme } from "../context/ThemeContext";
import logoImage from "../assets/screen.png";

export function MainLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startNewConsultation } = useConversations();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleNewConsultation = () => {
    startNewConsultation();
    navigate("/chat/new");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`min-h-screen bg-background text-on-background font-body-md antialiased flex flex-col md:flex-row pb-16 md:pb-0 pt-16 md:pt-0 ${theme === "light" ? "light" : "dark"}`}>
      
      {/* TopAppBar (Mobile Only) */}
      <header className="fixed top-0 left-0 w-full h-16 z-50 flex justify-between items-center px-5 bg-surface/80 backdrop-blur-xl dark:bg-surface-container/85 shadow-[0px_4px_24px_rgba(0,0,0,0.03)] border-b border-outline-variant/15 md:hidden" role="banner" aria-label="MedPath mobile header">
        <Link to="/" className="text-headline-md font-headline-md font-bold premium-text-gradient hover:opacity-90 transition-all cursor-pointer">
          MedPath
        </Link>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed transition-all opacity-85 hover:opacity-100 duration-200 p-2 rounded-lg hover:bg-surface-container-low"
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

      {/* SideNavBar (Desktop Only) */}
      <nav className={`h-full hidden md:flex fixed left-0 top-0 flex-col border-r border-outline-variant/20 bg-surface/95 dark:bg-surface-container/95 backdrop-blur-xl shadow-md z-40 transition-transform duration-300 ease-in-out w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Main navigation">
        <div className="p-6 pb-4 border-b border-outline-variant/15 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-on-primary shrink-0 overflow-hidden shadow-sm">
                <img src={logoImage} alt="MedPath Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-headline-md font-headline-md font-bold premium-text-gradient leading-tight">
                  MedPath
                </h1>
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Guided Healthcare</p>
              </div>
            </Link>
            
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-outline hover:text-primary transition-all cursor-pointer hidden md:flex"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">left_panel_close</span>
            </button>
          </div>
          <button 
            onClick={handleNewConsultation}
            className="w-full premium-gradient-primary text-on-primary py-3.5 rounded-xl font-semibold text-label-md hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-1 shadow-md hover-lift"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Consultation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col gap-1.5">
          <Link 
            to="/home" 
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-label-md font-semibold ${
              isActive("/home") 
                ? "text-primary dark:text-primary-fixed bg-secondary-container/20 dark:bg-primary-container/30 shadow-sm border border-outline-variant/10" 
                : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            Dashboard
          </Link>

          <Link 
            to="/history" 
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-label-md font-semibold ${
              isActive("/history") 
                ? "text-primary dark:text-primary-fixed bg-secondary-container/20 dark:bg-primary-container/30 shadow-sm border border-outline-variant/10" 
                : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
            Chat History
          </Link>

          <Link 
            to="/hospitals" 
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-label-md font-semibold ${
              isActive("/hospitals") || location.pathname.startsWith("/hospitals/")
                ? "text-primary dark:text-primary-fixed bg-secondary-container/20 dark:bg-primary-container/30 shadow-sm border border-outline-variant/10" 
                : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">local_hospital</span>
            Hospitals
          </Link>

          <Link 
            to="/" 
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-label-md font-semibold ${
              isActive("/") 
                ? "text-primary dark:text-primary-fixed bg-secondary-container/20 dark:bg-primary-container/30 shadow-sm border border-outline-variant/10" 
                : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">public</span>
            Home Page
          </Link>
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
            <div className="absolute bottom-20 left-3 right-3 z-50 premium-glass-card border border-outline-variant/20 rounded-2xl shadow-lg p-2.5 flex flex-col gap-1 animate-slide-up w-[calc(100%-1.5rem)]">
              <Link 
                to="/profile" 
                onClick={() => setProfileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-label-sm font-semibold ${
                  isActive("/profile") 
                    ? "text-primary dark:text-primary-fixed bg-secondary-container/20 dark:bg-primary-container/30 border border-outline-variant/10" 
                    : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40"
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
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-label-sm font-semibold text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-variant/40 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              <hr className="border-outline-variant/10 my-1" />

              <button 
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-error-container/15 rounded-xl transition-all text-label-sm font-semibold text-error cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Logout
              </button>
            </div>
          )}

          {/* Profile Trigger Card */}
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center justify-between p-2 hover:bg-surface-container-low dark:hover:bg-surface-variant/20 rounded-2xl transition-all text-left cursor-pointer border border-transparent hover:border-outline-variant/10"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={profileMenuOpen}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-outline-variant/20 shrink-0 bg-primary-container text-primary flex items-center justify-center font-bold text-sm uppercase">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="User profile" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName ? user.displayName.substring(0, 2) : "US"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-label-md font-bold text-primary dark:text-primary-fixed truncate">
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
          className="hidden md:flex fixed top-4 left-4 z-40 p-2.5 bg-surface/90 dark:bg-surface-container/90 border border-outline-variant/20 rounded-xl hover:bg-surface-container-low text-outline hover:text-primary transition-all cursor-pointer shadow-md hover-lift backdrop-blur-xl"
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
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 z-50 flex justify-around items-center px-4 pb-safe border-t border-outline-variant/15 bg-surface/90 backdrop-blur-xl dark:bg-surface-container/90 shadow-lg" aria-label="Mobile navigation">
        <Link 
          to="/home" 
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary ${
            isActive("/home") ? "text-primary bg-secondary-container/20 rounded-xl px-4 py-1.5 font-bold" : ""
          }`}
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] mt-0.5">Home</span>
        </Link>
        <button 
          onClick={handleNewConsultation}
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary ${
            location.pathname.startsWith("/chat/") ? "text-primary bg-secondary-container/20 rounded-xl px-4 py-1.5 font-bold" : ""
          }`}
        >
          <span className="material-symbols-outlined">chat_bubble</span>
          <span className="text-[10px] mt-0.5">AI Chat</span>
        </button>
        <Link 
          to="/hospitals" 
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary ${
            isActive("/hospitals") || location.pathname.startsWith("/hospitals/") ? "text-primary bg-secondary-container/20 rounded-xl px-4 py-1.5 font-bold" : ""
          }`}
        >
          <span className="material-symbols-outlined">local_hospital</span>
          <span className="text-[10px] mt-0.5">Hospitals</span>
        </Link>
        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:text-secondary ${
            isActive("/profile") ? "text-primary bg-secondary-container/20 rounded-xl px-4 py-1.5 font-bold" : ""
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
