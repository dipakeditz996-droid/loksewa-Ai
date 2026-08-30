"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { marketplaceApi, Product, Purchase } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, ShoppingBag, Download, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Separator } from "@/components/ui/separator";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.productId);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, purchData] = await Promise.all([
        marketplaceApi.getProduct(productId),
        marketplaceApi.getPurchases()
      ]);
      setProduct(prodData);
      setPurchases(purchData);
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

  const hasPurchased = purchases.some(p => p.product === product.id && p.status === 'ACTIVE');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
  const isFree = product.is_free;

  const handleGetAccess = async () => {
    if (isFree && !hasPurchased) {
      // In a real app, there might be a dedicated endpoint for claiming free products.
      // Since it's free, we could direct them to checkout with 0 amount or auto-enroll.
      router.push(`/student/marketplace/checkout/${product.id}`);
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
            {product.target_position && (
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Target: {product.target_position}
              </p>
            )}
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-6 mb-8">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight">
                {isFree ? 'Free' : `Rs. ${product.final_price}`}
              </span>
              {!isFree && product.discount_price && (
                <span className="text-lg text-muted-foreground line-through font-medium">
                  Rs. {product.price}
                </span>
              )}
            </div>

            <Separator />

            <div>
              {hasPurchased ? (
                <div className="space-y-3">
                  <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    <span className="font-semibold">You own this material</span>
                  </div>
                  {product.product_file ? (
                    <Button className="w-full h-12 text-md" asChild>
                      <a href={product.product_file.startsWith('http') ? product.product_file : `${baseUrl}${product.product_file.startsWith('/') ? '' : '/'}${product.product_file}`} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-5 w-5" />
                        Download / Access Material
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full h-12 text-md" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Material Pending Upload
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  className="w-full h-12 text-md bg-primary hover:bg-primary/90 shadow-md" 
                  onClick={() => isFree ? handleGetAccess() : router.push(`/student/marketplace/checkout/${product.id}`)}
                >
                  {isFree ? "Get Free Access" : "Buy Now"}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
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
