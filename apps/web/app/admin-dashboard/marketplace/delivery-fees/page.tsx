"use client";

import React, { useEffect, useState } from "react";
import { marketplaceApi, DeliveryFeeRule } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

export default function AdminDeliveryFeesPage() {
  const [rules, setRules] = useState<DeliveryFeeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryFeeRule | null>(null);

  const [formData, setFormData] = useState<Partial<DeliveryFeeRule>>({
    name: "",
    province: "",
    district: "",
    municipality: "",
    fee: "",
    priority: 1,
    is_active: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await marketplaceApi.adminGetDeliveryFeeRules();
      setRules(data);
    } catch (error) {
      toast.error("Failed to fetch delivery fee rules");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule?: DeliveryFeeRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        province: rule.province || "",
        district: rule.district || "",
        municipality: rule.municipality || "",
        fee: rule.fee,
        priority: rule.priority,
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        province: "",
        district: "",
        municipality: "",
        fee: "",
        priority: 1,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await marketplaceApi.adminUpdateDeliveryFeeRule(editingRule.id, formData);
        toast.success("Rule updated successfully");
      } else {
        await marketplaceApi.adminCreateDeliveryFeeRule(formData);
        toast.success("Rule created successfully");
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (error: any) {
      toast.error(error.message || "Failed to save rule");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      await marketplaceApi.adminDeleteDeliveryFeeRule(id);
      toast.success("Rule deleted");
      fetchRules();
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const toggleActive = async (rule: DeliveryFeeRule) => {
    try {
      await marketplaceApi.adminUpdateDeliveryFeeRule(rule.id, { is_active: !rule.is_active });
      toast.success("Status updated");
      fetchRules();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Delivery Fee Engine</h2>
          <p className="text-muted-foreground mt-1">Configure hierarchical rules for dynamic delivery fee calculation.</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" /> Add Rule</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Fee Rules</CardTitle>
          <CardDescription>
            Rules are evaluated based on their Priority (highest number wins). 
            If a student's address matches the rule's criteria (Province, District, Municipality), that fee applies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rules configured yet. The default delivery fee will fall back to Rs. 0 or 100 on the frontend if missing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Criteria (Prov/Dist/Mun)</TableHead>
                  <TableHead>Fee (Rs.)</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.sort((a, b) => b.priority - a.priority).map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono">{rule.priority}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div><span className="text-muted-foreground">P:</span> {rule.province || "Any"}</div>
                        <div><span className="text-muted-foreground">D:</span> {rule.district || "Any"}</div>
                        <div><span className="text-muted-foreground">M:</span> {rule.municipality || "Any"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">Rs. {rule.fee}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={rule.is_active} 
                        onCheckedChange={() => toggleActive(rule)} 
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Delivery Fee Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input 
                required 
                placeholder="e.g. Inside Kathmandu Valley" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Province (Optional)</Label>
                <Input 
                  placeholder="e.g. Bagmati" 
                  value={formData.province} 
                  onChange={(e) => setFormData({...formData, province: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>District (Optional)</Label>
                <Input 
                  placeholder="e.g. Kathmandu" 
                  value={formData.district} 
                  onChange={(e) => setFormData({...formData, district: e.target.value})} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Municipality (Optional)</Label>
              <Input 
                placeholder="e.g. Kathmandu Metropolitan City" 
                value={formData.municipality} 
                onChange={(e) => setFormData({...formData, municipality: e.target.value})} 
              />
              <p className="text-xs text-muted-foreground">Leave fields blank to match "Any".</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee (Rs.) *</Label>
                <Input 
                  required 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fee} 
                  onChange={(e) => setFormData({...formData, fee: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Input 
                  required 
                  type="number"
                  min="1"
                  value={formData.priority} 
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})} 
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              A higher priority rule will override a lower priority rule if both match the delivery address.
            </p>

            <Button type="submit" className="w-full">
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
