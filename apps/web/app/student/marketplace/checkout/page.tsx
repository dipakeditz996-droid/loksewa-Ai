"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceApi, Cart, PaymentMethod, DeliveryAddress, Order, ProfileAddressResponse } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Info, AlertCircle, CheckCircle2, MapPin, Plus, UserCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CheckoutPage() {
  const router = useRouter();
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [calculatedFee, setCalculatedFee] = useState<number | null>(null);
  
  // "Use my existing info" state
  const [useExistingInfo, setUseExistingInfo] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [existingInfoForm, setExistingInfoForm] = useState<Partial<DeliveryAddress>>({
    full_name: "",
    phone_number: "",
    province: "",
    district: "",
    municipality: "",
    ward_number: "",
    tole_area: "",
    street_landmark: "",
    delivery_note: "",
  });
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [saveToAddresses, setSaveToAddresses] = useState(true);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMode, setPaymentMode] = useState<'PREPAID' | 'COD'>('PREPAID');
  
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<DeliveryAddress>>({
    full_name: "", phone_number: "", province: "", district: "", municipality: "", 
    ward_number: "", tole_area: "", street_landmark: "", delivery_note: "", is_default: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cartData, addressData, methData] = await Promise.all([
        marketplaceApi.getCart(),
        marketplaceApi.getDeliveryAddresses(),
        marketplaceApi.getPaymentMethods()
      ]);
      setCart(cartData);
      setAddresses(addressData);
      setMethods(methData);
      
      if (addressData.length > 0) {
        const defaultAddr = addressData.find(a => a.is_default);
        const addrId = defaultAddr ? defaultAddr.id : (addressData[0]?.id ?? 0);
        setSelectedAddressId(addrId);
        fetchDeliveryFee(addrId);
      } else {
        // If student has no saved addresses, default to prefilling profile info
        handleToggleUseExistingInfo(true);
      }
      
      if (methData.length > 0) {
        setSelectedMethodId(methData[0]!.id.toString());
      }
      
      if (cartData.items.length === 0) {
        toast.error("Your cart is empty");
        router.push("/student/marketplace/cart");
      }
    } catch (error) {
      console.error("Failed to load checkout details", error);
      toast.error("Failed to load checkout details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryFee = async (addressId: number) => {
    try {
      const res = await marketplaceApi.calculateFee({ delivery_address_id: addressId });
      setCalculatedFee(Number(res.delivery_fee));
    } catch (err) {
      console.error("Failed to calculate fee", err);
      setCalculatedFee(0);
    }
  };

  const fetchDeliveryFeeForLocation = async (province?: string, district?: string, municipality?: string) => {
    try {
      const res = await marketplaceApi.calculateFee({
        province: province || "",
        district: district || "",
        municipality: municipality || "",
      });
      setCalculatedFee(Number(res.delivery_fee));
    } catch (err) {
      console.error("Failed to calculate location fee", err);
      setCalculatedFee(0);
    }
  };

  const handleToggleUseExistingInfo = async (checked: boolean) => {
    setUseExistingInfo(checked);
    if (checked) {
      try {
        setLoadingProfile(true);
        const profileData = await marketplaceApi.getProfileAddress();
        setExistingInfoForm(prev => ({
          full_name: profileData.full_name || prev.full_name || "",
          phone_number: profileData.phone_number || prev.phone_number || "",
          province: profileData.province || prev.province || "",
          district: profileData.district || prev.district || "",
          municipality: profileData.municipality || prev.municipality || "",
          ward_number: profileData.ward_number || prev.ward_number || "",
          tole_area: profileData.tole_area || prev.tole_area || "",
          street_landmark: profileData.street_landmark || prev.street_landmark || "",
          delivery_note: profileData.delivery_note || prev.delivery_note || "",
        }));
        setMissingProfileFields(profileData.missing_fields || []);
        
        const prov = profileData.province || existingInfoForm.province;
        const dist = profileData.district || existingInfoForm.district;
        const mun = profileData.municipality || existingInfoForm.municipality;
        if (prov || dist || mun) {
          fetchDeliveryFeeForLocation(prov, dist, mun);
        }
      } catch (err) {
        console.error("Failed to fetch profile address", err);
        toast.error("Could not auto-fill all profile details. Please complete your address below.");
      } finally {
        setLoadingProfile(false);
      }
    } else {
      if (selectedAddressId) {
        fetchDeliveryFee(selectedAddressId);
      }
    }
  };

  const handleExistingInfoFieldChange = (field: keyof DeliveryAddress, val: string) => {
    const updated = { ...existingInfoForm, [field]: val };
    setExistingInfoForm(updated);
    if (field === 'province' || field === 'district' || field === 'municipality') {
      fetchDeliveryFeeForLocation(updated.province, updated.district, updated.municipality);
    }
  };

  const handleAddressSelection = (val: string) => {
    const id = Number(val);
    setSelectedAddressId(id);
    fetchDeliveryFee(id);
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await marketplaceApi.createDeliveryAddress(newAddress);
      setAddresses([created, ...addresses]);
      setSelectedAddressId(created.id);
      fetchDeliveryFee(created.id);
      setIsAddressModalOpen(false);
      toast.success("Address added successfully");
    } catch (error: any) {
      toast.error("Failed to add address");
    }
  };

  const handlePlaceOrder = async () => {
    if (useExistingInfo) {
      const required: (keyof DeliveryAddress)[] = [
        'full_name', 'phone_number', 'province', 'district', 'municipality', 'ward_number', 'tole_area'
      ];
      const missing = required.filter(f => !String(existingInfoForm[f] || '').trim());
      if (missing.length > 0) {
        toast.error(`Please complete required fields: ${missing.join(', ').replace(/_/g, ' ')}`);
        return;
      }

      try {
        setSubmitting(true);
        const createdOrder = await marketplaceApi.createOrder({
          delivery_address: existingInfoForm,
          save_to_addresses: saveToAddresses,
          payment_mode: paymentMode,
        });
        setOrder(createdOrder);
        toast.success("Order confirmed. Please proceed to payment.");
      } catch (error: any) {
        const msg = 
          (typeof error?.data?.detail === "string" && error.data.detail.trim()) ||
          (typeof error?.message === "string" && error.message.trim() && error.message !== "An API error occurred" ? error.message.trim() : null) ||
          (typeof error?.data === "string" && error.data.trim()) ||
          "Failed to place order. Please try again.";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!selectedAddressId) {
        toast.error("Please select a delivery address.");
        return;
      }
      try {
        setSubmitting(true);
        const createdOrder = await marketplaceApi.createOrder({ 
          delivery_address_id: selectedAddressId,
          payment_mode: paymentMode,
        });
        setOrder(createdOrder);
        toast.success("Order confirmed. Please proceed to payment.");
      } catch (error: any) {
        const msg = 
          (typeof error?.data?.detail === "string" && error.data.detail.trim()) ||
          (typeof error?.message === "string" && error.message.trim() && error.message !== "An API error occurred" ? error.message.trim() : null) ||
          (typeof error?.data === "string" && error.data.trim()) ||
          "Failed to place order. Please try again.";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Screenshot must be less than 5MB");
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error("Only JPG, PNG, and WEBP are supported");
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !selectedMethodId) return;

    if (!screenshot) {
      toast.error("Please upload your payment proof.");
      return;
    }

    if (!transactionId.trim()) {
      toast.error("Please enter the transaction ID.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('order', order.id.toString());
      formData.append('payment_method', selectedMethodId);
      formData.append('transaction_id', transactionId.trim());
      formData.append('note', note.trim());
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      await marketplaceApi.submitPayment(formData);
      setSuccess(true);
      toast.success("Your payment proof has been submitted and is pending verification.");
    } catch (error: any) {
      toast.error(error?.data?.detail || error?.message || "An error occurred during submission. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading checkout...</div>;
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="text-center p-8 border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30/50 shadow-sm">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Payment Submitted Successfully</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Your payment for Order #{order?.id} is currently <strong className="text-foreground">PENDING VERIFICATION</strong>.
          </p>
          <div className="bg-card p-4 rounded-lg border shadow-sm text-left mb-8 max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
              Your payment is being reviewed by the administrator. Once verified, your physical books will be shipped.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto h-12 px-8">
            <Link href="/student/marketplace/orders">View My Orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const selectedMethod = methods.find(m => m.id.toString() === selectedMethodId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
  
  const subtotal = cart?.items.reduce((acc, item) => acc + (parseFloat(item.product_details?.final_price || "0") * item.quantity), 0) || 0;
  const currentDeliveryFee = order ? Number(order.delivery_fee) : (calculatedFee ?? 0);
  const grandTotal = order ? (Number(order.total_amount) + Number(order.delivery_fee)) : (subtotal + currentDeliveryFee);
  
  const isCodActive = order ? (order.payment_mode === 'COD' || order.is_cod) : (paymentMode === 'COD');
  const codAdvance = order?.cod_advance_required ? Number(order.cod_advance_required) : Math.round((grandTotal * 0.15) * 100) / 100;
  const codRemaining = order?.cod_remaining_balance ? Number(order.cod_remaining_balance) : Math.max(0, grandTotal - codAdvance);
  const payableNow = isCodActive ? codAdvance : grandTotal;

  // Address used snapshot display
  const activeSnapshot = order?.shipping_address_snapshot || (useExistingInfo ? existingInfoForm : addresses.find(a => a.id === selectedAddressId));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {!order && (
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link href={`/student/marketplace/cart`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Link>
        </Button>
      )}

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Checkout</h2>
        <p className="text-muted-foreground">Complete your purchase for physical books</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Flow */}
        <div className="lg:col-span-7 space-y-6">
          {!order ? (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
                <CardDescription>Select or customize your delivery address for physical shipment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Option: Use my existing info */}
                <div className={`p-4 rounded-xl border transition-all ${
                  useExistingInfo 
                    ? "bg-primary/5 border-primary/40 shadow-sm" 
                    : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10"
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useExistingInfo}
                      onChange={(e) => handleToggleUseExistingInfo(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">Use my existing info</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Prefill available delivery details directly from your registered student profile
                      </p>
                    </div>
                  </label>

                  {/* Prefilled Profile Form & Review Section */}
                  {useExistingInfo && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                      {loadingProfile ? (
                        <div className="text-xs text-muted-foreground animate-pulse py-2">
                          Loading saved profile information...
                        </div>
                      ) : (
                        <>
                          {missingProfileFields.length > 0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                              <div>
                                <span className="font-semibold">Review your delivery address:</span> We prefilled details from your profile. Please complete the missing delivery fields (e.g. Ward Number and Tole/Area) below.
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Full Name <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.full_name || ""}
                                onChange={(e) => handleExistingInfoFieldChange("full_name", e.target.value)}
                                placeholder="Recipient full name"
                                className={!existingInfoForm.full_name?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Phone Number <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.phone_number || ""}
                                onChange={(e) => handleExistingInfoFieldChange("phone_number", e.target.value)}
                                placeholder="Mobile number"
                                className={!existingInfoForm.phone_number?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Province <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.province || ""}
                                onChange={(e) => handleExistingInfoFieldChange("province", e.target.value)}
                                placeholder="e.g. Bagmati"
                                className={!existingInfoForm.province?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">District <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.district || ""}
                                onChange={(e) => handleExistingInfoFieldChange("district", e.target.value)}
                                placeholder="e.g. Kathmandu"
                                className={!existingInfoForm.district?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Municipality / Local Level <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.municipality || ""}
                                onChange={(e) => handleExistingInfoFieldChange("municipality", e.target.value)}
                                placeholder="e.g. Kathmandu Metropolitan"
                                className={!existingInfoForm.municipality?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Ward Number <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.ward_number || ""}
                                onChange={(e) => handleExistingInfoFieldChange("ward_number", e.target.value)}
                                placeholder="e.g. 10"
                                className={!existingInfoForm.ward_number?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Tole / Area / Street <span className="text-red-500">*</span></Label>
                              <Input
                                value={existingInfoForm.tole_area || ""}
                                onChange={(e) => handleExistingInfoFieldChange("tole_area", e.target.value)}
                                placeholder="e.g. Baneshwor"
                                className={!existingInfoForm.tole_area?.trim() ? "border-amber-400" : ""}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Nearby Landmark (Optional)</Label>
                              <Input
                                value={existingInfoForm.street_landmark || ""}
                                onChange={(e) => handleExistingInfoFieldChange("street_landmark", e.target.value)}
                                placeholder="e.g. Near Krishna Mandir"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Delivery Note (Optional)</Label>
                              <Input
                                value={existingInfoForm.delivery_note || ""}
                                onChange={(e) => handleExistingInfoFieldChange("delivery_note", e.target.value)}
                                placeholder="e.g. Call before arrival"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={saveToAddresses}
                              onChange={(e) => setSaveToAddresses(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-slate-300"
                            />
                            Save this address to my saved delivery addresses for future orders
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* If NOT using existing info, show saved address book */}
                {!useExistingInfo && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Or Choose from Saved Addresses
                    </div>
                    {addresses.length === 0 ? (
                      <div className="p-4 bg-muted rounded-md text-center">
                        <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-4">No saved delivery addresses found.</p>
                      </div>
                    ) : (
                      <RadioGroup value={selectedAddressId?.toString()} onValueChange={handleAddressSelection} className="space-y-3">
                        {addresses.map(addr => (
                          <div key={addr.id} className="flex items-start space-x-3 border p-4 rounded-lg hover:border-primary/50 transition-colors">
                            <RadioGroupItem value={addr.id.toString()} id={`addr-${addr.id}`} className="mt-1" />
                            <Label htmlFor={`addr-${addr.id}`} className="flex flex-col cursor-pointer flex-1">
                              <span className="font-semibold">{addr.full_name} ({addr.phone_number}) {addr.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded ml-2">Default</span>}</span>
                              <span className="text-muted-foreground font-normal text-sm mt-1">
                                {addr.province}, {addr.district}, {addr.municipality}-{addr.ward_number}
                              </span>
                              <span className="text-muted-foreground font-normal text-sm">
                                {addr.tole_area} {addr.street_landmark && `(${addr.street_landmark})`}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Different Address</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Add Delivery Address</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateAddress} className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Full Name *</Label>
                              <Input required value={newAddress.full_name} onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Phone Number *</Label>
                              <Input required value={newAddress.phone_number} onChange={e => setNewAddress({...newAddress, phone_number: e.target.value})} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Province *</Label>
                              <Input required value={newAddress.province} onChange={e => setNewAddress({...newAddress, province: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>District *</Label>
                              <Input required value={newAddress.district} onChange={e => setNewAddress({...newAddress, district: e.target.value})} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Municipality/VDC *</Label>
                              <Input required value={newAddress.municipality} onChange={e => setNewAddress({...newAddress, municipality: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Ward No. *</Label>
                              <Input required value={newAddress.ward_number} onChange={e => setNewAddress({...newAddress, ward_number: e.target.value})} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Tole/Area *</Label>
                            <Input required value={newAddress.tole_area} onChange={e => setNewAddress({...newAddress, tole_area: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Street/Landmark (Optional)</Label>
                            <Input value={newAddress.street_landmark} onChange={e => setNewAddress({...newAddress, street_landmark: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Delivery Note (Optional)</Label>
                            <Input value={newAddress.delivery_note} onChange={e => setNewAddress({...newAddress, delivery_note: e.target.value})} />
                          </div>
                          <Button type="submit" className="w-full">Save Address</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                {/* Payment Mode Selection: Prepaid vs COD */}
                <div className="pt-4 border-t space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Payment Mode
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPaymentMode('PREPAID')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMode === 'PREPAID'
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">Full Online Payment</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          100% Prepaid
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pay the full amount now via eSewa, Khalti, or Bank QR. Fast dispatch upon verification.
                      </p>
                    </div>

                    <div
                      onClick={() => setPaymentMode('COD')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMode === 'COD'
                          ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-foreground">Cash on Delivery (COD)</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          15% Advance
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pay 15% advance online to confirm delivery. Pay remaining 85% in cash when delivered.
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="bg-muted/30 pt-6">
                <Button 
                  onClick={handlePlaceOrder} 
                  className="w-full h-12 text-lg font-semibold" 
                  disabled={submitting || (!useExistingInfo && !selectedAddressId)}
                >
                  {submitting ? "Processing Order..." : (paymentMode === 'COD' ? "Proceed to 15% Advance Payment" : "Proceed to Payment")}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Choose Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  {methods.length === 0 ? (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 rounded-md flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p>No payment methods are currently configured. Please contact support.</p>
                    </div>
                  ) : (
                    <RadioGroup value={selectedMethodId} onValueChange={setSelectedMethodId} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {methods.map((method) => (
                        <div key={method.id} className="relative">
                          <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`method-${method.id}`}
                            className="flex flex-col items-center justify-between p-4 border-2 rounded-xl cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50 transition-all text-center h-full"
                          >
                            <span className="font-bold text-sm mb-1">{method.display_name}</span>
                            <span className="text-xs text-muted-foreground">{method.method_type}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>

              {selectedMethod && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Details: {selectedMethod.display_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      {selectedMethod.qr_image && (
                        <div className="w-44 h-44 relative bg-white p-2 rounded-xl border shadow-sm shrink-0">
                          <Image 
                            src={selectedMethod.qr_image.startsWith('http') ? selectedMethod.qr_image : `${baseUrl}${selectedMethod.qr_image.startsWith('/') ? '' : '/'}${selectedMethod.qr_image}`} 
                            alt="Payment QR" 
                            fill 
                            className="object-contain" 
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 space-y-3 w-full">
                        <div className="bg-muted/50 p-4 rounded-xl border space-y-2 text-sm">
                          <dl className="space-y-1.5">
                            <div className="flex justify-between border-b pb-1">
                              <dt className="text-muted-foreground">Account Name</dt>
                              <dd className="font-semibold">{selectedMethod.account_name}</dd>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                              <dt className="text-muted-foreground">Account Number / ID</dt>
                              <dd className="font-medium font-mono">{selectedMethod.account_number}</dd>
                            </div>
                            {selectedMethod.method_type === 'BANK' && (
                              <>
                                <div className="flex justify-between border-b pb-1">
                                  <dt className="text-muted-foreground">Bank Name</dt>
                                  <dd className="font-medium">{selectedMethod.bank_name}</dd>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                  <dt className="text-muted-foreground">Branch</dt>
                                  <dd className="font-medium">{selectedMethod.branch}</dd>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between pt-2">
                              <dt className="text-muted-foreground font-semibold">
                                {order.is_cod ? "15% Advance to Pay Now" : "Total to Pay"}
                              </dt>
                              <dd className="font-bold text-lg text-primary">
                                Rs. {(order.is_cod ? Number(order.cod_advance_required) : (Number(order.total_amount) + Number(order.delivery_fee))).toFixed(2)}
                              </dd>
                            </div>
                            {order.is_cod && (
                              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                <strong>Cash on Delivery (COD) Active:</strong> The remaining balance of <strong>Rs. {Number(order.cod_remaining_balance).toFixed(2)}</strong> (85%) will be collected in cash upon delivery.
                              </div>
                            )}
                          </dl>
                        </div>

                      </div>
                    </div>

                    {/* Step-by-Step Payment Instructions */}
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Info className="h-4 w-4" />
                        <span>Payment Instructions</span>
                      </div>
                      
                      <div className="p-4 bg-primary/5 dark:bg-white/[0.03] border border-primary/20 dark:border-white/10 rounded-xl space-y-3 text-xs leading-relaxed">
                        <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                          <li>
                            Open your <strong>{selectedMethod.display_name}</strong> app or mobile banking.
                          </li>
                          <li>
                            Scan the QR code above or transfer exactly <strong className="text-primary font-bold">Rs. {(order.is_cod ? Number(order.cod_advance_required) : (Number(order.total_amount) + Number(order.delivery_fee))).toFixed(2)}</strong> {order.is_cod ? '(15% COD advance payment)' : ''} to account number <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">{selectedMethod.account_number}</span> ({selectedMethod.account_name}).
                          </li>
                          <li>
                            In the <strong>Remarks / Purpose</strong> field, write your Order reference: <span className="font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Order #{order.id}</span>
                          </li>
                          <li>
                            Complete the payment, then take a <strong>screenshot</strong> of the success receipt and copy the <strong>Transaction ID / Reference Code</strong>.
                          </li>
                          <li>
                            Enter the Transaction ID and attach the screenshot in the form below, then click <strong>Submit Payment for Verification</strong>.
                          </li>
                        </ol>

                        {selectedMethod.instructions && (
                          <div className="pt-2 border-t border-primary/10 dark:border-white/10 text-muted-foreground">
                            <span className="font-semibold text-foreground">Specific Note:</span> {selectedMethod.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <form onSubmit={handleSubmitPayment}>
                  <CardHeader>
                    <CardTitle>Submit Payment Proof</CardTitle>
                    <CardDescription>
                      After completing the payment, please upload a screenshot and enter the transaction ID for verification.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">Transaction ID / Reference Code <span className="text-red-500">*</span></Label>
                      <Input 
                        id="transactionId" 
                        placeholder="e.g. 000ABC123XYZ" 
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">The unique code provided by your payment app after successful transfer.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Screenshot <span className="text-red-500">*</span></Label>
                      <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 transition-colors">
                        {screenshotPreview ? (
                          <div className="space-y-4 w-full flex flex-col items-center">
                            <div className="relative w-full max-w-[200px] aspect-[9/16] rounded-md overflow-hidden border shadow-sm">
                              <Image src={screenshotPreview} alt="Preview" fill className="object-cover" />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}>
                              Remove Image
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-muted-foreground mb-4">PNG, JPG or WEBP (max. 5MB)</p>
                            <Input 
                              id="screenshot" 
                              type="file" 
                              accept="image/png, image/jpeg, image/webp" 
                              className="hidden" 
                              onChange={handleFileChange}
                            />
                            <Button type="button" variant="secondary" onClick={() => document.getElementById('screenshot')?.click()}>
                              Select File
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="note">Optional Note</Label>
                      <Textarea 
                        id="note" 
                        placeholder="Any message for the admin..." 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 pt-6">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg" 
                      disabled={submitting || !selectedMethodId || !transactionId || !screenshot}
                    >
                      {submitting ? "Submitting..." : (order.is_cod ? "Submit 15% Advance for Verification" : "Submit Payment for Verification")}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </>
          )}
        </div>

        {/* Right Col: Summary */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {cart?.items.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 bg-muted rounded overflow-hidden relative shrink-0 border">
                    {item.product_details?.cover_image && (
                      <Image 
                        src={item.product_details.cover_image.startsWith('http') ? item.product_details.cover_image : `${baseUrl}${item.product_details.cover_image.startsWith('/') ? '' : '/'}${item.product_details.cover_image}`} 
                        alt={item.product_details.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold leading-tight line-clamp-2 text-sm">{item.product_details?.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</p>
                    <p className="font-medium text-sm mt-1">Rs. {item.product_details?.final_price}</p>
                    {Number(item.product_details?.delivery_fee) > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Base delivery: Rs. {item.product_details?.delivery_fee}</p>
                    )}
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart?.items.length} items)</span>
                  <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>
                    {calculatedFee === null && !order ? (
                      <span className="text-muted-foreground italic">Calculating...</span>
                    ) : currentDeliveryFee === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free delivery</span>
                    ) : (
                      <span className="font-medium">Rs. {currentDeliveryFee.toFixed(2)}</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Final Order Total</span>
                  <span>Rs. {grandTotal.toFixed(2)}</span>
                </div>

                {isCodActive && (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-amber-900 dark:text-amber-200 font-semibold">
                      <span>Required 15% Advance (Payable Now)</span>
                      <span>Rs. {codAdvance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remaining Balance (Due on Delivery)</span>
                      <span>Rs. {codRemaining.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      * 15% advance must be verified before this COD order can be confirmed and dispatched.
                    </p>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{isCodActive ? "Advance Payable Now" : "Total to Pay"}</span>
                  <span className="text-primary">Rs. {payableNow.toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              {activeSnapshot && (
                <div className="pt-2 border-t">
                  <div className="p-3.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl border text-xs space-y-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Delivery Destination
                      </span>
                      {order?.shipping_address_snapshot && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Saved Snapshot
                        </span>
                      )}
                    </div>
                    {'full_name' in activeSnapshot && activeSnapshot.full_name && (
                      <p className="font-medium text-foreground">
                        {activeSnapshot.full_name} {activeSnapshot.phone_number && `(${activeSnapshot.phone_number})`}
                      </p>
                    )}
                    {'province' in activeSnapshot && (activeSnapshot.province || activeSnapshot.district) && (
                      <p className="text-muted-foreground">
                        {activeSnapshot.tole_area && `${activeSnapshot.tole_area}, `}
                        {activeSnapshot.ward_number && `Ward ${activeSnapshot.ward_number}, `}
                        {activeSnapshot.municipality && `${activeSnapshot.municipality}, `}
                        {activeSnapshot.district && `${activeSnapshot.district}, `}
                        {activeSnapshot.province}
                      </p>
                    )}
                    {'street_landmark' in activeSnapshot && activeSnapshot.street_landmark && (
                      <p className="text-muted-foreground italic">
                        Landmark: {activeSnapshot.street_landmark}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
