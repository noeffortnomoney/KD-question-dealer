"use client";

import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/Pagination";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/pagination";

interface PreviewRow {
  row: number;
  code: string;
  dealerName: string;
  userName: string;
  email: string;
  phone: string;
  region: string;
  hasTempPassword: boolean;
  status: "valid" | "error";
  errors: { column: string; message: string }[];
}

interface Preview {
  jobId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: PreviewRow[];
}

interface CommitResult {
  created: number;
  skipped: { row: number; code: string; reason: string }[];
  credentials: { code: string; email: string; tempPassword: string }[];
}

function downloadCsv(rows: CommitResult["credentials"]) {
  const lines = ["Mã đại lý,Email,Mật khẩu tạm", ...rows.map((r) => `${r.code},${r.email},${r.tempPassword}`)];
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mat-khau-tam-dai-ly.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tableSize, setTableSize] = useState(DEFAULT_PAGE_SIZE);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);

  const step = result ? 3 : preview ? 2 : 1;

  const upload = async () => {
    if (!file) return;
    setBusy("preview");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/admin/dealers/import/preview", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data as Preview);
      setTablePage(1);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Không đọc được file");
    }
    setBusy(null);
  };

  const commit = async () => {
    if (!preview) return;
    setBusy("commit");
    try {
      const res = await fetch("/api/admin/dealers/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: preview.jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data as CommitResult);
      toast.success(`Đã tạo ${data.created} đại lý`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Import thất bại");
    }
    setBusy(null);
  };

  const restart = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const filteredRows = preview?.preview.filter((r) => !onlyErrors || r.status === "error") ?? [];
  const pageData = paginate(filteredRows, tablePage, tableSize);
  const rows = pageData.items;

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {["Chọn file", "Xem trước & kiểm tra", "Hoàn tất"].map((label, i) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5",
              step === i + 1 ? "bg-brand text-white" : step > i + 1 ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
            )}
          >
            <span className="font-semibold">{i + 1}</span> {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Tải file mẫu, điền danh sách đại lý rồi tải lên. Hỗ trợ <b>.xlsx</b> và <b>.csv</b> (UTF-8), tối đa 5 MB / 5.000 dòng.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/api/admin/dealers/import/template">
              <Download className="size-4" /> Tải file mẫu
            </a>
          </Button>
          <label
            className={cn(
              "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center",
              file ? "border-brand bg-brand-soft/40" : "hover:border-brand/50"
            )}
          >
            <FileSpreadsheet className="size-10 text-brand" />
            <span className="mt-2 font-medium">{file ? file.name : "Bấm để chọn file Excel/CSV"}</span>
            {file && <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button className="mt-4" onClick={upload} disabled={!file || busy !== null}>
            <Upload className="size-4" /> {busy === "preview" ? "Đang kiểm tra…" : "Tải lên & kiểm tra"}
          </Button>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">Tổng số dòng</p>
              <p className="text-2xl font-bold">{preview.totalRows}</p>
            </div>
            <div className="rounded-xl border bg-success-soft p-4">
              <p className="text-sm text-muted-foreground">Hợp lệ</p>
              <p className="text-2xl font-bold text-success">{preview.validRows}</p>
            </div>
            <div className="rounded-xl border bg-red-50 p-4">
              <p className="text-sm text-muted-foreground">Có lỗi</p>
              <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyErrors} onChange={(e) => {
                  setOnlyErrors(e.target.checked);
                  setTablePage(1);
                }} />
              Chỉ hiện dòng lỗi
            </label>
            {preview.errorRows > 0 && (
              <Button asChild size="sm" variant="outline">
                <a href={`/api/admin/dealers/imports/${preview.jobId}/errors`}>
                  <Download className="size-4" /> Tải file dòng lỗi
                </a>
              </Button>
            )}
            {preview.totalRows > preview.preview.length && (
              <span className="text-xs text-muted-foreground">Đang hiển thị {preview.preview.length} dòng đầu.</span>
            )}
          </div>
          <div className="max-h-[480px] overflow-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên đại lý</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Khu vực</TableHead>
                  <TableHead>Kết quả kiểm tra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.row} className={r.status === "error" ? "bg-red-50/50" : ""}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.dealerName}</TableCell>
                    <TableCell>{r.userName}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.region}</TableCell>
                    <TableCell>
                      {r.status === "valid" ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-4" /> Hợp lệ
                        </span>
                      ) : (
                        <ul className="space-y-0.5 text-xs text-red-700">
                          {r.errors.map((e, i) => (
                            <li key={i} className="flex gap-1">
                              <XCircle className="mt-0.5 size-3 shrink-0" /> {e.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={pageData.page}
              pageSize={tableSize}
              total={pageData.total}
              className="border-t"
              onChange={(p, sz) => {
                setTablePage(p);
                setTableSize(sz);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <p className="flex-1 text-sm">
              Xác nhận tạo <b>{preview.validRows}</b> đại lý hợp lệ. {preview.errorRows > 0 && <>{preview.errorRows} dòng lỗi sẽ bị bỏ qua.</>}
            </p>
            <Button variant="outline" onClick={restart} disabled={busy !== null}>
              Chọn file khác
            </Button>
            <Button onClick={commit} disabled={preview.validRows === 0 || busy !== null}>
              {busy === "commit" ? "Đang import… (có thể mất vài phút)" : "Xác nhận import"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-8 text-success" />
            <div>
              <p className="text-lg font-semibold">Đã tạo {result.created} đại lý</p>
              {result.skipped.length > 0 && <p className="text-sm text-amber-700">{result.skipped.length} dòng bị bỏ qua do trùng dữ liệu.</p>}
            </div>
          </div>
          {result.credentials.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm">
              <p className="font-semibold text-amber-800">
                {result.credentials.length} tài khoản được cấp mật khẩu tạm. Danh sách chỉ hiển thị một lần — hãy tải về và gửi cho đại lý.
              </p>
              <Button size="sm" className="mt-3" onClick={() => downloadCsv(result.credentials)}>
                <Download className="size-4" /> Tải danh sách mật khẩu tạm
              </Button>
            </div>
          )}
          {result.skipped.length > 0 && (
            <ul className="text-sm text-muted-foreground">
              {result.skipped.map((s) => (
                <li key={s.row}>
                  Dòng {s.row} ({s.code}): {s.reason}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/dealers">Về danh sách đại lý</Link>
            </Button>
            <Button onClick={restart}>Import file khác</Button>
          </div>
          <ToneBadge tone="info">Đã ghi audit log</ToneBadge>
        </div>
      )}
    </div>
  );
}
