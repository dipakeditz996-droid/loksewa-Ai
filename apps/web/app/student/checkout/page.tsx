"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, UploadCloud, Info, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { subscriptionsApi, SubscriptionPlan } from "@/lib/api/subscriptions";
import { marketplaceApi, PaymentMethod } from "@/lib/api/marketplace";
import Link from "next/link";
import bgImage from "../../../../media/signup.png";

export default function CheckoutPage() {
  const router = useRouter();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPlanId = localStorage.getItem("onboarding_selected_plan_id");
        const storedCourses = localStorage.getItem("onboarding_selected_courses");
        
        if (!storedPlanId || !storedCourses) {
          router.replace("/student/onboarding/preparation");
          return;
        }
        
        const courses = JSON.parse(storedCourses);
        setSelectedCourses(courses);
        
        const [planData, methodsData] = await Promise.all([
          subscriptionsApi.getPlan(storedPlanId),
          marketplaceApi.getPaymentMethods()
        ]);
        
        setPlan(planData);
        setPaymentMethods(methodsData);
        
        // Select first payment method by default if eSewa is available or just first
        if (methodsData.length > 0 && methodsData[0]) {
          setSelectedMethodId(methodsData[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load checkout data.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError("Screenshot must be less than 5MB");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !selectedMethodId || !transactionId || !screenshot) {
      setError("Please fill all required fields and upload a screenshot.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("plan", plan.id.toString());
      formData.append("payment_method", selectedMethodId.toString());
      formData.append("amount", plan.price);
      formData.append("transaction_id", transactionId);
      formData.append("screenshot", screenshot);
      if (note) formData.append("note", note);
      
      // Append selected course IDs
      selectedCourses.forEach(course => {
        formData.append("course_ids", course.id.toString());
      });
      
      await subscriptionsApi.submitPayment(formData);
      setSuccess(true);
      
      // Clear localStorage
      localStorage.removeItem("onboarding_selected_plan_id");
      localStorage.removeItem("onboarding_selected_courses");
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Payment submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);

  if (success) {
    return (
      <div className="min-h-screen relative flex font-sans overflow-hidden bg-[#0A1118] text-white">
        <div className="absolute inset-0 z-0 bg-cover bg-[25%_top] lg:bg-[center_top] bg-no-repeat" style={{ backgroundImage: `url(${bgImage.src})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black/95 mix-blend-multiply" />
        
        <div className="container relative z-10 w-full mx-auto px-6 flex flex-col min-h-screen items-center justify-center">
          <div className="w-full max-w-md bg-black/40 backdrop-blur-[24px] border border-[#22c55e]/30 rounded-[24px] p-10 text-center shadow-[0_20px_60px_rgba(34,197,94,0.15)]">
            <div className="w-20 h-20 bg-[#22c55e]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#22c55e]" />
            </div>
            <h2 className="text-[28px] font-bold text-white mb-3">Payment Submitted!</h2>
            <p className="text-[14px] text-white/70 mb-8">
              Your payment proof has been successfully uploaded. Our team will verify it and activate your package shortly.
            </p>
            <Link href="/student">
              <Button className="w-full h-[48px] bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="w-full flex justify-center flex-1 py-4 pb-12">
          <div className="w-full max-w-5xl bg-black/40 backdrop-blur-[24px] border border-white/10 rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col">
            
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-[26px] font-bold text-white tracking-tight leading-tight">Review & <span className="text-[#D4A72C]">Checkout</span></h2>
                <p className="text-[14px] text-white/60 font-medium mt-1">Complete your payment to unlock access.</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-white/50 uppercase tracking-wider">Step 3 of 3</span>
                <div className="flex gap-1 mt-2">
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                  <div className="h-1.5 w-8 bg-[#D4A72C] rounded-full"></div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#D4A72C] animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-1">
                {/* Order Summary (Left) */}
                <div className="w-full md:w-1/3 bg-white/5 p-8 border-r border-white/5">
                  <h3 className="text-[14px] font-bold text-white/50 uppercase tracking-wider mb-6">Order Summary</h3>
                  
                  {plan && (
                    <div className="mb-6 bg-white/5 rounded-xl p-5 border border-white/10">
                      <div className="font-bold text-[18px] text-white mb-1">{plan.name}</div>
                      <div className="text-[13px] text-white/50 mb-4">{plan.duration} {plan.duration_unit} Access</div>
                      <div className="flex justify-between items-end border-t border-white/10 pt-4">
                        <span className="text-[14px] text-white/60">Total</span>
                        <span className="text-[24px] font-extrabold text-[#D4A72C]">Rs. {plan.price}</span>
                      </div>
                    </div>
                  )}

                  <h3 className="text-[12px] font-bold text-white/50 uppercase tracking-wider mb-3 mt-8">Selected Preparations</h3>
                  <div className="space-y-2">
                    {selectedCourses.map(course => (
                      <div key={course.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-10 h-10 object-cover rounded bg-white/10" />
                        ) : (
                          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                        <div className="font-medium text-[13px] text-white/90 line-clamp-2">{course.title}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Form (Right) */}
                <div className="w-full md:w-2/3 p-8 flex flex-col">
                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-[13px] text-red-200">{error}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
                    <div>
                      <h3 className="text-[15px] font-semibold text-white mb-3">1. Select Payment Method</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {paymentMethods.map(method => (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedMethodId === method.id ? 'border-[#D4A72C] bg-[#D4A72C]/10 text-[#D4A72C]' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}
                          >
                            <span className="font-semibold text-[14px]">{method.display_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedMethod && (
                      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                        <div className="flex items-start gap-6">
                          {selectedMethod.qr_image && (
                            <img src={selectedMethod.qr_image} alt="QR Code" className="w-32 h-32 rounded-lg bg-white object-contain p-2" />
                          )}
                          <div className="flex-1 space-y-2">
                            <div className="text-[13px] text-white/50 uppercase font-semibold">Payment Details</div>
                            {selectedMethod.account_name && <div className="text-[15px] text-white"><span className="text-white/40">Name:</span> {selectedMethod.account_name}</div>}
                            {selectedMethod.account_number && <div className="text-[15px] font-mono text-white"><span className="text-white/40">Number:</span> {selectedMethod.account_number}</div>}
                            {selectedMethod.bank_name && <div className="text-[15px] text-white"><span className="text-white/40">Bank:</span> {selectedMethod.bank_name}</div>}
                            {selectedMethod.instructions && (
                              <div className="mt-3 text-[13px] text-[#D4A72C] bg-[#D4A72C]/10 p-3 rounded-lg border border-[#D4A72C]/20">
                                {selectedMethod.instructions}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-[15px] font-semibold text-white mb-3">2. Transaction Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[12px] text-white/60 mb-1.5 uppercase font-semibold">Transaction ID / Voucher No. *</label>
                          <Input 
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter the reference number"
                            className="bg-black/20 border-white/10 text-white focus:border-[#D4A72C]"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[12px] text-white/60 mb-1.5 uppercase font-semibold">Payment Screenshot *</label>
                          <div 
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${screenshot ? 'border-[#22c55e]/50 bg-[#22c55e]/5' : 'border-white/20 hover:border-[#D4A72C]/50 hover:bg-white/5'}`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              accept="image/*" 
                              className="hidden" 
                            />
                            {screenshotPreview ? (
                              <div className="flex flex-col items-center">
                                <img src={screenshotPreview} alt="Preview" className="h-24 object-contain rounded mb-3" />
                                <span className="text-[13px] text-[#22c55e] font-medium flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" /> Screenshot selected ({screenshot?.name})
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                                <span className="text-[14px] text-white/70 font-medium">Click to upload screenshot</span>
                                <span className="text-[12px] text-white/40 mt-1">JPEG, PNG, JPG up to 5MB</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] text-white/60 mb-1.5 uppercase font-semibold">Additional Note (Optional)</label>
                          <Textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Any remarks regarding this payment..."
                            className="bg-black/20 border-white/10 text-white focus:border-[#D4A72C] min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-auto border-t border-white/10 flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="h-[48px] px-10 bg-gradient-to-r from-[#B08922] to-[#D4A72C] hover:opacity-90 text-white text-[16px] font-bold rounded-xl shadow-[0_4px_20px_rgba(212,167,44,0.3)] transition-all flex items-center gap-2"
                      >
                        {submitting ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                        ) : (
                          <>Submit Payment</>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
