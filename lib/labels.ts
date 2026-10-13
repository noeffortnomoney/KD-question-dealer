export type Tone = "brand" | "success" | "warning" | "muted" | "danger" | "info";

export interface Label {
  text: string;
  tone: Tone;
}

export const CONTENT_STATUS: Record<string, Label> = {
  draft: { text: "Bản nháp", tone: "muted" },
  published: { text: "Đã xuất bản", tone: "success" },
  archived: { text: "Lưu trữ", tone: "muted" },
};

export const EXAM_STATUS: Record<string, Label> = {
  draft: { text: "Bản nháp", tone: "muted" },
  published: { text: "Đang mở", tone: "success" },
  closed: { text: "Đã đóng", tone: "info" },
  archived: { text: "Lưu trữ", tone: "muted" },
};

export const ACCOUNT_STATUS: Record<string, Label> = {
  active: { text: "Hoạt động", tone: "success" },
  locked: { text: "Đã khóa", tone: "danger" },
};

export const ATTEMPT_STATUS_LABEL: Record<string, Label> = {
  NotStarted: { text: "Chưa thi", tone: "muted" },
  InProgress: { text: "Đang làm", tone: "warning" },
  Submitted: { text: "Đã nộp", tone: "success" },
  Expired: { text: "Hết giờ", tone: "info" },
  Voided: { text: "Đã hủy", tone: "danger" },
};

export const SESSION_STATUS: Record<string, Label> = {
  scheduled: { text: "Sắp diễn ra", tone: "brand" },
  cancelled: { text: "Đã hủy", tone: "danger" },
  completed: { text: "Đã diễn ra", tone: "muted" },
};

export const DIFFICULTY: Record<number, string> = { 1: "Dễ", 2: "Trung bình", 3: "Khó" };

export const DIFFICULTY_TONE: Record<number, Tone> = { 1: "success", 2: "info", 3: "warning" };

export const POLICY_LABEL: Record<string, string> = {
  after_submit: "Ngay sau khi nộp",
  after_exam_ends: "Sau khi kỳ thi kết thúc",
  never: "Không hiển thị",
};

export const REISSUE_CATEGORIES: Record<string, string> = {
  SystemIncident: "Sự cố hệ thống",
  DealerDeviceOrNetwork: "Lỗi thiết bị / mạng của đại lý",
  Other: "Lý do khác",
};
