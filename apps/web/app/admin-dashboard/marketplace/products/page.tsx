"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Search, MoreHorizontal, Edit, Copy, Eye,
  EyeOff, Trash2, Package, X, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { marketplaceApi, Product } from "@/lib/api/marketplace";
import { RetryImage } from "@/components/ui/retry-image";
import { toast } from "sonner";

const CATEGORIES = [
  "PDF", "STUDY_MATERIAL", "QUESTION_COLLECTION", "QUESTION_SET", "VIDEO", "COURSE", "BUNDLE",
];

interface ProductFormState {
  title: string;
  description: string;
  category: string;
  target_position: string;
  price: string;
  discount_price: string;
  is_free: boolean;
  is_published: boolean;
  features: string;
  cover_image: File | null;
}

const EMPTY_FORM: ProductFormState = {
  title: "", description: "", category: "PDF", target_position: "",
  price: "0", discount_price: "", is_free: false, is_published: false,
  features: "", cover_image: null,
};

export default function MarketplaceProductsPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      const data = await marketplaceApi.adminGetProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (isPublished: boolean) => {
    return isPublished ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200";
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      category: product.category,
      target_position: product.target_position,
      price: product.price,
      discount_price: product.discount_price || "",
      is_free: product.is_free,
      is_published: product.is_published,
      features: (product.features || []).join("\n"),
      cover_image: null,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const openDuplicateDialog = (product: Product) => {
    setEditingProduct(null);
    setForm({
      title: `${product.title} (Copy)`,
      description: product.description,
      category: product.category,
      target_position: product.target_position,
      price: product.price,
      discount_price: product.discount_price || "",
      is_free: product.is_free,
      is_published: false,
      features: (product.features || []).join("\n"),
      cover_image: null,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("category", form.category);
      data.append("target_position", form.target_position);
      data.append("price", form.price || "0");
      if (form.discount_price) data.append("discount_price", form.discount_price);
      data.append("is_free", String(form.is_free));
      data.append("is_published", String(form.is_published));
      data.append(
        "features",
        JSON.stringify(form.features.split("\n").map(f => f.trim()).filter(Boolean))
      );
      if (form.cover_image) data.append("cover_image", form.cover_image);

      if (editingProduct) {
        await marketplaceApi.adminUpdateProduct(editingProduct.id, data);
        toast.success("Product updated.");
      } else {
        await marketplaceApi.adminCreateProduct(data);
        toast.success("Product created.");
      }
      setDialogOpen(false);
      await fetchProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (product: Product) => {
    setBusyId(product.id);
    try {
      await marketplaceApi.adminUpdateProduct(product.id, { is_published: !product.is_published });
      toast.success(product.is_published ? "Product unpublished." : "Product published.");
      await fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await marketplaceApi.adminDeleteProduct(deleteTarget.id);
      toast.success("Product deleted.");
      setDeleteTarget(null);
      await fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete product. It may have existing orders.");
    } finally {
      setBusyId(null);
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
        <Button className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2" onClick={openCreateDialog}>
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>No products found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-semibold text-[#0B2545]">{product.title}</div>
                      <div className="text-xs text-slate-400 mt-1">Updated {new Date(product.updated_at).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700">{product.category}</div>
                      <div className="text-xs text-slate-500 mt-1">For: {product.target_position || "Any"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.is_free ? (
                          <span className="font-bold text-emerald-600">Free</span>
                        ) : product.discount_price ? (
                          <>
                            <span className="font-bold text-emerald-600">Rs. {product.final_price}</span>
                            <span className="text-xs text-slate-400 line-through">Rs. {product.price}</span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-800">Rs. {product.price}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(product.is_published)}`}>
                        {product.is_published ? "Published" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-[#0B2545]" disabled={busyId === product.id}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(product)}>
                            <Eye className="mr-2 h-4 w-4" /> View / Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openDuplicateDialog(product)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {product.is_published ? (
                            <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600" onClick={() => handleTogglePublish(product)}>
                              <EyeOff className="mr-2 h-4 w-4" /> Unpublish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600" onClick={() => handleTogglePublish(product)}>
                              <Eye className="mr-2 h-4 w-4" /> Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(product)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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

      {/* Create / Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-[#0B2545]">{editingProduct ? "Edit Product" : "Add Product"}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setDialogOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{formError}</div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Title *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="resize-none h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Target Position</label>
                  <Input value={form.target_position} onChange={(e) => setForm({ ...form, target_position: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Price (Rs.)</label>
                  <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={form.is_free} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Discount Price (Rs.)</label>
                  <Input type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} disabled={form.is_free} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="w-4 h-4 rounded" />
                  Free product
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="w-4 h-4 rounded" />
                  Published
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Features (one per line)</label>
                <Textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="resize-none h-20"
                  placeholder={"500+ practice questions\nDetailed explanations"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Cover Image</label>
                <div className="flex items-center gap-3">
                  {editingProduct?.cover_image && !form.cover_image && (
                    <RetryImage src={editingProduct.cover_image} alt="Cover" className="w-14 h-14 object-cover rounded border border-slate-200" />
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="border border-dashed border-slate-300 rounded-md h-10 flex items-center justify-center gap-2 text-sm text-slate-500 hover:bg-slate-50">
                      <Upload className="w-4 h-4" />
                      {form.cover_image ? form.cover_image.name : "Choose image"}
                    </div>
                    <input
                      type="file" accept="image/png,image/jpeg" className="hidden"
                      onChange={(e) => setForm({ ...form, cover_image: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 sticky bottom-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button className="bg-[#0B2545] hover:bg-[#0B2545]/90 text-white" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-3">
              <h3 className="font-bold text-red-700">Delete Product</h3>
              <p className="text-sm text-slate-600">
                Delete &quot;{deleteTarget.title}&quot;? This cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busyId === deleteTarget.id}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={busyId === deleteTarget.id}>
                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
