import Link from "next/link";
import { QuestionImportWizard } from "@/components/admin/QuestionImportWizard";
import { PageHeader } from "@/components/common/PageHeader";

export const metadata = { title: "Import câu hỏi — Kymdan" };

export default function ImportQuestionsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/questions" className="text-sm text-muted-foreground hover:text-brand">
        ← Ngân hàng câu hỏi
      </Link>
      <PageHeader title="Import câu hỏi từ Excel/CSV" description="Thêm nhiều câu hỏi trắc nghiệm một lần bằng file mẫu." />
      <QuestionImportWizard />
    </div>
  );
}
