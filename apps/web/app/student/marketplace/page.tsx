"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, Product } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, ShoppingBag, Filter, BookOpen } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await marketplaceApi.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load marketplace products", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.category.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace</h2>
          <p className="text-muted-foreground mt-1">
            Premium study materials, question sets, and courses for your Loksewa preparation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/student/marketplace/purchases">
            <ShoppingBag className="mr-2 h-4 w-4" />
            My Purchases
          </Link>
        </Button>
      </div>

      {/* Seller CTA Banner */}
      <div className="bg-[#163E6B] dark:bg-card border dark:border-border text-white rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A72C] rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-white dark:text-foreground">
            <BookOpen className="w-6 h-6 text-[#D4A72C]" />
            Sell Your Used Book
          </h3>
          <p className="text-white/80 dark:text-muted-foreground font-medium mb-2 text-base">
            Have books you no longer need? Sell them to fellow LoksewaAI students.
          </p>
          <p className="text-white/60 dark:text-muted-foreground/70 text-sm">
            List your used books and earn while helping another student. All student listings are reviewed by LoksewaAI before appearing in the marketplace.
          </p>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
          <Button asChild className="bg-[#D4A72C] hover:bg-[#c49a20] text-[#0A1118] font-bold text-base h-11 px-6 shadow-md w-full sm:w-auto">
            <Link href="/student/marketplace-listings">
              Sell a Book
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 dark:text-foreground dark:border-border dark:hover:bg-muted h-11 bg-transparent w-full sm:w-auto">
            <Link href="/student/marketplace-listings">
              Manage My Listings
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl shadow-sm border">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, courses, or materials..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-[350px] bg-muted animate-pulse rounded-xl border"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video w-full bg-muted relative">
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
                    <ShoppingBag className="h-10 w-10 opacity-50" />
                  </div>
                )}
                <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90">
                  {product.category.replace('_', ' ')}
                </Badge>
              </div>
              <CardHeader className="p-4 flex-grow space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{product.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex items-center justify-between">
                <div className="font-bold text-lg">
                      <span>Rs. {product.final_price}</span>
                      {product.discount_price && (
                        <span className="text-sm text-muted-foreground line-through ml-2 font-normal">
                          Rs. {product.price}
                        </span>
                      )}
                </div>
                <Button asChild size="sm">
                  <Link href={`/student/marketplace/${product.id}`}>
                    View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
