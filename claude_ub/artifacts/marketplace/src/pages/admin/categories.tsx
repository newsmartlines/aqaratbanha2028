import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Tag, Loader2, RefreshCw } from "lucide-react";
import { api, type Category, type Subcategory } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ICON_OPTIONS = ["Grid", "Utensils", "Wrench", "Package", "Sparkles", "Home", "Car", "Heart", "Star", "Tag", "ShoppingBag", "Camera", "Music", "Book", "Laptop", "Coffee"];

const emptyCat = { nameAr: "", nameEn: "", icon: "Grid", slug: "", description: "", image: "" };
const emptySub = { nameAr: "", nameEn: "", icon: "Tag", slug: "" };

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [catModal, setCatModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Partial<Category> }>({ open: false, mode: "add", data: emptyCat });
  const [subModal, setSubModal] = useState<{ open: boolean; mode: "add" | "edit"; categoryId: number; data: Partial<Subcategory> }>({ open: false, mode: "add", categoryId: 0, data: emptySub });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: number; name: string } | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const { data: categories = [], isLoading } = useQuery({ queryKey: ["categories"], queryFn: api.categories.list });
  const { data: allSubs = [] } = useQuery({ queryKey: ["subcategories"], queryFn: api.subcategories.list });

  const createCat = useMutation({
    mutationFn: (d: typeof emptyCat) => api.categories.create({ nameAr: d.nameAr, nameEn: d.nameEn, icon: d.icon, slug: d.slug, description: d.description, image: d.image }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast({ title: "Category added" }); setCatModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateCat = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<Category> }) => api.categories.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast({ title: "Category updated" }); setCatModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteCat = useMutation({
    mutationFn: (id: number) => api.categories.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); queryClient.invalidateQueries({ queryKey: ["subcategories"] }); toast({ title: "Category deleted" }); setDeleteTarget(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createSub = useMutation({
    mutationFn: ({ catId, d }: { catId: number; d: typeof emptySub }) => api.subcategories.create(catId, { nameAr: d.nameAr, nameEn: d.nameEn, icon: d.icon, slug: d.slug }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); toast({ title: "Subcategory added" }); setSubModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateSub = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<Subcategory> }) => api.subcategories.update(id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); toast({ title: "Subcategory updated" }); setSubModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteSub = useMutation({
    mutationFn: (id: number) => api.subcategories.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); toast({ title: "Subcategory deleted" }); setDeleteTarget(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openAddCat = () => setCatModal({ open: true, mode: "add", data: { ...emptyCat } });
  const openEditCat = (c: Category) => setCatModal({ open: true, mode: "edit", data: { ...c } });
  const openAddSub = (catId: number) => setSubModal({ open: true, mode: "add", categoryId: catId, data: { ...emptySub } });
  const openEditSub = (s: Subcategory) => setSubModal({ open: true, mode: "edit", categoryId: s.categoryId, data: { ...s } });

  const submitCat = () => {
    const d = catModal.data as typeof emptyCat;
    if (!d.nameAr || !d.nameEn || !d.slug) return toast({ title: "Fill all required fields", variant: "destructive" });
    if (catModal.mode === "add") createCat.mutate(d);
    else updateCat.mutate({ id: (catModal.data as Category).id, d });
  };
  const submitSub = () => {
    const d = subModal.data as typeof emptySub;
    if (!d.nameAr || !d.nameEn || !d.slug) return toast({ title: "Fill all required fields", variant: "destructive" });
    if (subModal.mode === "add") createSub.mutate({ catId: subModal.categoryId, d });
    else updateSub.mutate({ id: (subModal.data as Subcategory).id, d });
  };

  const toggleExpand = (id: number) => setExpandedCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const catSubs = (catId: number) => allSubs.filter(s => s.categoryId === catId);

  return (
    <AdminLayout title="Categories Management">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Service Categories</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{categories.length} categories · {allSubs.length} subcategories</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ["categories"] }); queryClient.invalidateQueries({ queryKey: ["subcategories"] }); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={openAddCat} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : (
            <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name (AR)</TableHead>
                    <TableHead>Name (EN)</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Subcategories</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => {
                    const subs = catSubs(c.id);
                    const expanded = expandedCats.has(c.id);
                    return (
                      <React.Fragment key={c.id}>
                        <TableRow className="cursor-pointer hover:bg-slate-50">
                          <TableCell>
                            <button onClick={() => toggleExpand(c.id)} className="text-slate-400 hover:text-slate-700">
                              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium" dir="rtl">{c.nameAr}</TableCell>
                          <TableCell>{c.nameEn}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{c.icon}</Badge></TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{c.slug}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{subs.length} subs</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openAddSub(c.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Sub
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditCat(c)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "category", id: c.id, name: c.nameEn })} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && subs.map(sub => (
                          <TableRow key={`sub-${sub.id}`} className="bg-slate-50/70 border-b border-dashed">
                            <TableCell></TableCell>
                            <TableCell className="pl-8" colSpan={1}>
                              <div className="flex items-center gap-2">
                                <Tag className="w-3 h-3 text-slate-400" />
                                <span className="text-sm" dir="rtl">{sub.nameAr}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{sub.nameEn}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{sub.icon}</Badge></TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">{sub.slug}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditSub(sub)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id, name: sub.nameEn })} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Modal */}
      <Dialog open={catModal.open} onOpenChange={o => setCatModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{catModal.mode === "add" ? "Add Category" : "Edit Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Arabic Name *</Label>
                <Input dir="rtl" value={catModal.data.nameAr ?? ""} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, nameAr: e.target.value } }))} placeholder="مثال: تصميم" />
              </div>
              <div className="space-y-1">
                <Label>English Name *</Label>
                <Input value={catModal.data.nameEn ?? ""} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, nameEn: e.target.value } }))} placeholder="e.g. Design" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input value={catModal.data.slug ?? ""} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, slug: e.target.value } }))} placeholder="e.g. design" />
              </div>
              <div className="space-y-1">
                <Label>Icon</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={catModal.data.icon ?? "Grid"} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, icon: e.target.value } }))}>
                  {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} value={catModal.data.description ?? ""} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} placeholder="Short description..." />
            </div>
            <div className="space-y-1">
              <Label>Image URL</Label>
              <Input value={catModal.data.image ?? ""} onChange={e => setCatModal(m => ({ ...m, data: { ...m.data, image: e.target.value } }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={submitCat} disabled={createCat.isPending || updateCat.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createCat.isPending || updateCat.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {catModal.mode === "add" ? "Add Category" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Modal */}
      <Dialog open={subModal.open} onOpenChange={o => setSubModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{subModal.mode === "add" ? "Add Subcategory" : "Edit Subcategory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Arabic Name *</Label>
                <Input dir="rtl" value={subModal.data.nameAr ?? ""} onChange={e => setSubModal(m => ({ ...m, data: { ...m.data, nameAr: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>English Name *</Label>
                <Input value={subModal.data.nameEn ?? ""} onChange={e => setSubModal(m => ({ ...m, data: { ...m.data, nameEn: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input value={subModal.data.slug ?? ""} onChange={e => setSubModal(m => ({ ...m, data: { ...m.data, slug: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>Icon</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={subModal.data.icon ?? "Tag"} onChange={e => setSubModal(m => ({ ...m, data: { ...m.data, icon: e.target.value } }))}>
                  {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={submitSub} disabled={createSub.isPending || updateSub.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createSub.isPending || updateSub.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {subModal.mode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>?
              {deleteTarget?.type === "category" && " This will also delete all subcategories."}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "category") deleteCat.mutate(deleteTarget.id);
                else deleteSub.mutate(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
