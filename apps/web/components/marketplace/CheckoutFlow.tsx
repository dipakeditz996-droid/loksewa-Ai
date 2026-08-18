"use client";

import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, UploadCloud, 
  Image as ImageIcon, X, AlertCircle, ShoppingBag
} from "lucide-react";

type ProductType = "Physical" | "Digital";
interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  exam: string;
  type: ProductType;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stock: string;
  rating: number;
  reviews: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  imageColor: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutFlowProps {
  cartItems: CartItem[];
  onBack: () => void;
  onComplete: () => void;
}

export function CheckoutFlow({ cartItems, onBack, onComplete }: CheckoutFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Customer Info State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  
  // Step 2: Payment State
  const [txnCode, setTxnCode] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculations
  const hasPhysicalProducts = useMemo(() => {
    return cartItems.some(item => item.product.type === "Physical");
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cartItems]);

  const totalDiscount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.product.originalPrice) {
        return sum + ((item.product.originalPrice - item.product.price) * item.quantity);
      }
      return sum;
    }, 0);
  }, [cartItems]);

  const deliveryCharge = hasPhysicalProducts ? 100 : 0;
  const totalAmount = subtotal + deliveryCharge;

  // Handlers
  const handleContinueToPayment = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    
    if (hasPhysicalProducts) {
      if (!province.trim()) newErrors.province = "Province is required";
      if (!district.trim()) newErrors.district = "District is required";
      if (!city.trim()) newErrors.city = "City is required";
      if (!address.trim()) newErrors.address = "Full address is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = () => {
    const newErrors: Record<string, string> = {};
    if (!txnCode.trim()) newErrors.txnCode = "Transaction code is required";
    if (!screenshot) newErrors.screenshot = "Payment screenshot is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, screenshot: "File must be less than 5MB" });
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setErrors({ ...errors, screenshot: "Only JPG, JPEG, and PNG are allowed" });
        return;
      }
      setScreenshot(file);
      const newErrors = { ...errors };
      delete newErrors.screenshot;
      setErrors(newErrors);
    }
  };

  // Render Order Summary (used in Step 1 & 2)
  const renderOrderSummary = () => (
    <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] p-6 lg:p-8 sticky top-24">
      <h3 className="text-xl font-[800] text-slate-900 dark:text-white mb-6">Your Order</h3>
      
      <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
        {cartItems.map((item) => (
          <div key={item.product.id} className="flex gap-4 items-center">
            <div className={`w-16 h-16 rounded-[10px] shrink-0 bg-gradient-to-br ${item.product.imageColor}`}></div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-[700] text-slate-900 dark:text-white leading-tight truncate">
                {item.product.name}
              </h4>
              <p className="text-xs text-slate-500 font-[500] mb-1">Qty: {item.quantity} × Rs. {item.product.price}</p>
            </div>
            <div className="text-sm font-[800] text-slate-900 dark:text-white shrink-0">
              Rs. {item.product.price * item.quantity}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-3">
        <div className="flex justify-between items-center text-sm font-[600] text-slate-600 dark:text-slate-400">
          <span>Subtotal</span>
          <span>Rs. {subtotal}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between items-center text-sm font-[600] text-emerald-600 dark:text-emerald-400">
            <span>Discount</span>
            <span>-Rs. {totalDiscount}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm font-[600] text-slate-600 dark:text-slate-400">
          <span>Delivery Charge</span>
          <span>{deliveryCharge === 0 ? "Free" : `Rs. ${deliveryCharge}`}</span>
        </div>
        
        <div className="pt-4 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
          <span className="text-lg font-[800] text-slate-900 dark:text-white">Total Amount</span>
          <span className="text-2xl font-[900] text-slate-900 dark:text-white">Rs. {totalAmount}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#060B11] pt-32 pb-20 z-50 relative">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header / Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <button 
            onClick={onBack}
            className="flex items-center text-sm font-[600] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
          </button>

          <div className="flex items-center gap-2 md:gap-4 text-sm font-[700]">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#163E6B] dark:text-[#D4A72C]' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-[#163E6B] text-white dark:bg-[#D4A72C] dark:text-[#0A1118]' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>1</div>
              <span className="hidden sm:inline">Customer Details</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#163E6B] dark:text-[#D4A72C]' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-[#163E6B] text-white dark:bg-[#D4A72C] dark:text-[#0A1118]' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>2</div>
              <span className="hidden sm:inline">Payment</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#163E6B] dark:text-[#D4A72C]' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-[#163E6B] text-white dark:bg-[#D4A72C] dark:text-[#0A1118]' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>3</div>
              <span className="hidden sm:inline">Confirmation</span>
            </div>
          </div>
        </div>

        {/* STEP 1: CUSTOMER INFO */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12">
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-[900] text-slate-900 dark:text-white mb-2">Your Information</h2>
                <p className="text-slate-500 font-[500]">Please provide your details to process the order.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-[700] text-slate-900 dark:text-white">Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="Enter your full name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                    />
                    {errors.name && <p className="text-xs text-red-500 font-[600]">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-[700] text-slate-900 dark:text-white">Phone Number *</label>
                    <input 
                      type="tel" 
                      placeholder="98XXXXXXXX" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 font-[600]">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-[700] text-slate-900 dark:text-white">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]"
                  />
                </div>

                {hasPhysicalProducts && (
                  <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                    <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-4">Delivery Address *</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-sm font-[600] text-slate-700 dark:text-slate-300">Province</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Bagmati" 
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.province ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                        />
                        {errors.province && <p className="text-xs text-red-500 font-[600]">{errors.province}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-[600] text-slate-700 dark:text-slate-300">District</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Kathmandu" 
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.district ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                        />
                        {errors.district && <p className="text-xs text-red-500 font-[600]">{errors.district}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-[600] text-slate-700 dark:text-slate-300">City / Municipality</label>
                        <input 
                          type="text" 
                          placeholder="e.g. KMC" 
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.city ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                        />
                        {errors.city && <p className="text-xs text-red-500 font-[600]">{errors.city}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-[600] text-slate-700 dark:text-slate-300">Full Address</label>
                      <input 
                        type="text" 
                        placeholder="House number, street name, nearest landmark" 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.address ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500]`}
                      />
                      {errors.address && <p className="text-xs text-red-500 font-[600]">{errors.address}</p>}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <label className="text-sm font-[700] text-slate-900 dark:text-white">Additional Note (Optional)</label>
                  <textarea 
                    placeholder="Any special delivery instructions?" 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-24 p-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500] resize-none"
                  ></textarea>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full sm:w-auto h-14 px-10 rounded-[12px] bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-[800] text-[16px] dark:bg-white dark:hover:bg-slate-200 dark:text-[#0A1118]"
                    onClick={handleContinueToPayment}
                  >
                    Continue to Payment <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Order Summary Sidebar */}
            <div>
              {renderOrderSummary()}
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12">
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-[900] text-slate-900 dark:text-white mb-2">Complete Your Payment</h2>
                <p className="text-slate-500 font-[500]">Scan the QR code using your preferred payment app and complete the exact order amount.</p>
              </div>

              {/* Amount Highlight */}
              <div className="bg-[#163E6B]/5 dark:bg-[#D4A72C]/5 border border-[#163E6B]/20 dark:border-[#D4A72C]/20 rounded-[16px] p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-[700] text-slate-600 dark:text-slate-400 mb-1">Amount To Pay</p>
                  <p className="text-xs text-slate-500 font-[500]">Please pay exactly this amount.</p>
                </div>
                <div className="text-3xl font-[900] text-[#163E6B] dark:text-[#D4A72C]">
                  Rs. {totalAmount}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* QR Code Presentation */}
                <div className="bg-white dark:bg-[#0A1118] border border-slate-200 dark:border-white/10 rounded-[20px] p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#D4A72C]"></div>
                  <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Scan to Pay</h3>
                  
                  {/* Mock QR Placeholder - Admin Configurable */}
                  <div className="w-48 h-48 bg-white border-2 border-slate-200 p-2 rounded-[12px] mb-6 relative">
                    <div className="absolute inset-2 border-4 border-slate-900 grid grid-cols-2 gap-1 p-1">
                      <div className="bg-slate-900 rounded-sm"></div>
                      <div className="bg-slate-900 rounded-sm"></div>
                      <div className="bg-slate-900 rounded-sm"></div>
                      <div className="bg-white"></div>
                    </div>
                  </div>

                  <p className="font-[800] text-xl text-slate-900 dark:text-white mb-1">LoksewaAI</p>
                  <p className="text-sm font-[600] text-slate-500 mb-4">Payment Number: 98XXXXXXXX</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-[700] rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Fonepay / eSewa / Khalti
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-lg font-[800] text-slate-900 dark:text-white mb-6">How to Pay</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#163E6B] dark:bg-[#D4A72C] text-white dark:text-[#0A1118] flex items-center justify-center font-[800] shrink-0">1</div>
                      <div>
                        <h4 className="font-[700] text-slate-900 dark:text-white text-sm mb-1">Scan the QR code</h4>
                        <p className="text-xs text-slate-500 font-[500]">Use your preferred supported payment application.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#163E6B] dark:bg-[#D4A72C] text-white dark:text-[#0A1118] flex items-center justify-center font-[800] shrink-0">2</div>
                      <div>
                        <h4 className="font-[700] text-slate-900 dark:text-white text-sm mb-1">Pay the exact amount</h4>
                        <p className="text-xs text-slate-500 font-[500]">Make sure the amount matches Rs. {totalAmount}.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#163E6B] dark:bg-[#D4A72C] text-white dark:text-[#0A1118] flex items-center justify-center font-[800] shrink-0">3</div>
                      <div>
                        <h4 className="font-[700] text-slate-900 dark:text-white text-sm mb-1">Complete the transaction</h4>
                        <p className="text-xs text-slate-500 font-[500]">Keep your transaction/reference code.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#163E6B] dark:bg-[#D4A72C] text-white dark:text-[#0A1118] flex items-center justify-center font-[800] shrink-0">4</div>
                      <div>
                        <h4 className="font-[700] text-slate-900 dark:text-white text-sm mb-1">Upload payment proof</h4>
                        <p className="text-xs text-slate-500 font-[500]">Submit the transaction code and screenshot below.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Form */}
              <div className="pt-8 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-xl font-[800] text-slate-900 dark:text-white mb-6">Payment Verification</h3>
                
                <div className="space-y-6 max-w-xl">
                  <div className="space-y-2">
                    <label className="text-sm font-[700] text-slate-900 dark:text-white">Transaction / Reference Code *</label>
                    <input 
                      type="text" 
                      placeholder="Enter your transaction code" 
                      value={txnCode}
                      onChange={(e) => setTxnCode(e.target.value)}
                      className={`w-full h-12 px-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border ${errors.txnCode ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50 font-[500] uppercase`}
                    />
                    {errors.txnCode && <p className="text-xs text-red-500 font-[600]">{errors.txnCode}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-[700] text-slate-900 dark:text-white">Payment Screenshot *</label>
                    <input 
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    
                    {!screenshot ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-40 rounded-[12px] border-2 border-dashed ${errors.screenshot ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5'} flex flex-col items-center justify-center cursor-pointer transition-colors`}
                      >
                        <UploadCloud className={`w-8 h-8 mb-3 ${errors.screenshot ? 'text-red-500' : 'text-slate-400'}`} />
                        <p className="text-sm font-[700] text-slate-700 dark:text-slate-300 mb-1">Upload Payment Screenshot</p>
                        <p className="text-xs text-slate-500 font-[500]">JPG, JPEG, PNG (Max: 5MB)</p>
                      </div>
                    ) : (
                      <div className="w-full p-4 rounded-[12px] border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-[700] text-slate-900 dark:text-white truncate">Payment Proof Added</p>
                            <p className="text-xs text-slate-500 font-[500] truncate">{screenshot.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setScreenshot(null)}
                          className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {errors.screenshot && <p className="text-xs text-red-500 font-[600]">{errors.screenshot}</p>}
                  </div>
                </div>

                <div className="pt-10">
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-[12px] p-4 mb-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-[700] text-blue-900 dark:text-blue-300 mb-1">Confirm Your Order</h4>
                      <p className="text-xs text-blue-800/80 dark:text-blue-200/70 font-[500]">
                        You are about to submit an order for Rs. {totalAmount} via QR Payment. Please ensure your transaction code and screenshot are accurate to prevent delays.
                      </p>
                    </div>
                  </div>

                  <Button 
                    className="w-full sm:w-auto h-14 px-10 rounded-[12px] bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118] font-[800] text-[16px]"
                    onClick={handlePlaceOrder}
                  >
                    Confirm & Place Order <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Order Summary Sidebar */}
            <div className="hidden lg:block">
              {renderOrderSummary()}
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRMATION */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <h2 className="text-3xl font-[900] text-slate-900 dark:text-white mb-4">Order Submitted Successfully</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 font-[500] mb-8">
              Your order has been received. Our team will verify your payment and update your order status shortly.
            </p>

            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[20px] p-8 text-left mb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-[600] text-slate-500 mb-1">Order ID</p>
                  <p className="text-lg font-[800] text-slate-900 dark:text-white">#LSAI-10294X</p>
                </div>
                <div>
                  <p className="text-sm font-[600] text-slate-500 mb-1">Total Amount</p>
                  <p className="text-lg font-[800] text-slate-900 dark:text-white">Rs. {totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm font-[600] text-slate-500 mb-1">Payment Status</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 text-xs font-[700] rounded-md uppercase tracking-wider mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    Pending Verification
                  </div>
                </div>
                <div>
                  <p className="text-sm font-[600] text-slate-500 mb-1">Transaction Ref</p>
                  <p className="text-[15px] font-[700] text-slate-900 dark:text-white uppercase">{txnCode}</p>
                </div>
              </div>
            </div>

            <Button 
              className="h-12 px-8 rounded-[10px] bg-[#163E6B] hover:bg-[#163E6B]/90 text-white font-[700] dark:bg-white dark:hover:bg-slate-200 dark:text-[#0A1118]"
              onClick={onComplete}
            >
              Return to Marketplace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
