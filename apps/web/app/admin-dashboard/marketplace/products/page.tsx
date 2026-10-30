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
  "NEW_BOOK", "USED_BOOK", "REFERENCE_BOOK", "GUIDE_BOOK", "GENERAL_KNOWLEDGE", "CONSTITUTION_LAW", "CURRENT_AFFAIRS", "STATIONERY"
];

interface ProductFormState {
  title: string;
  description: string;
  category: string;
  target_position: string;
  price: string;
  discount_price: string;
  is_published: boolean;
  features: string;
  cover_image: File | null;
  extra_images: File[];
  stock: string;
  condition: string;
  author: string;
  publisher: string;
  isbn: string;
  edition: string;
  published_date: string;
  total_pages: string;
  delivery_fee: string;
  location: string;
}

const EMPTY_FORM: ProductFormState = {
  title: "", description: "", category: "NEW_BOOK", target_position: "",
  price: "0", discount_price: "", is_published: false,
  features: "", cover_image: null, extra_images: [],
  stock: "1", condition: "NEW", author: "", publisher: "", isbn: "", edition: "",
  published_date: "", total_pages: "", delivery_fee: "0", location: ""
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
      is_published: product.is_published,
      features: (product.features || []).join("\n"),
      cover_image: null,
      extra_images: [],
      stock: product.stock !== undefined ? String(product.stock) : "1",
      condition: product.condition || "NEW",
      author: product.author || "",
      publisher: product.publisher || "",
      isbn: product.isbn || "",
      edition: product.edition || "",
      published_date: product.published_date || "",
      total_pages: product.total_pages !== undefined && product.total_pages !== null ? String(product.total_pages) : "",
      delivery_fee: product.delivery_fee !== undefined && product.delivery_fee !== null ? String(product.delivery_fee) : "0",
      location: product.location || "",
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
      is_published: false,
      features: (product.features || []).join("\n"),
      cover_image: null,
      extra_images: [],
      stock: product.stock !== undefined ? String(product.stock) : "1",
      condition: product.condition || "NEW",
      author: product.author || "",
      publisher: product.publisher || "",
      isbn: product.isbn || "",
      edition: product.edition || "",
      published_date: product.published_date || "",
      total_pages: product.total_pages !== undefined && product.total_pages !== null ? String(product.total_pages) : "",
      delivery_fee: product.delivery_fee !== undefined && product.delivery_fee !== null ? String(product.delivery_fee) : "0",
      location: product.location || "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!editingProduct) return;
    try {
      const updated = await marketplaceApi.adminDeleteProductImage(editingProduct.id, imageId);
      setEditingProduct(updated);
      toast.success("Image removed.");
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove image");
    }
  };

  const handleSetPrimaryExistingImage = async (imageId: number) => {
    if (!editingProduct) return;
    try {
      const updated = await marketplaceApi.adminSetPrimaryProductImage(editingProduct.id, imageId);
      setEditingProduct(updated);
      toast.success("Cover image updated.");
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to set primary image");
    }
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
      data.append("is_published", String(form.is_published));
      data.append("listing_status", form.is_published ? "ACTIVE" : "DRAFT");
      data.append("stock", form.stock);
      if (form.condition) data.append("condition", form.condition);
      if (form.author) data.append("author", form.author);
      if (form.publisher) data.append("publisher", form.publisher);
      if (form.isbn) data.append("isbn", form.isbn);
      if (form.edition) data.append("edition", form.edition);
      if (form.published_date) data.append("published_date", form.published_date);
      if (form.total_pages) {
        data.append("total_pages", form.total_pages);
      } else if (editingProduct) {
        data.append("total_pages", "");
      }
      if (form.delivery_fee !== undefined && form.delivery_fee !== "") {
        if (Number(form.delivery_fee) < 0) {
          setFormError("Delivery fee cannot be negative.");
          setSubmitting(false);
          return;
        }
        data.append("delivery_fee", form.delivery_fee);
      }
      if (form.location) data.append("location", form.location);
      data.append(
        "features",
        JSON.stringify(form.features.split("\n").map(f => f.trim()).filter(Boolean))
      );
      if (form.cover_image) data.append("cover_image", form.cover_image);
      if (form.extra_images && form.extra_images.length > 0) {
        form.extra_images.forEach(img => {
          data.append("images", img);
        });
      }

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
      const nextPublished = !product.is_published;
      await marketplaceApi.adminUpdateProduct(product.id, {
        is_published: nextPublished,
        listing_status: nextPublished ? "ACTIVE" : "DRAFT",
      });
      toast.success(nextPublished ? "Product published." : "Product unpublished.");
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
                        {product.discount_price ? (
                          <>
                            <span className="font-bold text-emerald-600">Rs. {product.final_price}</span>
                            <span className="text-xs text-slate-400 line-through">Rs. {product.price}</span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-800">Rs. {product.price}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {Number(product.delivery_fee) > 0 ? (
                          <span>Delivery: Rs. {product.delivery_fee}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Free Delivery</span>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Price (Rs.)</label>
                  <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Discount Price (Rs.)</label>
                  <Input type="number" min="0" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Delivery Fee (Rs.)</label>
                  <Input type="number" min="0" step="any" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="flex gap-6">

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Stock</label>
                  <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Condition</label>
                  <select
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  >
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Author</label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Publisher</label>
                  <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">ISBN</label>
                  <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Edition</label>
                  <Input value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Published Date (optional)</label>
                  <Input
                    value={form.published_date}
                    onChange={(e) => setForm({ ...form, published_date: e.target.value })}
                    placeholder="e.g. 2081 B.S. or 2024"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Total Pages (optional)</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.total_pages}
                    onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                    placeholder="e.g. 450"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Location</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Product Images</label>
                
                {/* Existing Gallery Images */}
                {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-500 font-medium">Existing Images:</span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {editingProduct.images.map((img) => (
                        <div key={img.id} className="relative group rounded border border-slate-200 overflow-hidden bg-slate-50 aspect-square">
                          <RetryImage src={img.image} alt={img.label} className="w-full h-full object-cover" />
                          {img.is_primary && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1 rounded shadow">
                              Cover
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity p-1">
                            {!img.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryExistingImage(img.id)}
                                className="text-[10px] bg-white text-slate-900 font-bold px-1.5 py-0.5 rounded hover:bg-slate-100 w-full truncate"
                              >
                                Set Cover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(img.id)}
                              className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded hover:bg-red-700 w-full"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy single cover preview if no gallery images */}
                {editingProduct?.cover_image && (!editingProduct.images || editingProduct.images.length === 0) && (
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded border">
                    <RetryImage src={editingProduct.cover_image} alt="Cover" className="w-12 h-12 object-cover rounded border border-slate-200" />
                    <span className="text-xs text-slate-500">Current Cover Image</span>
                  </div>
                )}

                {/* Primary Cover Image File */}
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 font-medium">Primary / Main Cover Image:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="border border-dashed border-slate-300 rounded-md h-10 flex items-center justify-center gap-2 text-sm text-slate-500 hover:bg-slate-50">
                        <Upload className="w-4 h-4" />
                        {form.cover_image ? form.cover_image.name : "Select Primary Cover Image"}
                      </div>
                      <input
                        type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => setForm({ ...form, cover_image: e.target.files?.[0] || null })}
                      />
                    </label>
                    {form.cover_image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm({ ...form, cover_image: null })}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Additional Images Upload with Previews */}
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-600 font-medium">Upload Additional Images:</span>
                  <label className="block cursor-pointer">
                    <div className="border border-dashed border-blue-300 bg-blue-50/30 rounded-md h-10 flex items-center justify-center gap-2 text-sm text-blue-700 hover:bg-blue-50">
                      <Upload className="w-4 h-4" />
                      <span>Choose multiple images to add</span>
                    </div>
                    <input
                      type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []);
                        setForm({ ...form, extra_images: [...form.extra_images, ...newFiles] });
                      }}
                    />
                  </label>

                  {/* Previews of newly selected extra images */}
                  {form.extra_images.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500">Selected new images ({form.extra_images.length}):</span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {form.extra_images.map((file, idx) => (
                          <div key={idx} className="relative group rounded border border-blue-200 overflow-hidden bg-slate-50 aspect-square">
                            <img
                              src={URL.createObjectURL(file)}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = form.extra_images.filter((_, i) => i !== idx);
                                setForm({ ...form, extra_images: updated });
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 truncate text-center">
                              {file.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
