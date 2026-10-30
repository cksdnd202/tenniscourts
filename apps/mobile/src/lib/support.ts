export type AppNotice = { id: string; title: string; body: string; is_pinned: boolean; published_at: string | null; action_label: string | null; action_url: string | null; created_at: string };
export type InquiryCategory = 'service' | 'court_info' | 'notification' | 'account' | 'bug' | 'other';
export type InquiryStatus = 'new' | 'in_progress' | 'answered' | 'closed';
export type InquiryReply = { id: string; body: string; author_label: string | null; created_at: string };
export type AppInquiry = { id: string; category: InquiryCategory; title: string; body: string; status: InquiryStatus; created_at: string; customer_inquiry_replies?: InquiryReply[] };
export const categoryLabels: Record<InquiryCategory, string> = { service: '서비스 이용', court_info: '테니스장 정보', notification: '오픈 알림', account: '계정', bug: '오류 신고', other: '기타' };
export const statusLabels: Record<InquiryStatus, string> = { new: '접수', in_progress: '확인 중', answered: '답변 완료', closed: '종료' };
export function supportDate(value: string) { return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value)); }
