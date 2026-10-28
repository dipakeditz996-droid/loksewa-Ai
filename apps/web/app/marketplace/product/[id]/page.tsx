"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { marketplaceApi, Product } from "@/lib/api/marketplace";
import { buildMediaUrl } from "@/lib/api/client";
import { ArrowLeft, Loader2, ShoppingCart, Tag, MapPin, User, BookOpen } from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    
    marketplaceApi.getProduct(Number(id))
      .then((data) => {
        if (!mounted) return;
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load product");
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    


    setAddingToCart(true);
    try {
      await marketplaceApi.addToCart(product.id, 1);
      router.push("/marketplace/cart");
    } catch (err: any) {
      alert(err.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1118] flex items-center justify-center flex-col">
        <Loader2 className="w-10 h-10 animate-spin text-[#163E6B]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1118] flex flex-col font-sans">
        <main className="flex-1 container mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">{error || "Product not found"}</h1>
          <Button onClick={() => router.push("/marketplace")}>Back to Marketplace</Button>
        </main>
      </div>
    );
  }


  const stockText = product.stock !== undefined ? (product.stock > 0 ? `${product.stock} in stock` : "Out of Stock") : "In Stock";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A1118] text-slate-900 dark:text-slate-50 flex flex-col font-sans">
      <main className="flex-1 container mx-auto px-4 py-24 max-w-5xl">
        <button 
          onClick={() => router.push("/marketplace")}
          className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: Image */}
          <div className="rounded-2xl overflow-hidden bg-slate-100/90 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-lg aspect-[4/5] sm:aspect-square flex items-center justify-center p-6 relative">
            {product.cover_image ? (
              <>
                <img
                  src={buildMediaUrl(product.cover_image)}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-25 scale-125 pointer-events-none select-none"
                />
                <div className="relative z-10 h-full w-full flex items-center justify-center">
                  <img
                    src={buildMediaUrl(product.cover_image)}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.25)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.7)]"
                  />
                </div>
              </>
            ) : (
              <div className="w-48 h-64 rounded-lg bg-gradient-to-br from-[#163E6B] to-[#0A1118] p-5 flex flex-col justify-between shadow-2xl border-l-4 border-amber-400">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white/80">Loksewa</span>
                  <BookOpen className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-3 leading-snug mb-1">{product.title}</h3>
                  <span className="text-xs text-white/70">{product.category}</span>
                </div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
                  Official Resource
                </div>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            <div>
              <div className="inline-block px-3 py-1 bg-[#163E6B]/10 dark:bg-[#D4A72C]/10 text-[#163E6B] dark:text-[#D4A72C] rounded-full text-xs font-bold tracking-wider uppercase mb-3">
                {product.category}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{product.title}</h1>
              
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                {product.condition && (
                  <div className="flex items-center gap-1"><Tag className="w-4 h-4" /> {product.condition}</div>
                )}
                {product.location && (
                  <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {product.location}</div>
                )}
                {product.seller_details && (
                  <div className="flex items-center gap-1"><User className="w-4 h-4" /> {product.seller_details.first_name} {product.seller_details.last_name}</div>
                )}
              </div>
            </div>

            <div className="py-6 border-y border-slate-200 dark:border-white/10">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-black text-[#163E6B] dark:text-[#D4A72C]">Rs. {product.final_price}</span>
                {product.discount_price && (
                  <span className="text-lg font-semibold text-slate-400 line-through mb-1">Rs. {product.price}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className={`text-sm font-bold ${product.stock === 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {stockText}
                </p>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {Number(product.delivery_fee) > 0 ? (
                    <span>Delivery: <strong className="text-slate-900 dark:text-white">Rs. {product.delivery_fee}</strong></span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free delivery</span>
                  )}
                </p>
              </div>
            </div>

            <div className="prose dark:prose-invert">
              <p>{product.description}</p>
            </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                {product.author && <div><span className="text-slate-500">Author:</span> <span className="font-semibold">{product.author}</span></div>}
                {product.publisher && <div><span className="text-slate-500">Publisher:</span> <span className="font-semibold">{product.publisher}</span></div>}
                {product.isbn && <div><span className="text-slate-500">ISBN:</span> <span className="font-semibold">{product.isbn}</span></div>}
                {product.edition && <div><span className="text-slate-500">Edition:</span> <span className="font-semibold">{product.edition}</span></div>}
                {product.published_date && <div><span className="text-slate-500">Published Date:</span> <span className="font-semibold">{product.published_date}</span></div>}
                {product.total_pages && <div><span className="text-slate-500">Total Pages:</span> <span className="font-semibold">{product.total_pages}</span></div>}
              </div>

            <Button 
              className="w-full h-14 text-lg font-bold bg-[#D4A72C] hover:bg-[#D4A72C]/90 text-[#0A1118]"
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
            >
              {addingToCart ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
              Add to Cart
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
