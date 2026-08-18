"use client";

import React, { useState } from "react";
import { 
  Plus, Search, MoreHorizontal, Edit, Copy, Eye, 
  EyeOff, Trash2, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProducts } from "@/lib/mock/admin-marketplace";

export default function MarketplaceProductsPage() {
  const [search, setSearch] = useState("");

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Published": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Draft": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Hidden": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Archived": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Button className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Product</TableHead>
                <TableHead>Type & Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-center">Purchases</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No products found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-semibold text-[#0B2545]">{product.name}</div>
                      <div className="text-xs text-slate-400 mt-1">Updated {new Date(product.updatedAt).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-700">{product.type}</span>
                      <div className="text-xs text-slate-500 mt-1">{product.category}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.discountPrice ? (
                          <>
                            <span className="font-bold text-emerald-600">Rs. {product.discountPrice}</span>
                            <span className="text-xs text-slate-400 line-through">Rs. {product.price}</span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-800">Rs. {product.price}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700">
                      {product.purchases.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#0B2545]">
                      Rs. {product.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" /> Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {product.status === "Published" ? (
                            <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600">
                              <EyeOff className="mr-2 h-4 w-4" /> Unpublish (Hide)
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600">
                              <Eye className="mr-2 h-4 w-4" /> Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
