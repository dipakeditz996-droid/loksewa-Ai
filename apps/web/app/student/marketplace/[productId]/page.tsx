"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { marketplaceApi, Product, Purchase } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, ShoppingBag, BookOpen, MapPin, User, FileText, Bookmark, Info, Star, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.productId);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const prodData = await marketplaceApi.getProduct(productId);
      setProduct(prodData);
    } catch (error) {
      console.error("Failed to load product details", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">The product you are looking for does not exist or is no longer available.</p>
        <Button asChild>
          <Link href="/student/marketplace">Return to Marketplace</Link>
        </Button>
      </div>
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  const handleAddToCart = async () => {
    if (product.stock === 0) return;
    try {
      setAddingToCart(true);
      await marketplaceApi.addToCart(product.id, 1);
      toast.success("Added to Cart");
      router.push("/student/marketplace/cart");
    } catch (error: any) {
      toast.error(error.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
        <Link href="/student/marketplace" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Col: Image */}
        <div className="space-y-4">
          <div className="aspect-[4/3] w-full bg-muted rounded-2xl overflow-hidden relative border shadow-sm">
            {product.cover_image ? (
              <Image 
                src={product.cover_image.startsWith('http') ? product.cover_image : `${baseUrl}${product.cover_image.startsWith('/') ? '' : '/'}${product.cover_image}`} 
                alt={product.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary">
                <ShoppingBag className="h-16 w-16 opacity-30" />
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Details */}
        <div className="flex flex-col">
          <div className="space-y-2 mb-6">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
              {product.category.replace('_', ' ')}
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{product.title}</h1>
            {product.condition && (
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5" /> Condition: {product.condition.replace('_', ' ')}
              </p>
            )}
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-6 mb-8">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight">
                {`Rs. ${product.final_price}`}
              </span>
              {product.discount_price && (
                <span className="text-lg text-muted-foreground line-through font-medium">
                  Rs. {product.price}
                </span>
              )}
            </div>

            <Separator />

            <div>
              <Button 
                className="w-full h-12 text-md bg-primary hover:bg-primary/90 shadow-md" 
                onClick={handleAddToCart}
                disabled={addingToCart || (product.stock !== undefined && product.stock <= 0)}
              >
                {product.stock !== undefined && product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-muted/50">
               {product.author && (
                 <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><User className="h-3.5 w-3.5" /> Author</span>
                   <span>{product.author}</span>
                 </div>
               )}
               {product.publisher && (
                 <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Publisher</span>
                   <span>{product.publisher}</span>
                 </div>
               )}
               {product.isbn && (
                 <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> ISBN</span>
                   <span>{product.isbn}</span>
                 </div>
               )}
               {product.edition && (
                 <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Edition</span>
                   <span>{product.edition}</span>
                 </div>
               )}
               {product.location && (
                 <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</span>
                   <span>{product.location}</span>
                 </div>
               )}
               <div className="flex flex-col">
                   <span className="font-semibold text-foreground flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> Stock</span>
                   <span className={product.stock && product.stock > 0 ? "text-green-600" : "text-destructive"}>
                     {product.stock && product.stock > 0 ? `${product.stock} available` : "Out of stock"}
                   </span>
               </div>
                {product.seller_details && (
                 <div className="flex flex-col col-span-2 mt-2 pt-4 border-t border-muted-foreground/20">
                   <span className="font-bold text-foreground flex items-center gap-1 mb-2"><User className="h-4 w-4" /> Seller Details</span>
                   <div className="flex items-center justify-between">
                     <span className="font-medium">{product.seller_details.full_name || `${product.seller_details.first_name} ${product.seller_details.last_name || ''}`}</span>
                     {product.seller_details.average_rating ? (
                       <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded text-xs font-bold">
                         <Star className="w-3.5 h-3.5 fill-current" />
                         {product.seller_details.average_rating.toFixed(1)} ({product.seller_details.total_reviews})
                       </div>
                     ) : (
                       <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">No reviews yet</span>
                     )}
                   </div>
                   <div className="mt-3">
                     <button className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium">
                       <ShieldAlert className="w-3.5 h-3.5" /> Report this listing
                     </button>
                   </div>
                 </div>
               )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center">
                <FileText className="mr-2 h-5 w-5 text-muted-foreground" />
                Description
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>

            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">What's included</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-primary mr-3 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
