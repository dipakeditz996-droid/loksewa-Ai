"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, Product } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Search, ShoppingBag, Filter } from "lucide-react";
import Link from "next/link";
import { RetryNextImage as Image } from "@/components/ui/retry-next-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("ALL");

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
    
    let matchesPrice = true;
    if (priceFilter === "FREE") matchesPrice = p.is_free;
    if (priceFilter === "PAID") matchesPrice = !p.is_free;

    return matchesSearch && matchesPrice;
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
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Price Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Products</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="PAID">Premium (Paid)</SelectItem>
          </SelectContent>
        </Select>
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
                  {product.is_free ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    <>
                      <span>Rs. {product.final_price}</span>
                      {product.discount_price && (
                        <span className="text-sm text-muted-foreground line-through ml-2 font-normal">
                          Rs. {product.price}
                        </span>
                      )}
                    </>
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
