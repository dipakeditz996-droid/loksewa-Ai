"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Upload, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import { RetryImage } from "@/components/ui/retry-image";

export default function CheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [plan, setPlan] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  
  useEffect(() => {
    fetchData();
  }, [unwrappedParams.planId]);

  const fetchData = async () => {
    try {
      const [planRes, methodsRes] = await Promise.all([
        apiClient<any>(`/subscriptions/plans/${unwrappedParams.planId}/`),
        apiClient<any[]>(`/marketplace/student/payment-methods/`)
      ]);
      
      setPlan(planRes);
      
      const activeMethods = methodsRes.filter((m: any) => m.is_active);
      setMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedMethod(activeMethods[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !screenshot || !selectedMethod || !plan) return;
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('plan', plan.id);
    formData.append('payment_method', selectedMethod.id);
    formData.append('amount', plan.price);
    formData.append('transaction_id', transactionId);
    formData.append('screenshot', screenshot);
    if (note) formData.append('note', note);
    
    try {
      await apiClient("/subscriptions/payments/", {
        method: "POST",
        body: formData,
      });
      
      // Redirect to dashboard where they will see the PAYMENT_PENDING locked state
      router.push("/student");
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" /></div>;
  }

  if (!plan) {
    return <div className="text-center py-20">Plan not found</div>;
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <div className="bg-primary text-primary-foreground pt-12 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-6 -ml-4 text-primary-foreground/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Complete Your Purchase</h1>
          <p className="text-primary-foreground/80 text-lg">Select a payment method and submit your transaction details below.</p>
        </div>
      </div>
      
      <div className="p-4 lg:p-8 max-w-5xl mx-auto -mt-16">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-card p-6 md:p-8 rounded-[24px] border border-border shadow-sm">
              <h2 className="text-xl font-bold text-primary dark:text-foreground mb-6 flex items-center gap-2">
                <span className="bg-[#D4A72C] text-[#0A1118] w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span> 
                Select Payment Method
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {methods.map(method => (
                  <div 
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className={`border-2 rounded-[16px] p-5 cursor-pointer transition-all ${
                      selectedMethod?.id === method.id 
                        ? 'border-[#D4A72C] bg-[#D4A72C]/5 ring-4 ring-[#D4A72C]/10 shadow-sm transform scale-[1.02]' 
                        : 'border-border hover:border-primary/20 bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-primary dark:text-foreground">{method.display_name}</span>
                      {selectedMethod?.id === method.id && <CheckCircle2 className="w-5 h-5 text-[#D4A72C]" />}
                    </div>
                  </div>
                ))}
              </div>

            {selectedMethod && (
              <div className="bg-muted rounded-[16px] border border-border p-6 flex flex-col md:flex-row gap-8 items-start">
                {selectedMethod.qr_image ? (
                  <div className="w-full md:w-48 aspect-square bg-card border border-border rounded-[12px] p-2 flex items-center justify-center flex-shrink-0">
                    <RetryImage src={selectedMethod.qr_image} alt="QR Code" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full md:w-48 aspect-square bg-muted/80 border border-border rounded-[12px] flex items-center justify-center text-muted-foreground flex-shrink-0">
                    No QR Available
                  </div>
                )}
                
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="font-semibold text-primary dark:text-foreground text-lg">Payment Details</h3>
                    <p className="text-muted-foreground text-sm mt-1">{selectedMethod.instructions || "Scan the QR code to make the payment."}</p>
                  </div>
                  
                  <div className="bg-card border border-border rounded-[12px] p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-medium text-primary dark:text-foreground">{selectedMethod.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-bold text-primary dark:text-foreground">{selectedMethod.account_number}</span>
                    </div>
                    {selectedMethod.method_type === 'BANK' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank:</span>
                          <span className="font-medium text-primary dark:text-foreground">{selectedMethod.bank_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch:</span>
                          <span className="font-medium text-primary dark:text-foreground">{selectedMethod.branch}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>

            <form onSubmit={handleSubmit} className="bg-card p-6 md:p-8 rounded-[24px] border border-border shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#D4A72C]/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>
              <h2 className="text-xl font-bold text-primary dark:text-foreground mb-2 flex items-center gap-2 relative z-10">
                <span className="bg-[#D4A72C] text-[#0A1118] w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                Submit Payment Details
              </h2>
              
              <div className="space-y-5 relative z-10">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Transaction ID / Code *</label>
                <Input 
                  required
                  placeholder="e.g. 0A1B2C3D" 
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Payment Screenshot *</label>
                <div className="border-2 border-dashed border-border rounded-[16px] p-6 text-center hover:bg-muted transition-colors relative">
                  <input 
                    type="file" 
                    required 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                      <p className="text-sm text-[#D4A72C] font-medium">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="font-medium text-primary dark:text-foreground">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">JPG, PNG, WebP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Optional Note</label>
                <Textarea 
                  placeholder="Any additional details..." 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 p-4 rounded-[12px] flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>Your subscription will be activated automatically once our team verifies the payment. Verification usually takes less than 30 minutes during working hours.</p>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !transactionId || !screenshot}
              className="w-full bg-primary text-primary-foreground hover:bg-primary text-primary-foreground/90 text-white py-6 rounded-[12px] text-lg font-semibold"
            >
              {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</> : "Submit Payment for Verification"}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden sticky top-8">
              <div className="bg-gradient-to-br from-[#0B2545] to-[#163E6B] text-white p-8 text-center space-y-3 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-[#D4A72C]/20 rounded-full blur-xl pointer-events-none"></div>
                
                <span className="inline-block bg-[#D4A72C]/20 border border-[#D4A72C]/50 text-[#D4A72C] font-bold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full relative z-10">
                  {plan.badge !== 'NONE' ? plan.badge.replace('_', ' ') : 'PREMIUM PLAN'}
                </span>
                <h2 className="text-3xl font-bold tracking-tight relative z-10">{plan.name}</h2>
                <p className="text-slate-300 font-medium relative z-10">{plan.duration} {plan.duration_unit}</p>
              </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3 pb-6 border-b border-border/50">
                <div className="flex justify-between text-muted-foreground">
                  <span>Regular Price</span>
                  <span className={plan.original_price ? 'line-through' : ''}>Rs. {plan.original_price || plan.price}</span>
                </div>
                {plan.original_price && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>- Rs. {parseFloat(plan.original_price) - parseFloat(plan.price)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-primary dark:text-foreground pt-2">
                  <span>Total Due</span>
                  <span>Rs. {plan.price}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-primary dark:text-foreground">What's included:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Full platform access for {plan.duration} {plan.duration_unit.toLowerCase()}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Premium analytics & AI tools
                  </li>
                </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
