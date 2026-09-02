"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceApi, Cart, PaymentMethod, DeliveryAddress, Order } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Info, AlertCircle, CheckCircle2, MapPin, Plus } from "lucide-react";
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
  
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  
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
    if (!selectedAddressId) {
      toast.error("Please select a delivery address.");
      return;
    }
    try {
      setSubmitting(true);
      const createdOrder = await marketplaceApi.createOrder({ delivery_address_id: selectedAddressId });
      setOrder(createdOrder);
      toast.success("Order confirmed. Please proceed to payment.");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order.");
    } finally {
      setSubmitting(false);
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
      toast.error(error?.response?.data?.detail || "An error occurred during submission. Please try again.");
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
  const deliveryFee = calculatedFee ?? 0;
  const grandTotal = subtotal + deliveryFee;

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
                <CardDescription>Select or add a new delivery address for your physical books</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.length === 0 ? (
                   <div className="p-4 bg-muted rounded-md text-center">
                     <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                     <p className="text-muted-foreground mb-4">No delivery addresses found.</p>
                   </div>
                ) : (
                  <RadioGroup value={selectedAddressId?.toString()} onValueChange={handleAddressSelection} className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className="flex items-start space-x-3 border p-4 rounded-lg">
                        <RadioGroupItem value={addr.id.toString()} id={`addr-${addr.id}`} className="mt-1" />
                        <Label htmlFor={`addr-${addr.id}`} className="flex flex-col cursor-pointer">
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
                    <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-2" /> Add New Address</Button>
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
              </CardContent>
              <CardFooter className="bg-muted/30 pt-6">
                <Button 
                  onClick={handlePlaceOrder} 
                  className="w-full h-12 text-lg" 
                  disabled={submitting || !selectedAddressId || addresses.length === 0}
                >
                  {submitting ? "Placing Order..." : "Confirm Delivery Address"}
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
                        <div key={method.id}>
                          <RadioGroupItem value={method.id.toString()} id={`method-${method.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`method-${method.id}`}
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center h-full"
                          >
                            <span className="font-semibold text-lg">{method.display_name}</span>
                            <span className="text-xs text-muted-foreground mt-1">{method.method_type}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>

              {selectedMethod && (
                <Card className="border-primary/20 shadow-md">
                  <CardHeader className="bg-primary/5 pb-4 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                      Payment Instructions for {selectedMethod.display_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                      {selectedMethod.qr_image && (
                        <div className="flex flex-col items-center p-4 bg-card border rounded-xl shadow-sm">
                          <div className="relative w-48 h-48 mb-2">
                            <Image
                              src={selectedMethod.qr_image.startsWith('http') ? selectedMethod.qr_image : `${baseUrl}${selectedMethod.qr_image.startsWith('/') ? '' : '/'}${selectedMethod.qr_image}`}
                              alt={`QR for ${selectedMethod.display_name}`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Scan to pay</p>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg border">
                          <h4 className="font-semibold mb-3">Account Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between border-b pb-1">
                              <dt className="text-muted-foreground">Account Name</dt>
                              <dd className="font-medium">{selectedMethod.account_name}</dd>
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
                              <dt className="text-muted-foreground font-semibold">Total to Pay</dt>
                              <dd className="font-bold text-lg text-primary">Rs. {order.total_amount}</dd>
                            </div>
                          </dl>
                        </div>

                        {selectedMethod.instructions && (
                          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-100 dark:border-blue-900/50">
                            <strong>Instructions:</strong> {selectedMethod.instructions}
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
                      {submitting ? "Submitting..." : "Submit Payment for Verification"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </>
          )}
        </div>

        {/* Right Col: Summary */}
        <div className="lg:col-span-5">
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
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cart?.items.length} items)</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{calculatedFee === null ? "Calculating..." : `Rs. ${deliveryFee.toFixed(2)}`}</span>
                </div>
                
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total to Pay</span>
                  <span className="text-primary">Rs. {order ? order.total_amount : grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
