"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { marketplaceApi, Cart } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await marketplaceApi.getCart();
      setCart(cartData);
    } catch (error) {
      console.error("Failed to load cart", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      setRemovingItemId(itemId);
      await marketplaceApi.removeFromCart(itemId);
      await loadCart();
      toast.success("Item removed from cart");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
    } finally {
      setRemovingItemId(null);
    }
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading cart...</div>;
  }

  const subtotal = cart?.items.reduce((acc, item) => acc + (parseFloat(item.product_details?.final_price || "0") * item.quantity), 0) || 0;
  // Delivery fee depends on the delivery address and is calculated in the checkout step

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link href="/student/marketplace" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Your Cart</h1>
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="bg-card p-12 rounded-2xl border shadow-sm text-center flex flex-col items-center justify-center space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <p className="text-muted-foreground max-w-md">Looks like you haven't added any books to your cart yet.</p>
          <Button asChild className="mt-4">
            <Link href="/student/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => {
              const product = item.product_details;
              if (!product) return null;
              
              return (
                <div key={item.id} className="bg-card p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 relative group">
                  <div className="w-24 h-32 bg-muted rounded-md overflow-hidden relative shrink-0 border">
                    {product.cover_image ? (
                      <Image 
                        src={product.cover_image.startsWith('http') ? product.cover_image : `${baseUrl}${product.cover_image.startsWith('/') ? '' : '/'}${product.cover_image}`}
                        alt={product.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/30">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col py-1">
                    <h3 className="font-semibold text-lg line-clamp-2 pr-8">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{product.condition ? product.condition.replace('_', ' ') : 'New Book'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Seller: {product.seller_details ? `${product.seller_details.first_name} ${product.seller_details.last_name}` : 'Unknown'}
                    </p>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">Rs. {product.final_price}</span>
                        <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                      </div>
                      <span className="font-bold text-primary">Rs. {(parseFloat(product.final_price) * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(item.id)}
                    disabled={removingItemId === item.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-6 sticky top-6">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({cart.items.length} items)</span>
                  <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium text-muted-foreground italic">Calculated at checkout</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-end">
                <span className="font-semibold">Subtotal</span>
                <span className="text-xl font-bold text-primary">Rs. {subtotal.toFixed(2)}</span>
              </div>
              <Button className="w-full h-12 text-md shadow-md" asChild>
                <Link href="/student/marketplace/checkout">Proceed to Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
