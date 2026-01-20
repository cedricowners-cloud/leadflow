"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Info,
} from "lucide-react";
import Link from "next/link";

interface UploadResult {
  success: boolean;
  data?: {
    batchId: string;
    totalCount: number;
    successCount: number;
    duplicateCount: number;
    errorCount: number;
    gradeSummary: Record<string, number>;
    errors: { row: number; message: string }[];
    duplicates: { row: number; phone: string }[];
    mappedColumns: string[];
    unmappedColumns: string[];
  };
  error?: string;
}

export default function LeadsUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && isValidFileType(file)) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFileType(file)) {
        setSelectedFile(file);
        setUploadResult(null);
      }
    },
    []
  );

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase();
    return (
      validTypes.includes(file.type) ||
      ["csv", "xlsx", "xls"].includes(extension || "")
    );
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/leads/upload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResult = await response.json();
      setUploadResult(result);

      if (!result.success) {
        console.error("Upload failed:", result.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResult({
        success: false,
        error: "업로드 중 오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <Header
        title="리드 업로드"
        description="CSV 또는 Excel 파일로 리드 데이터를 업로드합니다."
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 뒤로가기 */}
        <div>
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              리드 목록으로
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* 업로드 영역 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>파일 업로드</CardTitle>
                <CardDescription>
                  CSV, XLSX, XLS 형식의 파일을 업로드할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 드래그 앤 드롭 영역 */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-4">
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                          disabled={isUploading}
                        >
                          다른 파일 선택
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUpload}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              업로드
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">
                          파일을 드래그하여 놓거나
                        </p>
                        <p className="text-sm text-muted-foreground">
                          클릭하여 파일을 선택하세요
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-input"
                      />
                      <label htmlFor="file-input">
                        <Button variant="outline" asChild>
                          <span>파일 선택</span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        지원 형식: CSV, XLSX, XLS (최대 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* 업로드 결과 */}
                {uploadResult && (
                  <div className="space-y-4">
                    {uploadResult.success ? (
                      <>
                        <Alert>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-600">
                            업로드 완료
                          </AlertTitle>
                          <AlertDescription>
                            총 {uploadResult.data?.totalCount}건 중{" "}
                            {uploadResult.data?.successCount}건이 성공적으로
                            업로드되었습니다.
                          </AlertDescription>
                        </Alert>

                        {/* 등급별 분류 결과 */}
                        {uploadResult.data?.gradeSummary && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">
                                자동 등급 분류 결과
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(
                                  uploadResult.data.gradeSummary
                                ).map(([grade, count]) => (
                                  <Badge
                                    key={grade}
                                    variant="secondary"
                                    className="text-sm"
                                  >
                                    {grade}등급: {count}건 (
                                    {(
                                      (count /
                                        uploadResult.data!.successCount) *
                                      100
                                    ).toFixed(0)}
                                    %)
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* 컬럼 매핑 결과 */}
                        {((uploadResult.data?.mappedColumns?.length ?? 0) > 0 ||
                          (uploadResult.data?.unmappedColumns?.length ?? 0) > 0) && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">
                                <Info className="inline h-4 w-4 mr-2" />
                                CSV 컬럼 매핑 결과
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {(uploadResult.data?.mappedColumns?.length ?? 0) > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-green-600 mb-2">
                                    <CheckCircle className="inline h-4 w-4 mr-1" />
                                    매핑된 컬럼 ({uploadResult.data!.mappedColumns.length}개)
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {uploadResult.data!.mappedColumns.map((col) => (
                                      <Badge
                                        key={col}
                                        variant="outline"
                                        className="text-xs border-green-200 text-green-700"
                                      >
                                        {col}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {(uploadResult.data?.unmappedColumns?.length ?? 0) > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-yellow-600 mb-2">
                                    <AlertCircle className="inline h-4 w-4 mr-1" />
                                    매핑되지 않은 컬럼 ({uploadResult.data!.unmappedColumns.length}개)
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {uploadResult.data!.unmappedColumns.map((col) => (
                                      <Badge
                                        key={col}
                                        variant="outline"
                                        className="text-xs border-yellow-200 text-yellow-700"
                                      >
                                        {col}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    매핑되지 않은 컬럼은 시스템 설정 → CSV 매핑에서 추가할 수 있습니다.
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* 결과 요약 */}
                        <div className="grid grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-muted-foreground">
                                  성공
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-green-600">
                                {uploadResult.data?.successCount}건
                              </p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm text-muted-foreground">
                                  중복
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-yellow-600">
                                {uploadResult.data?.duplicateCount}건
                              </p>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm text-muted-foreground">
                                  오류
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-red-600">
                                {uploadResult.data?.errorCount}건
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* 중복 목록 */}
                        {uploadResult.data?.duplicates &&
                          uploadResult.data.duplicates.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base text-yellow-600">
                                  중복 제외된 항목
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>행 번호</TableHead>
                                      <TableHead>연락처</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {uploadResult.data.duplicates.map(
                                      (dup, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>{dup.row}</TableCell>
                                          <TableCell>{dup.phone}</TableCell>
                                        </TableRow>
                                      )
                                    )}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          )}

                        {/* 오류 목록 */}
                        {uploadResult.data?.errors &&
                          uploadResult.data.errors.length > 0 && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base text-red-600">
                                  오류 항목
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>행 번호</TableHead>
                                      <TableHead>오류 내용</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {uploadResult.data.errors.map(
                                      (err, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>{err.row}</TableCell>
                                          <TableCell>{err.message}</TableCell>
                                        </TableRow>
                                      )
                                    )}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          )}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={handleReset}>
                            추가 업로드
                          </Button>
                          <Link href="/leads">
                            <Button>리드 목록 보기</Button>
                          </Link>
                        </div>
                      </>
                    ) : (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>업로드 실패</AlertTitle>
                        <AlertDescription>
                          {uploadResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 안내 영역 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <Info className="inline h-4 w-4 mr-2" />
                  파일 형식 안내
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">지원 형식</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>CSV (.csv) - UTF-8, EUC-KR 인코딩</li>
                    <li>Excel (.xlsx)</li>
                    <li>Excel 97-2003 (.xls)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">필수 컬럼</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>연락처 (phone, 전화번호, 휴대폰)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">인식 가능한 컬럼</h4>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <div>
                      <p className="font-medium text-foreground mb-1">기본 정보</p>
                      <ul className="space-y-1 ml-3">
                        <li>대표자명: 이름, 대표자, 대표자명</li>
                        <li>업체명: 회사명, 기업명, 업체명</li>
                        <li>사업자유형: business_type, 법인/개인</li>
                        <li>업종: 업종명, 사업분야</li>
                        <li>연매출: 매출액, 연간매출 (억원 단위)</li>
                        <li>연매출 범위: annual_revenue_min, annual_revenue_max</li>
                        <li>종업원수: 직원수, 인원</li>
                        <li>종업원수 범위: employee_count_min, employee_count_max</li>
                        <li>지역: 주소, 위치</li>
                        <li>연락 가능 시간: available_time, 통화가능시간</li>
                        <li>체납 여부: tax_delinquency</li>
                        <li>신청일시: 등록일, 생성일, created_time</li>
                        <li>메모: 비고, 기타</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">Meta Ads 정보</p>
                      <ul className="space-y-1 ml-3">
                        <li>캠페인명: campaign_name, 캠페인</li>
                        <li>광고세트명: ad_set_name, adset_name</li>
                        <li>광고명: ad_name, 광고</li>
                        <li>Meta ID: id, meta_id</li>
                        <li>폼 ID: form_id</li>
                        <li>폼 이름: form_name</li>
                        <li>오가닉 여부: is_organic</li>
                        <li>플랫폼: platform (Facebook, Instagram 등)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  자동 등급 분류
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  업로드된 리드는 설정된 등급 규칙에 따라 자동으로 등급이
                  분류됩니다. 등급 규칙은 시스템 설정에서 관리할 수 있습니다.
                </p>
                <Link href="/settings/grades">
                  <Button variant="link" className="px-0 mt-2" size="sm">
                    등급 규칙 설정 바로가기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
