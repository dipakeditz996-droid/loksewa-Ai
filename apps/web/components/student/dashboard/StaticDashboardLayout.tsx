"use client";

import React, { memo } from "react";
import type {
  DashboardData,
  StudentReferralDashboardData,
  ReferralHistoryEntry,
  FullWidthId,
  GridId,
} from "./dashboard-types";
import {
  MotivationWidget,
  QuickActionsWidget,
  ContinueStudyWidget,
  ReferralCardWidget,
  ReferralsListWidget,
  YourProgressWidget,
  UpcomingExamsWidget,
} from "./DashboardWidgets";

export interface DashboardLayoutProps {
  fullOrder: FullWidthId[];
  gridOrder: GridId[];
  data: DashboardData | undefined;
  loading: boolean;
  motivation: { message: string } | null | undefined;
  referralData: StudentReferralDashboardData | null | undefined;
  referralHistory: ReferralHistoryEntry[];
  isReferralHistoryLoading: boolean;
  onFullOrderChange?: (newOrder: FullWidthId[]) => void;
  onGridOrderChange?: (newOrder: GridId[]) => void;
}

export const StaticDashboardLayout = memo(function StaticDashboardLayout({
  fullOrder,
  gridOrder,
  data,
  loading,
  motivation,
  referralData,
  referralHistory,
  isReferralHistoryLoading,
}: DashboardLayoutProps) {
  return (
    <>
      {/* Full-width sections in saved/default order */}
      <div className="space-y-8">
        {fullOrder.map((widgetId) => {
          if (widgetId === "motivation" && motivation) {
            return <MotivationWidget key={widgetId} motivation={motivation} />;
          }
          if (widgetId === "quick-actions") {
            return <QuickActionsWidget key={widgetId} />;
          }
          if (widgetId === "continue-study") {
            return (
              <ContinueStudyWidget
                key={widgetId}
                data={data}
                loading={loading}
              />
            );
          }
          if (widgetId === "referral-card" && referralData && referralData.settings?.is_enabled) {
            return <ReferralCardWidget key={widgetId} referralData={referralData} />;
          }
          return null;
        })}
      </div>

      {/* Grid sections in saved/default order */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {gridOrder.map((widgetId) => {
          if (widgetId === "referrals-list") {
            return (
              <ReferralsListWidget
                key={widgetId}
                referralHistory={referralHistory}
                isLoading={isReferralHistoryLoading}
              />
            );
          }
          if (widgetId === "your-progress") {
            return (
              <YourProgressWidget
                key={widgetId}
                data={data}
                loading={loading}
              />
            );
          }
          if (widgetId === "upcoming-exams") {
            return (
              <UpcomingExamsWidget
                key={widgetId}
                data={data}
                loading={loading}
              />
            );
          }
          return null;
        })}
      </div>
    </>
  );
});
