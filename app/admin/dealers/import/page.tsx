import Link from "next/link";
import { ImportWizard } from "@/components/admin/ImportWizard";
import { PageHeader } from "@/components/common/PageHeader";

export const metadata = { title: "Import đại lý — Kymdan" };

export default function ImportDealersPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/dealers" className="text-sm text-muted-foreground hover:text-brand">
        ← Quản lý đại lý
      </Link>
      <PageHeader title="Import đại lý từ Excel/CSV" description="Kiểm tra dữ liệu trước khi tạo tài khoản hàng loạt." />
      <ImportWizard />
    </div>
  );
}
