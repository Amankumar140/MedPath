import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../context/ConversationContext";
import { SkeletonStatCard, SkeletonCard } from "../components/SkeletonLoader";
import { Card, Button, Input, EmptyState } from "../components/ui";

export function DashboardPage({ tab }) {
  const { user } = useAuth();
  const { conversations, loadingConversations, deleteConversation, startNewConsultation } = useConversations();
  const [quickSymptom, setQuickSymptom] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const handleLaunchConsultation = async (e) => {
    e.preventDefault();
    if (!quickSymptom.trim()) return;

    startNewConsultation();
    navigate("/chat/new", { state: { initialMessage: quickSymptom } });
    setQuickSymptom("");
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversation(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter conversations
  const activeChats = conversations.filter(c => c.status === "ACTIVE" || c.status === "COMPLETED");

  // Compute real stats from data
  const totalConsults = conversations.length;
  const completedConsults = conversations.filter(c => c.status === "COMPLETED").length;

  const isHistoryTab = tab === "history";

  return (
    <div className="flex-grow p-4 md:p-6 bg-surface-bright dark:bg-background overflow-y-auto max-w-container-max mx-auto w-full animate-slide-up" role="main" aria-label={isHistoryTab ? "Consultation History" : "Dashboard"}>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
        <div>
          <h2 className="text-headline-lg font-headline-lg font-bold premium-text-gradient">
            {isHistoryTab ? "Consultation History" : `Welcome back, ${user?.displayName || "User"}!`}
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1.5 font-medium">
            {isHistoryTab
              ? "Review your past medical triage logs and AI recommendations."
              : "Describe your symptoms and find optimal healthcare paths."
            }
          </p>
        </div>
        {!isHistoryTab && (
          <Button
            onClick={() => {
              startNewConsultation();
              navigate("/chat/new");
            }}
            variant="primary"
            icon="add"
            ariaLabel="Start new consultation"
            className="self-start md:self-auto"
          >
            New Consultation
          </Button>
        )}
      </div>

      {isHistoryTab ? (
        // History Tab View
        <div className="space-y-5">
          {loadingConversations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : activeChats.length === 0 ? (
            <EmptyState
              icon="history"
              title="No History Yet"
              description="You haven't run any medical navigator consultations yet. Start one to build your health log!"
              action={{
                label: "Start First Consultation",
                icon: "add",
                onClick: () => {
                  startNewConsultation();
                  navigate("/chat/new");
                }
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeChats.map(chat => (
                <Card
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  hoverLift
                  variant="glass"
                  className="p-6 relative group flex flex-col justify-between min-h-[160px]"
                  aria-label={`Open consultation: ${chat.title || "Consultation Session"}`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="w-10 h-10 bg-secondary-container/20 text-secondary rounded-xl flex items-center justify-center shrink-0" aria-hidden="true">
                        <span className="material-symbols-outlined">chat_bubble</span>
                      </div>

                      <button
                        disabled={deletingId === chat.id}
                        onClick={(e) => handleDelete(e, chat.id)}
                        className="text-outline-variant dark:text-outline hover:text-error transition-all p-1.5 rounded-lg hover:bg-error-container/20 opacity-100 md:opacity-0 group-hover:opacity-100 cursor-pointer"
                        aria-label={`Delete consultation: ${chat.title}`}
                      >
                        {deletingId === chat.id ? (
                          <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        )}
                      </button>
                    </div>

                    <h4 className="text-body-lg font-bold text-primary dark:text-primary-fixed mb-1 line-clamp-2 group-hover:text-secondary transition-colors">
                      {chat.title || "Consultation Session"}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-label-sm text-outline mt-4 pt-3 border-t border-outline-variant/10">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_month</span>
                    <span>{new Date(chat.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Standard Home Dashboard View
        <div className="space-y-8">
          {/* Quick diagnostic launch card */}
          <Card 
            variant="glass" 
            className="p-6 md:p-8 shadow-[0_12px_40px_rgba(0,30,64,0.03)] border-2 border-primary/5 animate-pulse-glow"
          >
            <h3 className="text-headline-md font-bold text-primary dark:text-primary-fixed mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">troubleshoot</span>
              AI Clinical Triage Scanner
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-5">
              Enter your clinical symptoms below. Our HIPAA-secure AI triage assistant will analyze matching care pathways.
            </p>
            <form onSubmit={handleLaunchConsultation} className="relative flex items-center gap-3 max-w-3xl" aria-label="Quick symptom search">
              <div className="flex-grow">
                <Input
                  icon="search"
                  placeholder="Describe your symptoms (e.g. lingering dry cough and chest discomfort)"
                  type="text"
                  value={quickSymptom}
                  onChange={(e) => setQuickSymptom(e.target.value)}
                  aria-label="Describe your symptoms"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                ariaLabel="Start triage scan"
                className="w-14 h-14 !rounded-xl !p-0 shrink-0"
                icon="arrow_forward"
              />
            </form>
            <div className="flex flex-wrap gap-2.5 mt-5 items-center">
              <span className="text-label-sm text-outline font-semibold">Common searches:</span>
              <button
                onClick={() => setQuickSymptom("lingering dry cough since yesterday")}
                className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high hover:text-primary rounded-full text-label-sm text-on-surface-variant border border-outline-variant/10 transition-all cursor-pointer font-medium"
              >
                Lingering dry cough
              </button>
              <button
                onClick={() => setQuickSymptom("sharp lower abdominal pain")}
                className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high hover:text-primary rounded-full text-label-sm text-on-surface-variant border border-outline-variant/10 transition-all cursor-pointer font-medium"
              >
                Lower abdominal pain
              </button>
            </div>
          </Card>

          {/* Quick Statistics Grid */}
          {loadingConversations ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <Card variant="glass" hoverLift className="p-5 flex items-center gap-4 border border-outline-variant/15">
                <div className="w-12 h-12 bg-primary-fixed-dim/20 text-primary dark:text-primary-fixed rounded-xl flex items-center justify-center shadow-sm" aria-hidden="true">
                  <span className="material-symbols-outlined text-[24px]">chat</span>
                </div>
                <div>
                  <p className="text-outline text-label-sm font-semibold uppercase tracking-wider">Total Consults</p>
                  <h4 className="text-headline-md font-bold text-primary dark:text-primary-fixed mt-0.5">{totalConsults}</h4>
                </div>
              </Card>

              <Card variant="glass" hoverLift className="p-5 flex items-center gap-4 border border-outline-variant/15">
                <div className="w-12 h-12 bg-success/10 text-success rounded-xl flex items-center justify-center shadow-sm" aria-hidden="true">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <p className="text-outline text-label-sm font-semibold uppercase tracking-wider">Completed</p>
                  <h4 className="text-headline-md font-bold text-primary dark:text-primary-fixed mt-0.5">{completedConsults}</h4>
                </div>
              </Card>

              <Card variant="glass" hoverLift className="p-5 flex items-center gap-4 border border-outline-variant/15">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shadow-sm" aria-hidden="true">
                  <span className="material-symbols-outlined text-[24px]">pending</span>
                </div>
                <div>
                  <p className="text-outline text-label-sm font-semibold uppercase tracking-wider">Active</p>
                  <h4 className="text-headline-md font-bold text-primary dark:text-primary-fixed mt-0.5">{totalConsults - completedConsults}</h4>
                </div>
              </Card>

              <Card variant="glass" hoverLift className="p-5 flex items-center gap-4 border border-outline-variant/15">
                <div className="w-12 h-12 bg-secondary-container/20 text-secondary rounded-xl flex items-center justify-center shadow-sm" aria-hidden="true">
                  <span className="material-symbols-outlined text-[24px]">local_hospital</span>
                </div>
                <div>
                  <p className="text-outline text-label-sm font-semibold uppercase tracking-wider">Hospitals</p>
                  <h4 className="text-body-md font-bold text-primary dark:text-primary-fixed mt-0.5">AI Indexed</h4>
                </div>
              </Card>
            </div>
          )}

          {/* Recent Consultation Short Logs list */}
          <div className="space-y-4">
            <h3 className="text-headline-md font-headline-md font-bold text-primary dark:text-primary-fixed flex justify-between items-center">
              Recent Consultations
              <Link to="/history" className="text-label-md text-secondary hover:text-primary transition-colors font-semibold flex items-center gap-1">
                View All History
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </h3>

            {loadingConversations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : activeChats.length === 0 ? (
              <div className="premium-glass-card rounded-[24px] p-8 text-center text-on-surface-variant shadow-inner">
                No recent consultations found. Describe symptoms above to start!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeChats.slice(0, 4).map(chat => (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="premium-glass-card rounded-[22px] p-5 hover-lift flex justify-between items-center border border-outline-variant/10 group"
                  >
                    <div className="space-y-1">
                      <h4 className="text-body-lg font-bold text-primary dark:text-primary-fixed group-hover:text-secondary transition-colors line-clamp-1">
                        {chat.title || "Consultation"}
                      </h4>
                      <p className="text-label-sm text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]" aria-hidden="true">calendar_month</span>
                        Updated {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary group-hover:translate-x-1.5 transition-all text-[22px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;

