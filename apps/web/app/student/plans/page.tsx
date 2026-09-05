"use client";

import { useState, useEffect } from "react";
import { Check, Shield, Zap, BookOpen, MessageSquare, Trophy, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

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
      const data = await apiClient<SubscriptionPlan[]>("/subscriptions/plans/");
      // Filter out inactive plans
      setPlans(data.filter((p: SubscriptionPlan) => p.status === 'ACTIVE'));
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Known feature-key vocabulary shared with apps/web/lib/access.ts and the
  // backend (subscriptions.access.has_feature) - a plan can also include
  // custom strings an admin typed in, which fall back to a title-cased label.
  const FEATURE_LABELS: Record<string, string> = {
    "*": "Full Platform Access",
    ai_tutor: "AI Tutor Access",
    premium_materials: "Premium Study Materials",
    advanced_mock_exam: "Advanced Mock Exams",
    analytics: "Advanced Performance Analytics",
  };

  const getFeatureList = (plan: SubscriptionPlan) => {
    const features = Array.isArray(plan.features) ? plan.features : [];
    if (features.length === 0) {
      return [{ text: "Full platform access", included: true }];
    }
    return features.map((key) => ({
      text: FEATURE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      included: true,
    }));
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-8">
        <Badge variant="outline" className="bg-[#D4A72C]/10 text-[#D4A72C] border-[#D4A72C]/30 px-3 py-1">
          <Zap className="w-3.5 h-3.5 mr-1" /> Unlock Your Potential
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-[800] text-primary dark:text-foreground tracking-tight">
          Choose Your Preparation Path
        </h1>
        <p className="text-lg text-muted-foreground">
          Get access to premium features, AI tutoring, and comprehensive study materials designed to help you ace your Loksewa exams.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[500px] rounded-[24px] bg-muted/80 animate-pulse"></div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary dark:text-foreground">No Plans Available</h3>
          <p className="text-muted-foreground mt-2">Subscription plans are currently being updated. Please check back later.</p>
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
                    ? "bg-primary text-primary-foreground text-white shadow-2xl scale-105 border-2 border-[#D4A72C]" 
                    : "bg-card text-primary dark:text-foreground border border-border shadow-lg hover:shadow-xl"
                }`}
              >
                {plan.badge !== 'NONE' && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isHighlighted ? "bg-[#D4A72C] text-[#0A1118]" : "bg-primary text-primary-foreground text-white"
                    }`}>
                      {plan.badge.replace('_', ' ')}
                    </span>
                  </div>
                )}
                
                <div className="p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className={`text-2xl font-bold ${isHighlighted ? 'text-white' : 'text-primary dark:text-foreground'}`}>
                      {plan.name}
                    </h3>
                    <p className={isHighlighted ? 'text-slate-300' : 'text-muted-foreground'}>
                      {plan.duration} {plan.duration_unit} Access
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-bold">Rs. {plan.price}</span>
                    </div>
                    {plan.original_price && (
                      <p className={`text-sm mt-1 line-through ${isHighlighted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
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
                            ? isHighlighted ? 'text-slate-200' : 'text-foreground' 
                            : isHighlighted ? 'text-muted-foreground line-through' : 'text-muted-foreground line-through'
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
                        : "bg-primary text-primary-foreground hover:bg-primary text-primary-foreground/90 text-white"
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
