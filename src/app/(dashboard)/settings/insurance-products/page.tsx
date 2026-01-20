"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Building2,
  Percent,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Types
interface InsuranceProduct {
  id: string;
  name: string;
  company: string | null;
  insurer_commission_rate: number; // 보험사 수수료율 (예: 1.5 = 150%)
  adjustment_rate: number; // 회사 조정률 (예: 1.0 = 100%)
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  company: string;
  insurer_commission_rate: number; // UI에서는 % 단위로 표시 (예: 150)
  adjustment_rate: number; // UI에서는 % 단위로 표시 (예: 100)
  description: string;
}

// Constants
const initialFormData: ProductFormData = {
  name: "",
  company: "",
  insurer_commission_rate: 100, // 기본값 100%
  adjustment_rate: 100, // 기본값 100%
  description: "",
};

export default function InsuranceProductsPage() {
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InsuranceProduct | null>(
    null
  );
  const [deletingProduct, setDeletingProduct] =
    useState<InsuranceProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/insurance-products");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setProducts(result.data);
    } catch (error) {
      toast.error("보험 상품 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Dialog handlers
  const openDialog = (product?: InsuranceProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        company: product.company || "",
        insurer_commission_rate: product.insurer_commission_rate * 100, // 1.5 -> 150
        adjustment_rate: product.adjustment_rate * 100, // 1.0 -> 100
        description: product.description || "",
      });
    } else {
      setEditingProduct(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingProduct
        ? `/api/insurance-products/${editingProduct.id}`
        : "/api/insurance-products";
      const method = editingProduct ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company || null,
          insurer_commission_rate: formData.insurer_commission_rate / 100, // 150 -> 1.5
          adjustment_rate: formData.adjustment_rate / 100, // 100 -> 1.0
          description: formData.description || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(
        editingProduct
          ? "보험 상품이 수정되었습니다"
          : "보험 상품이 등록되었습니다"
      );
      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/insurance-products/${deletingProduct.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("보험 상품이 삭제되었습니다");
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Format commission rate for display
  const formatCommissionRate = (rate: number) => {
    return `${(rate * 100).toFixed(0)}%`;
  };

  // Calculate effective rate
  const getEffectiveRate = (insurerRate: number, adjustmentRate: number) => {
    return insurerRate * adjustmentRate;
  };

  return (
    <>
      <Header title="보험 상품 관리" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                보험 상품 목록
              </CardTitle>
              <CardDescription>
                실적 입력 시 사용되는 보험 상품과 수수료율을 관리합니다. 월납
                금액 입력 시 수수료가 자동 계산됩니다.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              상품 추가
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                로딩 중...
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p>등록된 보험 상품이 없습니다</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => openDialog()}
                >
                  첫 번째 상품 추가하기
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상품명</TableHead>
                    <TableHead>보험사</TableHead>
                    <TableHead className="text-right">
                      보험사 수수료율
                    </TableHead>
                    <TableHead className="text-right">조정률</TableHead>
                    <TableHead className="text-right">CMP</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {product.company ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {product.company}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-blue-600">
                          {formatCommissionRate(
                            product.insurer_commission_rate
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-orange-600">
                          {formatCommissionRate(product.adjustment_rate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-primary">
                          {formatCommissionRate(
                            getEffectiveRate(
                              product.insurer_commission_rate,
                              product.adjustment_rate
                            )
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {product.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingProduct(product);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 수수료 계산 예시 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" />
              수수료 계산 예시
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground mb-1">계산 공식</p>
                <p className="bg-muted p-2 rounded font-mono text-xs">
                  수수료 = 월납 금액 ×{" "}
                  <span className="text-blue-600">보험사 수수료율</span> ×{" "}
                  <span className="text-orange-600">회사 조정률</span>
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="font-medium text-foreground">예시</p>
                <div className="space-y-1">
                  <p>
                    • 월납 100만원 × <span className="text-blue-600">150%</span>{" "}
                    × <span className="text-orange-600">100%</span> ={" "}
                    <span className="font-medium text-foreground">
                      1,500,000원
                    </span>
                  </p>
                  <p>
                    • 월납 50만원 × <span className="text-blue-600">120%</span>{" "}
                    × <span className="text-orange-600">80%</span> ={" "}
                    <span className="font-medium text-foreground">
                      480,000원
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-xs">
                <p>
                  <span className="text-blue-600">● 보험사 수수료율</span>:
                  보험사에서 제공하는 수수료 환산율
                </p>
                <p>
                  <span className="text-orange-600">● 회사 조정률</span>: 급여
                  계산 시 적용하는 회사 조정률
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "보험 상품 수정" : "새 보험 상품 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "보험 상품 정보를 수정합니다."
                : "새로운 보험 상품을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  상품명 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="예: 삼성생명 종신보험"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">보험사</Label>
                <Input
                  id="company"
                  placeholder="예: 삼성생명"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurer_commission_rate">
                    보험사 수수료율 (%){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="insurer_commission_rate"
                      type="number"
                      step="1"
                      min="0"
                      max="1000"
                      placeholder="예: 150"
                      value={formData.insurer_commission_rate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insurer_commission_rate:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    보험사 제공 환산율
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustment_rate">
                    회사 조정률 (%) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="adjustment_rate"
                      type="number"
                      step="1"
                      min="0"
                      max="200"
                      placeholder="예: 100"
                      value={formData.adjustment_rate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          adjustment_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    급여 계산 시 적용
                  </p>
                </div>
              </div>
              {formData.insurer_commission_rate > 0 &&
                formData.adjustment_rate > 0 && (
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      실효 수수료율:{" "}
                      <span className="font-medium text-foreground">
                        {(
                          (formData.insurer_commission_rate *
                            formData.adjustment_rate) /
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      월납 100만원 기준 수수료:{" "}
                      <span className="font-medium text-foreground">
                        {(
                          1000000 *
                          (formData.insurer_commission_rate / 100) *
                          (formData.adjustment_rate / 100)
                        ).toLocaleString()}
                        원
                      </span>
                    </p>
                  </div>
                )}
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  placeholder="상품에 대한 간단한 설명"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장 중..." : editingProduct ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>보험 상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{deletingProduct?.name}&quot; 상품을
              삭제하시겠습니까? 해당 상품을 사용하는 실적이 있으면 삭제할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
