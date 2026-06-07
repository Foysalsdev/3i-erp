import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

interface SAPSidebarProps {
  items: NavItem[];
  appName?: string;
}

const SidebarItem: React.FC<{ item: NavItem; depth?: number }> = ({
  item,
  depth = 0,
}) => {
  const location = useLocation();
  const [open, setOpen] = React.useState(() =>
    item.children?.some(
      (c) => c.path && location.pathname.startsWith(c.path)
    ) ?? false
  );

  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
            "text-[#475569] hover:bg-[#E2E8F0] hover:text-[#1E293B]",
            depth === 0 ? "font-medium" : "font-normal pl-8"
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon && (
              <span className="text-[#94A3B8] w-4 h-4 shrink-0">{item.icon}</span>
            )}
            <span>{item.label}</span>
          </div>
          {open ? (
            <ChevronDown size={14} className="text-[#94A3B8]" />
          ) : (
            <ChevronRight size={14} className="text-[#94A3B8]" />
          )}
        </button>
        {open && (
          <div className="mt-0.5">
            {item.children!.map((child) => (
              <SidebarItem key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path ?? "#"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          depth > 0 ? "pl-8" : "",
          isActive
            ? "bg-[#EFF6FF] text-[#1D4ED8] font-medium"
            : "text-[#475569] hover:bg-[#E2E8F0] hover:text-[#1E293B]"
        )
      }
    >
      {item.icon && (
        <span className="w-4 h-4 shrink-0">{item.icon}</span>
      )}
      <span>{item.label}</span>
    </NavLink>
  );
};

export const SAPSidebar: React.FC<SAPSidebarProps> = ({ items, appName }) => {
  return (
    <nav className="flex flex-col h-full w-60">
      {/* App name row */}
      {appName && (
        <div
          className="px-4 py-3 text-xs font-semibold uppercase tracking-widest border-b"
          style={{ color: "#94A3B8", borderColor: "#E2E8F0" }}
        >
          {appName}
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {items.map((item) => (
          <SidebarItem key={item.label} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 text-xs border-t"
        style={{ color: "#CBD5E1", borderColor: "#E2E8F0" }}
      >
        3i Logistics ERP • v2.0
      </div>
    </nav>
  );
};

export default SAPSidebar;
