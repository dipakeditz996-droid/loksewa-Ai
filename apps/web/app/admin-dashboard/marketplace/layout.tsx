"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Store, ShoppingCart, CreditCard, LayoutDashboard, Settings, Package
} from "lucide-react";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Overview",
      href: "/admin-dashboard/marketplace",
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: "Products",
      href: "/admin-dashboard/marketplace/products",
      icon: Package,
      exact: false
    },
    {
      name: "Orders",
      href: "/admin-dashboard/marketplace/orders",
      icon: ShoppingCart,
      exact: false
    },
    {
      name: "Payments & Verification",
      href: "/admin-dashboard/marketplace/payments",
      icon: CreditCard,
      exact: false
    },
    {
      name: "Payment Methods",
      href: "/admin-dashboard/marketplace/payment-methods",
      icon: Settings,
      exact: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header / Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-[#0B2545] flex items-center gap-2">
                <Store className="w-6 h-6 text-[#D4A72C]" />
                Marketplace & Payments
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage digital products, purchases, and verify manual payments.
              </p>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
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
                      ? "text-[#0B2545]" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? "text-[#D4A72C]" : "text-slate-400")} />
                  {tab.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4A72C] rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
