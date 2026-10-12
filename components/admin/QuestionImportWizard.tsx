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
  category: string;
  newCategory: boolean;
  stem: string;
  options: string[];
  correct: string;
  difficulty: string;
  errors: { column: string; message: string }[];
}

interface Preview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  newCategories: string[];
  rows: PreviewRow[];
}

interface CommitResult {
  created: number;
  skipped: number;
  published: boolean;
  createdCategories: string[];
}

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadErrors(rows: PreviewRow[]) {
  const lines = [
    "Dòng,Chủ đề,Nội dung câu hỏi,Lỗi",
    ...rows.filter((r) => r.errors.length).map((r) => [String(r.row), r.category, r.stem, r.errors.map((e) => e.message).join("; ")].map(csvCell).join(",")),
  ];
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dong-loi-import-cau-hoi.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [publish, setPublish] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tableSize, setTableSize] = useState(DEFAULT_PAGE_SIZE);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const step = result ? 3 : preview ? 2 : 1;

  const send = async (url: string, extra?: Record<string, string>) => {
    const body = new FormData();
    body.append("file", file!);
    Object.entries(extra ?? {}).forEach(([k, v]) => body.append(k, v));
    const res = await fetch(url, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const upload = async () => {
    if (!file) return;
    setBusy("preview");
    try {
      setPreview((await send("/api/admin/questions/import/preview")) as Preview);
      setTablePage(1);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Không đọc được file");
    }
    setBusy(null);
  };

  const commit = async () => {
    setBusy("commit");
    try {
      const data = (await send("/api/admin/questions/import/commit", { publish: String(publish) })) as CommitResult;
      setResult(data);
      toast.success(`Đã import ${data.created} câu hỏi`);
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

  const filteredRows = preview?.rows.filter((r) => !onlyErrors || r.errors.length) ?? [];
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
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Tải file mẫu, điền mỗi câu hỏi một dòng (xem sheet &quot;Huong dan&quot; trong file).</li>
            <li>Cột &quot;Đáp án đúng&quot; ghi một chữ A–F. Chủ đề chưa có sẽ được tạo mới.</li>
            <li>Tải file lên để kiểm tra trước — chưa có gì được lưu cho tới khi bạn bấm xác nhận.</li>
          </ol>
          <Button asChild variant="outline" className="mt-4">
            <a href="/api/admin/questions/import/template">
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
            <span className="text-xs text-muted-foreground">.xlsx hoặc .csv (UTF-8), tối đa 5 MB / 2.000 câu</span>
            <input ref={inputRef} type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
              <p className="text-sm text-muted-foreground">Tổng số câu</p>
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
          {preview.newCategories.length > 0 && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
              Sẽ tạo {preview.newCategories.length} chủ đề mới: <b>{preview.newCategories.join(", ")}</b>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyErrors} onChange={(e) => {
                  setOnlyErrors(e.target.checked);
                  setTablePage(1);
                }} /> Chỉ hiện dòng lỗi
            </label>
            {preview.errorRows > 0 && (
              <Button size="sm" variant="outline" onClick={() => downloadErrors(preview.rows)}>
                <Download className="size-4" /> Tải file dòng lỗi
              </Button>
            )}
          </div>
          <div className="max-h-[520px] overflow-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Dòng</TableHead>
                  <TableHead>Chủ đề</TableHead>
                  <TableHead className="w-[40%]">Câu hỏi & lựa chọn</TableHead>
                  <TableHead>Đúng</TableHead>
                  <TableHead>Kiểm tra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.row} className={r.errors.length ? "bg-red-50/50" : ""} data-testid={`qrow-${r.row}`}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell className="whitespace-normal">
                      {r.category}
                      {r.newCategory && <ToneBadge tone="info" className="ml-1">mới</ToneBadge>}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="font-medium">{r.stem}</p>
                      <ol className="mt-1 text-xs text-muted-foreground">
                        {r.options.map((o, i) => (
                          <li key={i}>
                            {LETTERS[i]}. {o}
                          </li>
                        ))}
                      </ol>
                    </TableCell>
                    <TableCell className="font-semibold">{r.correct.toUpperCase()}</TableCell>
                    <TableCell className="whitespace-normal">
                      {r.errors.length === 0 ? (
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
            <div className="flex-1 text-sm">
              <p>
                Xác nhận import <b>{preview.validRows}</b> câu hỏi hợp lệ.
                {preview.errorRows > 0 && <> {preview.errorRows} dòng lỗi sẽ bị bỏ qua.</>}
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="size-4 accent-red-600" />
                Xuất bản ngay sau khi import (bỏ chọn = lưu bản nháp để duyệt trước)
              </label>
            </div>
            <Button variant="outline" onClick={restart} disabled={busy !== null}>
              Chọn file khác
            </Button>
            <Button onClick={commit} disabled={preview.validRows === 0 || busy !== null}>
              {busy === "commit" ? "Đang import…" : "Xác nhận import"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-8 text-success" />
            <div>
              <p className="text-lg font-semibold">Đã import {result.created} câu hỏi</p>
              <p className="text-sm text-muted-foreground">
                {result.published ? "Đã xuất bản — dùng được ngay cho ôn tập và đề thi." : "Đang ở trạng thái Bản nháp — cần xuất bản trước khi dùng."}
                {result.skipped > 0 && ` ${result.skipped} dòng lỗi đã bị bỏ qua.`}
              </p>
              {result.createdCategories.length > 0 && (
                <p className="text-sm text-muted-foreground">Chủ đề mới: {result.createdCategories.join(", ")}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={result.published ? "/admin/questions" : "/admin/questions?status=draft"}>Xem ngân hàng câu hỏi</Link>
            </Button>
            <Button onClick={restart}>Import file khác</Button>
          </div>
        </div>
      )}
    </div>
  );
}
