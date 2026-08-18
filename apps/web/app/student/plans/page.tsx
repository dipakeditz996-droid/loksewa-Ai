"use client";

import { useState, useEffect } from "react";
import { Check, Shield, Zap, BookOpen, MessageSquare, Trophy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface SubscriptionPlan {
  id: number;
  name: string;
  duration: number;
  duration_unit: string;
  price: string;
  original_price: string | null;
  status: string;
  badge: string;
  features: string[];
}

export default function StudentPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/subscriptions/plans/");
      if (res.ok) {
        const data = await res.json();
        // Filter out inactive plans
        setPlans(data.filter((p: SubscriptionPlan) => p.status === 'ACTIVE'));
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFeatureList = (plan: SubscriptionPlan) => {
    // If we have actual features from DB, we could map them.
    // For demo, we just use a default list based on plan name/price.
    return [
      { text: "Unlimited Mock Exams", included: true },
      { text: "AI Tutor Access", included: parseFloat(plan.price) > 0 },
      { text: "Premium Study Materials", included: parseFloat(plan.price) > 0 },
      { text: "Advanced Performance Analytics", included: parseFloat(plan.price) > 499 },
      { text: "Priority Support", included: parseFloat(plan.price) >= 999 },
    ];
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
        <Badge variant="outline" className="bg-[#D4A72C]/10 text-[#D4A72C] border-[#D4A72C]/30 px-3 py-1">
          <Zap className="w-3.5 h-3.5 mr-1" /> Unlock Your Potential
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-[800] text-[#0B2545] tracking-tight">
          Choose Your Preparation Path
        </h1>
        <p className="text-lg text-slate-500">
          Get access to premium features, AI tutoring, and comprehensive study materials designed to help you ace your Loksewa exams.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[500px] rounded-[24px] bg-slate-100 animate-pulse"></div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#0B2545]">No Plans Available</h3>
          <p className="text-slate-500 mt-2">Subscription plans are currently being updated. Please check back later.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isHighlighted = plan.badge === 'POPULAR' || plan.badge === 'RECOMMENDED';
            
            return (
              <div 
                key={plan.id}
                className={`relative rounded-[24px] transition-all duration-300 ${
                  isHighlighted 
                    ? "bg-[#0B2545] text-white shadow-2xl scale-105 border-2 border-[#D4A72C]" 
                    : "bg-white text-[#0B2545] border border-slate-200 shadow-lg hover:shadow-xl"
                }`}
              >
                {plan.badge !== 'NONE' && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isHighlighted ? "bg-[#D4A72C] text-[#0A1118]" : "bg-[#0B2545] text-white"
                    }`}>
                      {plan.badge.replace('_', ' ')}
                    </span>
                  </div>
                )}
                
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className={`text-2xl font-bold ${isHighlighted ? 'text-white' : 'text-[#0B2545]'}`}>
                      {plan.name}
                    </h3>
                    <p className={isHighlighted ? 'text-slate-300' : 'text-slate-500'}>
                      {plan.duration} {plan.duration_unit} Access
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold">Rs. {plan.price}</span>
                    </div>
                    {plan.original_price && (
                      <p className={`text-sm mt-1 line-through ${isHighlighted ? 'text-slate-400' : 'text-slate-400'}`}>
                        Rs. {plan.original_price}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-opacity-20 border-current">
                    {getFeatureList(plan).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <div className={`mt-0.5 rounded-full p-0.5 ${isHighlighted ? 'bg-[#D4A72C]/20 text-[#D4A72C]' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="mt-0.5 p-0.5 text-slate-300">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                        <span className={`text-sm ${
                          feature.included 
                            ? isHighlighted ? 'text-slate-200' : 'text-slate-700' 
                            : isHighlighted ? 'text-slate-400 line-through' : 'text-slate-400 line-through'
                        }`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={() => router.push(`/student/plans/${plan.id}/checkout`)}
                    className={`w-full py-6 text-base font-bold rounded-xl transition-all ${
                      isHighlighted 
                        ? "bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118]" 
                        : "bg-[#0B2545] hover:bg-[#0B2545]/90 text-white"
                    }`}
                  >
                    {parseFloat(plan.price) === 0 ? "Start Free" : "Choose Plan"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
