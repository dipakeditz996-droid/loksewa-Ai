"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Truck, 
  Settings, 
  Package, 
  RefreshCw, 
  Banknote,
  LayoutDashboard
} from "lucide-react";

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Courier Overview",
      href: "/admin-dashboard/courier/overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Nepal Can Move Settings",
      href: "/admin-dashboard/courier/settings",
      icon: Settings,
      exact: false,
    },
    {
      name: "Shipments",
      href: "/admin-dashboard/courier/shipments",
      icon: Package,
      exact: false,
    },
    {
      name: "Tracking & Synchronization",
      href: "/admin-dashboard/courier/tracking",
      icon: RefreshCw,
      exact: false,
    },
    {
      name: "COD Remittance",
      href: "/admin-dashboard/courier/cod-remittance",
      icon: Banknote,
      exact: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 pt-5 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[#D4A72C]">
                  <Truck className="w-5 h-5 text-[#D4A72C]" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2545] tracking-tight">
                    Delivery & Courier Hub
                  </h1>
                  <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                    Official Nepal Can Move (NCM) integration, live shipment dispatch, automated tracking, and Cash on Delivery (COD) remittance ledger.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
            {tabs.map((tab) => {
              const isActive = tab.exact 
                ? pathname === tab.href 
                : pathname.startsWith(tab.href);
                
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative whitespace-nowrap",
                    isActive 
                      ? "text-[#0B2545] font-semibold" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? "text-[#D4A72C]" : "text-slate-400")} />
                  {tab.name}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A72C]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}

