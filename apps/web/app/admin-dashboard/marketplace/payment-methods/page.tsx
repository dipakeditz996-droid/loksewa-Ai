// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, Image as ImageIcon, QrCode, Smartphone, 
  Upload, Save, Eye, GripVertical, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { marketplaceApi, PaymentMethod } from "@/lib/api/marketplace";
import { toast } from "sonner";

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyMethods, setDirtyMethods] = useState<Record<number, Partial<PaymentMethod>>>({});

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const data = await marketplaceApi.adminGetPaymentMethods();
      setMethods(data);
      setDirtyMethods({});
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    setMethods(methods.map(m => 
      m.id === id ? { ...m, is_active: !m.is_active } : m
    ));
    setDirtyMethods(prev => ({
      ...prev,
      [id]: { ...prev[id], is_active: !methods.find(m => m.id === id)?.is_active }
    }));
  };

  const handleChange = (id: number, field: keyof PaymentMethod, value: string) => {
    setMethods(methods.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
    setDirtyMethods(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async () => {
    const idsToUpdate = Object.keys(dirtyMethods).map(Number);
    if (idsToUpdate.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      for (const id of idsToUpdate) {
        await marketplaceApi.adminUpdatePaymentMethod(id, dirtyMethods[id]);
      }
      toast.success("Payment methods updated successfully");
      await fetchMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment methods");
    } finally {
      setSaving(false);
    }
  };

  const renderConfigForm = (method: PaymentMethod) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Display Name</label>
            <Input 
              value={method.display_name} 
              onChange={(e) => handleChange(method.id, 'display_name', e.target.value)}
              className="bg-slate-50" 
            />
          </div>
          
          {method.method_type === "BANK" ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Bank Name</label>
                <Input 
                  value={method.bank_name || ''} 
                  onChange={(e) => handleChange(method.id, 'bank_name', e.target.value)}
                  className="bg-slate-50" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Account Name</label>
                  <Input 
                    value={method.account_name || ''} 
                    onChange={(e) => handleChange(method.id, 'account_name', e.target.value)}
                    className="bg-slate-50" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Account Number</label>
                  <Input 
                    value={method.account_number || ''} 
                    onChange={(e) => handleChange(method.id, 'account_number', e.target.value)}
                    className="bg-slate-50" 
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Merchant Name</label>
                <Input 
                  value={method.account_name || ''} 
                  onChange={(e) => handleChange(method.id, 'account_name', e.target.value)}
                  className="bg-slate-50" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Phone / ID</label>
                <Input 
                  value={method.account_number || ''} 
                  onChange={(e) => handleChange(method.id, 'account_number', e.target.value)}
                  className="bg-slate-50" 
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Payment Instructions (Shown to student)</label>
            <Textarea 
              value={method.instructions || ''} 
              onChange={(e) => handleChange(method.id, 'instructions', e.target.value)}
              className="resize-none bg-slate-50 h-24" 
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex justify-between">
            Payment QR Code
            <span className="text-xs font-normal text-slate-400">Recommended: Square image</span>
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[200px]">
            {method.qr_image ? (
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-white rounded-lg p-2 border border-slate-200 shadow-sm mb-3">
                  <img src={method.qr_image} alt="QR Code" className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-white h-8 text-xs">
                    <Upload className="w-3 h-3 mr-1" /> Replace (API support needed for files)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                  <QrCode className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">Upload QR Image</p>
                <p className="text-xs text-slate-500 mb-3 mt-1">JPG, PNG up to 2MB</p>
                <Button variant="outline" size="sm" className="bg-white h-8 text-xs">
                  <Upload className="w-3 h-3 mr-1" /> Browse Files
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "ESEWA": return <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center"><Smartphone className="w-4 h-4 text-green-600" /></div>;
      case "KHALTI": return <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center"><Smartphone className="w-4 h-4 text-purple-600" /></div>;
      case "BANK": return <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600" /></div>;
      default: return <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-slate-600" /></div>;
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading payment methods...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Payment Methods</h2>
          <p className="text-sm text-slate-500">Configure manual payment options shown to students during checkout.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto bg-white gap-2">
            <Eye className="w-4 h-4 text-blue-600" /> Preview Checkout
          </Button>
          <Button 
            className="w-full sm:w-auto bg-[#0B2545] hover:bg-[#0B2545]/90 text-white gap-2"
            onClick={handleSave}
            disabled={saving || Object.keys(dirtyMethods).length === 0}
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex gap-3">
        <ImageIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Important: Secure your credentials.</p>
          <p>This page configures the <strong>public-facing</strong> payment instructions and QR codes that students will see. Do not place any secret API keys or passwords in these fields.</p>
        </div>
      </div>

      <div className="space-y-4">
        {methods.map((method) => (
          <div key={method.id} className={`bg-white rounded-xl shadow-sm border transition-colors ${method.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
            <div className="p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="cursor-grab hover:bg-slate-100 p-1 rounded">
                    <GripVertical className="w-5 h-5 text-slate-400" />
                  </div>
                  {getProviderIcon(method.method_type)}
                  <div>
                    <h3 className="font-bold text-[#0B2545]">{method.display_name}</h3>
                    <p className="text-xs text-slate-500">
                      {method.is_active ? 'Students can pay using this method.' : 'This method is currently hidden.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${method.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Switch 
                    checked={method.is_active} 
                    onCheckedChange={() => handleToggle(method.id)} 
                  />
                </div>
              </div>

              {renderConfigForm(method)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
