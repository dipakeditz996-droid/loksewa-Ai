"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { marketplaceApi, Product, PaymentMethod } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.productId);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, methData] = await Promise.all([
        marketplaceApi.getProduct(productId),
        marketplaceApi.getPaymentMethods()
      ]);
      setProduct(prodData);
      setMethods(methData);
      if (methData.length > 0) {
        setSelectedMethodId(methData[0]!.id.toString());
      }
    } catch (error) {
      console.error("Failed to load checkout details", error);
      toast.error("Failed to load checkout details");
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !selectedMethodId) return;

    if (!product.is_free && !screenshot) {
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
      formData.append('product', product.id.toString());
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

  if (!product) return null;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="text-center p-8 border-green-200 bg-green-50/50 shadow-sm">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Payment Submitted Successfully</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Your payment is currently <strong className="text-foreground">PENDING VERIFICATION</strong>.
          </p>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-left mb-8 max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
              Your payment is being reviewed by the administrator. You will receive access to the material immediately after approval.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto h-12 px-8">
            <Link href="/student/marketplace/purchases">View My Purchases</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const selectedMethod = methods.find(m => m.id.toString() === selectedMethodId);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
        <Link href={`/student/marketplace/${product.id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Product
        </Link>
      </Button>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Checkout</h2>
        <p className="text-muted-foreground">Complete your purchase for {product.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Payment Flow */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              {methods.length === 0 ? (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md flex items-start gap-3">
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
                    <div className="flex flex-col items-center p-4 bg-white border rounded-xl shadow-sm">
                      <div className="relative w-48 h-48 mb-2">
                        <Image 
                          src={`${baseUrl}${selectedMethod.qr_image}`}
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
                          <dt className="text-muted-foreground font-semibold">Amount to Pay</dt>
                          <dd className="font-bold text-lg text-primary">Rs. {product.final_price}</dd>
                        </div>
                      </dl>
                    </div>

                    {selectedMethod.instructions && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border border-blue-100">
                        <strong>Instructions:</strong> {selectedMethod.instructions}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <form onSubmit={handleSubmit}>
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
        </div>

        {/* Right Col: Summary */}
        <div className="lg:col-span-5">
          <Card className="sticky top-6">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-muted rounded overflow-hidden relative shrink-0 border">
                  {product.cover_image && (
                    <Image 
                      src={`${baseUrl}${product.cover_image}`} 
                      alt={product.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold leading-tight line-clamp-2">{product.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{product.category}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Price</span>
                  <span>Rs. {product.price}</span>
                </div>
                {product.discount_price && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>- Rs. {(parseFloat(product.price) - parseFloat(product.discount_price)).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total to Pay</span>
                  <span className="text-primary">Rs. {product.final_price}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
