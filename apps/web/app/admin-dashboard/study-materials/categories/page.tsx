"use client";

import React, { useEffect, useState } from "react";
import {
  Tag, Layers, Plus, Loader2, Trash2, Pencil, X, Search, FileText,
} from "lucide-react";
import {
  adminMaterialCategoryApi, adminMaterialCollectionApi, adminStudyMaterialApi,
  MaterialCategory, MaterialCollection, CollectionMaterial, StudyMaterialListItem,
} from "@/lib/api/admin-study-materials";
import toast from "react-hot-toast";

type Tab = "categories" | "collections";

const SWATCHES = ["#0B2545", "#D4A72C", "#10b981", "#6366f1", "#ef4444", "#f59e0b"];

export default function MaterialTaxonomyPage() {
  const [tab, setTab] = useState<Tab>("categories");

  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [collections, setCollections] = useState<MaterialCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create / edit form
  const [editing, setEditing] = useState<MaterialCategory | MaterialCollection | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [saving, setSaving] = useState(false);

  // Collection contents
  const [openCollection, setOpenCollection] = useState<MaterialCollection | null>(null);
  const [collectionMaterials, setCollectionMaterials] = useState<CollectionMaterial[]>([]);
  const [allMaterials, setAllMaterials] = useState<StudyMaterialListItem[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, cols] = await Promise.all([
        adminMaterialCategoryApi.list(search || undefined),
        adminMaterialCollectionApi.list(search || undefined),
      ]);
      setCategories(cats);
      setCollections(cols);
    } catch (error: any) {
      toast.error(error?.data?.error || "Could not load categories and collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCreate = () => {
    setEditing(null); setName(""); setDescription(""); setColor(SWATCHES[0]); setFormOpen(true);
  };

  const openEdit = (item: MaterialCategory | MaterialCollection) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || "");
    setColor(item.color || SWATCHES[0]);
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Give it a name"); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), color };
      const api = tab === "categories" ? adminMaterialCategoryApi : adminMaterialCollectionApi;
      if (editing) {
        await (api as any).update(editing.id, payload);
        toast.success("Saved");
      } else {
        await (api as any).create(payload);
        toast.success(tab === "categories" ? "Category created" : "Collection created");
      }
      setFormOpen(false);
      load();
    } catch (error: any) {
      // DRF returns {field: [msg]} for validation errors, e.g. a duplicate name.
      const data = error?.data;
      const msg = data?.error || data?.name?.[0] || error.message || "Could not save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: MaterialCategory | MaterialCollection) => {
    const what = tab === "categories" ? "category" : "collection";
    const extra = tab === "categories" && (item as MaterialCategory).material_count > 0
      ? ` ${(item as MaterialCategory).material_count} material(s) will lose this label, but the materials themselves stay.`
      : "";
    if (!confirm(`Delete the ${what} "${item.name}"?${extra}`)) return;
    try {
      const api = tab === "categories" ? adminMaterialCategoryApi : adminMaterialCollectionApi;
      await api.remove(item.id);
      toast.success(`${item.name} deleted`);
      load();
    } catch (error: any) {
      toast.error(error?.data?.error || "Could not delete");
    }
  };

  const openContents = async (collection: MaterialCollection) => {
    setOpenCollection(collection);
    setContentsLoading(true);
    try {
      const [inside, all] = await Promise.all([
        adminMaterialCollectionApi.materials(collection.id),
        adminStudyMaterialApi.list({ status: "all", pageSize: 200 }),
      ]);
      setCollectionMaterials(inside);
      setAllMaterials(all.materials || []);
    } catch (error: any) {
      toast.error("Could not load the collection contents");
    } finally {
      setContentsLoading(false);
    }
  };

  const addToCollection = async (materialId: number) => {
    if (!openCollection) return;
    try {
      const res = await adminMaterialCollectionApi.addMaterials(openCollection.id, [materialId]);
      toast.success(`Added · ${res.material_count} in this collection`);
      openContents(openCollection);
      load();
    } catch (error: any) {
      toast.error(error?.data?.error || "Could not add");
    }
  };

  const removeFromCollection = async (materialId: number) => {
    if (!openCollection) return;
    try {
      const res = await adminMaterialCollectionApi.removeMaterials(openCollection.id, [materialId]);
      toast.success(`Removed · ${res.material_count} left`);
      openContents(openCollection);
      load();
    } catch (error: any) {
      toast.error(error?.data?.error || "Could not remove");
    }
  };

  const insideIds = new Set(collectionMaterials.map(m => m.id));
  const items: (MaterialCategory | MaterialCollection)[] = tab === "categories" ? categories : collections;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2545]">Categories &amp; Collections</h1>
          <p className="text-slate-500 text-sm mt-1">
            Categories label a material; collections bundle several together.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#D4A72C] hover:bg-[#C49B1F] text-[#0B2545] rounded-lg font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New {tab === "categories" ? "Category" : "Collection"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {([
          { key: "categories", label: "Categories", icon: Tag, count: categories.length },
          { key: "collections", label: "Collections", icon: Layers, count: collections.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-[#D4A72C] text-[#0B2545]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="font-semibold text-slate-700">
            No {tab} yet{search ? " matching that search" : ""}.
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {tab === "categories"
              ? "Categories let you label materials beyond the syllabus hierarchy."
              : "Collections bundle related materials into a single pack."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: item.color || "#0B2545" }}
                >
                  {item.name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0B2545] truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.material_count} material{item.material_count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{item.description}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                {tab === "collections" && (
                  <button
                    onClick={() => openContents(item as MaterialCollection)}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Materials
                  </button>
                )}
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => remove(item)}
                  className="ml-auto p-1.5 text-slate-400 hover:text-red-500 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#0B2545]">
                {editing ? "Edit" : "New"} {tab === "categories" ? "Category" : "Collection"}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} className="p-1.5 hover:bg-slate-100 rounded">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tab === "categories" ? "e.g. Current Affairs" : "e.g. Kharidar Revision Pack"}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Colour</label>
              <div className="flex gap-2">
                {SWATCHES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""
                    }`}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Save changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection contents */}
      {openCollection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[#0B2545]">{openCollection.name}</h2>
                <p className="text-sm text-slate-500">{collectionMaterials.length} material(s) in this collection</p>
              </div>
              <button onClick={() => setOpenCollection(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {contentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0B2545]" />
                </div>
              ) : allMaterials.length === 0 ? (
                <p className="text-center text-slate-500 py-10">
                  There are no study materials yet to put in a collection.
                </p>
              ) : (
                <div className="space-y-2">
                  {allMaterials.map(m => {
                    const inside = insideIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          inside ? "bg-emerald-50/50 border-emerald-100" : "border-slate-200"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{m.title}</p>
                          <p className="text-xs text-slate-500">
                            {m.subject} · {m.materialType} · {m.status}
                          </p>
                        </div>
                        {inside ? (
                          <button
                            onClick={() => removeFromCollection(m.id)}
                            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-white text-slate-700 shrink-0"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={() => addToCollection(m.id)}
                            className="px-3 py-1.5 text-sm bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg shrink-0"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
