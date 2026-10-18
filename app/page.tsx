"use client";

import React from "react";
import { useSplitest } from "@/lib/store";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ExpenseFeed } from "@/components/ExpenseFeed";
import { InspectorPane } from "@/components/InspectorPane";
import { AllExpensesView } from "@/components/AllExpensesView";
import { GroupsView } from "@/components/GroupsView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { SettingsView } from "@/components/SettingsView";
import { ProfileView } from "@/components/ProfileView";
import { GroupChatView } from "@/components/GroupChatView";
import { TransactionReceiptModal } from "@/components/TransactionReceiptModal";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { SettleModal } from "@/components/SettleModal";
import { ShareGroupModal } from "@/components/ShareGroupModal";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { MobileNavigation } from "@/components/MobileNavigation";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Toast } from "@/components/Toast";

export default function HomePage() {
  const { currentView, isShareModalOpen, setIsShareModalOpen } = useSplitest();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col antialiased selection:bg-[#D1FAE5] selection:text-[#065F46] transition-colors duration-150">
      <OfflineBanner />
      <Header />

      <div className="flex-1 flex w-full pt-16 pb-20 md:pb-0">
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        <main className="flex-1 min-w-0 md:pl-20 lg:pl-[260px]">
          {currentView === "wallet" && <ExpenseFeed />}
          {currentView === "expenses" && <AllExpensesView />}
          {currentView === "groups" && <GroupsView />}
          {currentView === "chat" && <GroupChatView />}
          {currentView === "analytics" && <AnalyticsView />}
          {currentView === "profile" && <ProfileView />}
          {currentView === "settings" && <SettingsView />}
        </main>

        {currentView === "wallet" && <InspectorPane />}
      </div>

      <TransactionReceiptModal />
      <AddExpenseModal />
      <SettleModal />
      <ShareGroupModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
      <CreateGroupModal />
      <MobileNavigation />
      <Toast />
    </div>
  );
}
