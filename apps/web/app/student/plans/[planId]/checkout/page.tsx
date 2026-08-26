"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Upload, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";

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
        apiClient<any[]>(`/marketplace/payment-methods/`)
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
      
      router.push("/student/purchases?success=true");
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" /></div>;
  }

  if (!plan) {
    return <div className="text-center py-20">Plan not found</div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6 -ml-4 text-slate-500 hover:text-[#0B2545]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
      </Button>
      
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-[#0B2545] mb-4">Select Payment Method</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {methods.map(method => (
                <div 
                  key={method.id}
                  onClick={() => setSelectedMethod(method)}
                  className={`border-2 rounded-[16px] p-4 cursor-pointer transition-all ${
                    selectedMethod?.id === method.id 
                      ? 'border-[#D4A72C] bg-[#D4A72C]/5 ring-4 ring-[#D4A72C]/10' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#0B2545]">{method.display_name}</span>
                    {selectedMethod?.id === method.id && <CheckCircle2 className="w-5 h-5 text-[#D4A72C]" />}
                  </div>
                </div>
              ))}
            </div>

            {selectedMethod && (
              <div className="bg-slate-50 rounded-[16px] border border-slate-200 p-6 flex flex-col md:flex-row gap-8 items-start">
                {selectedMethod.qr_image ? (
                  <div className="w-full md:w-48 aspect-square bg-white border border-slate-200 rounded-[12px] p-2 flex items-center justify-center flex-shrink-0">
                    <img src={selectedMethod.qr_image} alt="QR Code" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full md:w-48 aspect-square bg-slate-100 border border-slate-200 rounded-[12px] flex items-center justify-center text-slate-400 flex-shrink-0">
                    No QR Available
                  </div>
                )}
                
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="font-semibold text-[#0B2545] text-lg">Payment Details</h3>
                    <p className="text-slate-500 text-sm mt-1">{selectedMethod.instructions || "Scan the QR code to make the payment."}</p>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-[12px] p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Name:</span>
                      <span className="font-medium text-[#0B2545]">{selectedMethod.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Account Number:</span>
                      <span className="font-mono font-bold text-[#0B2545]">{selectedMethod.account_number}</span>
                    </div>
                    {selectedMethod.method_type === 'BANK' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bank:</span>
                          <span className="font-medium text-[#0B2545]">{selectedMethod.bank_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Branch:</span>
                          <span className="font-medium text-[#0B2545]">{selectedMethod.branch}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-[#0B2545]">Submit Payment Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID / Code *</label>
                <Input 
                  required
                  placeholder="e.g. 0A1B2C3D" 
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Screenshot *</label>
                <div className="border-2 border-dashed border-slate-200 rounded-[16px] p-6 text-center hover:bg-slate-50 transition-colors relative">
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
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-medium text-[#0B2545]">Click to upload or drag and drop</p>
                      <p className="text-sm text-slate-500">JPG, PNG, WebP up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Optional Note</label>
                <Textarea 
                  placeholder="Any additional details..." 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-[12px] flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>Your subscription will be activated automatically once our team verifies the payment. Verification usually takes less than 30 minutes during working hours.</p>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !transactionId || !screenshot}
              className="w-full bg-[#0B2545] hover:bg-[#0B2545]/90 text-white py-6 rounded-[12px] text-lg font-semibold"
            >
              {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</> : "Submit Payment for Verification"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden sticky top-8">
            <div className="bg-[#0B2545] p-6 text-white text-center space-y-2">
              <span className="text-[#D4A72C] font-bold text-sm tracking-wider uppercase">{plan.badge !== 'NONE' ? plan.badge.replace('_', ' ') : 'PREMIUM PLAN'}</span>
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <p className="text-slate-300">{plan.duration} {plan.duration_unit}</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3 pb-6 border-b border-slate-100">
                <div className="flex justify-between text-slate-500">
                  <span>Regular Price</span>
                  <span className={plan.original_price ? 'line-through' : ''}>Rs. {plan.original_price || plan.price}</span>
                </div>
                {plan.original_price && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>- Rs. {parseFloat(plan.original_price) - parseFloat(plan.price)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-[#0B2545] pt-2">
                  <span>Total Due</span>
                  <span>Rs. {plan.price}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-[#0B2545]">What's included:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    Full platform access for {plan.duration} {plan.duration_unit.toLowerCase()}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
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
  );
}
