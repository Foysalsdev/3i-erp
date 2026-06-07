import React, { useState } from "react";
import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SAPShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  title?: string;
}

export const SAPShell: React.FC<SAPShellProps> = ({
  children,
  sidebar,
  title = "3i Logistics ERP",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [userOpen, setUserOpen]       = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans">
      {/* ── Shell bar ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-3 z-50 shrink-0"
        style={{
          background: "#1B2A3B",
          height: "48px",
          boxShadow: "0 1px 4px 0 rgb(0 0 0 / .20)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-white font-semibold text-sm tracking-wide select-none">
            {title}
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center bg-white/10 hover:bg-white/15 rounded px-3 gap-2 h-8 w-64 transition-colors">
          <Search size={14} className="text-white/50" />
          <input
            placeholder="Search..."
            className="bg-transparent text-white text-xs placeholder-white/40 outline-none w-full"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors relative"
            >
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-400 rounded-full" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-white rounded-lg shadow-xl border border-[#E2E8F0] z-50 animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                  <span className="text-sm font-semibold text-[#1E293B]">Notifications</span>
                  <button onClick={() => setNotifOpen(false)}><X size={14} className="text-[#94A3B8]" /></button>
                </div>
                <div className="px-4 py-8 text-center text-xs text-[#94A3B8]">
                  No new notifications
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold">
                A
              </div>
              <span className="text-white/90 text-xs hidden md:block">Admin</span>
              <ChevronDown size={12} className="text-white/60" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-10 w-44 bg-white rounded-lg shadow-xl border border-[#E2E8F0] z-50 animate-fade-in">
                {["Profile", "Settings", "Sign out"].map((item) => (
                  <button
                    key={item}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-[#F1F5F9] transition-colors",
                      item === "Sign out" ? "text-red-500 border-t border-[#E2E8F0]" : "text-[#374151]"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "shrink-0 overflow-y-auto transition-all duration-200 ease-in-out",
            sidebarOpen ? "w-60" : "w-0"
          )}
          style={{ background: "#F8FAFC", borderRight: "1px solid #E2E8F0" }}
        >
          {sidebarOpen && sidebar}
        </aside>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "#F1F5F9" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default SAPShell;
