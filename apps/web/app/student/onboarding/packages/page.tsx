"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import Link from "next/link";
import bgImage from "@/media/signup.png";

export default function PackagesSelectionPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    // Load selected courses from previous step
    const stored = localStorage.getItem("onboarding_selected_courses");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedCourses(parsed);
      } catch (e) {
        console.error("Failed to parse selected courses");
      }
    } else {
      // If no courses selected, go back
      router.replace("/student/onboarding/preparation");
    }

    // Fetch plans
    subscriptionsApi.listPlans()
      .then(res => {
        setPlans(res);
        setLoading(false);
      })
      .catch(() => {
        setPlans([]);
        setLoading(false);
      });
  }, [router]);

  const numSelected = selectedCourses.length;

  // Filter logic:
  // Show plans that can accommodate the selected courses.
  const applicablePlans = plans.filter(plan => {
    if (!plan.is_flexible) {
      // Single selection mode
      // If the plan is specific to a course, it only applies if exactly that 1 course is selected
      if (numSelected === 1 && plan.course === selectedCourses[0].id) {
        return true;
      }
      // If plan has no specific course and is not flexible... maybe it's a legacy global plan?
      // For now, if it's not flexible and has no course, we don't show it here, or we show it for single selections.
      if (numSelected === 1 && !plan.course) {
          return true;
      }
      return false;
    } else {
      // Flexible mode
      return plan.allowed_preparation_count >= numSelected;
    }
  }).sort((a, b) => a.display_order - b.display_order);

  const handleContinue = () => {
    if (selectedPlanId) {
      localStorage.setItem("onboarding_selected_plan_id", selectedPlanId.toString());
      router.push("/student/checkout");
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/95 lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-black/80 mix-blend-multiply" />
      </div>

      <div className="container relative z-10 w-full mx-auto px-6 md:px-12 py-8 flex flex-col min-h-screen">
        <div className="flex justify-between items-center w-full mb-8">
          <button onClick={() => router.back()} className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-[15px]">Back</span>
          </button>
        </div>

        <div className="w-full flex justify-center flex-1 py-10">
          <div className="w-full max-w-5xl bg-black/40 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col">
            
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">Choose Your <span className="text-[#D4A72C]">Package</span></h2>
                <p className="text-[14px] text-white/60 font-medium mt-1">
                  You selected {numSelected} preparation{numSelected !== 1 ? 's' : ''}. Select an access plan that fits your needs.
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-white/50 uppercase tracking-wider">Step 2 of 3</span>
                <div className="flex gap-1 mt-2">
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                  <div className="h-1.5 w-8 bg-white/10 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="w-8 h-8 border-2 border-[#D4A72C] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : applicablePlans.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-[18px] font-medium text-white mb-2">No plans available</h3>
                  <p className="text-[14px] text-white/50">There are no subscription plans currently available for {numSelected} preparations.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {applicablePlans.map(plan => {
                    const isSelected = selectedPlanId === plan.id;
                    const isPopular = plan.badge === "POPULAR" || plan.badge === "RECOMMENDED";
                    
                    return (
                      <div 
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden flex flex-col border ${isSelected ? 'border-[#D4A72C] bg-[#D4A72C]/5 transform scale-[1.02] shadow-[0_10px_30px_rgba(212,167,44,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                      >
                        {isPopular && (
                          <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-[#B08922] to-[#D4A72C] text-center text-[10px] font-bold text-white uppercase tracking-wider py-1">
                            {plan.badge.replace('_', ' ')}
                          </div>
                        )}
                        
                        <div className={`p-6 flex-1 flex flex-col ${isPopular ? 'pt-8' : ''}`}>
                          <h3 className="text-[20px] font-bold text-white mb-2">{plan.name}</h3>
                          <div className="text-[13px] text-white/50 mb-6 flex-1">{plan.description}</div>
                          
                          <div className="mb-6">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[32px] font-extrabold text-white">Rs. {plan.price}</span>
                            </div>
                            {plan.original_price && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[14px] text-white/40 line-through">Rs. {plan.original_price}</span>
                                {plan.discount && <span className="text-[12px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">{plan.discount}</span>}
                              </div>
                            )}
                            <div className="text-[13px] text-white/50 mt-2 font-medium">Valid for {plan.duration} {plan.duration_unit}</div>
                            {plan.is_flexible && <div className="text-[13px] text-[#D4A72C] mt-1 font-medium">Up to {plan.allowed_preparation_count} preparation(s)</div>}
                          </div>

                          <div className="space-y-3 mb-6 flex-1">
                            {plan.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#D4A72C] shrink-0 mt-0.5" />
                                <span className="text-[13px] text-white/80">{feature}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className={`w-full py-3 rounded-xl text-center text-[14px] font-bold transition-colors ${isSelected ? 'bg-[#D4A72C] text-black' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                            {isSelected ? 'Selected' : 'Select Plan'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-black/20 flex items-center justify-between">
              <div className="text-[14px] text-white/60">
                {selectedPlanId ? '1 package selected' : 'Please select a package'}
              </div>
              <Button 
                onClick={handleContinue}
                disabled={!selectedPlanId}
                className="h-[44px] px-8 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[15px] font-bold rounded-xl transition-all flex items-center gap-2"
              >
                Review & Checkout <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
