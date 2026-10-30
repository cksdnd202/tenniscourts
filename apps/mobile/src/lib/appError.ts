export type AppErrorCopy = {
  description: string;
  title: string;
};

const NETWORK_ERROR = /network request failed|failed to fetch|fetch failed|networkerror|internet|offline|connection|연결/i;
const TIMEOUT_ERROR = /aborterror|aborted|timeout|timed out|시간 초과/i;
const SERVER_ERROR = /\b5\d\d\b|server error|서버 오류|서버에/i;
const TECHNICAL_ERROR = /typeerror|postgrest|pgrst|jwt|sql|supabase|http\s?\d+/i;

export function getAppErrorCopy(cause: unknown, fallback: string): AppErrorCopy {
  const candidate = cause && typeof cause === 'object' && 'message' in cause
    ? (cause as { message?: unknown }).message
    : null;
  const raw = typeof candidate === 'string' ? candidate.trim() : '';

  if (NETWORK_ERROR.test(raw)) {
    return { title: '인터넷 연결을 확인해 주세요', description: '네트워크에 연결한 뒤 다시 시도해 주세요.' };
  }

  if (TIMEOUT_ERROR.test(raw)) {
    return { title: '불러오는 데 시간이 걸리고 있어요', description: '잠시 후 다시 시도해 주세요.' };
  }

  if (SERVER_ERROR.test(raw)) {
    return { title: '서버에 일시적인 문제가 생겼어요', description: '잠시 후 다시 시도해 주세요.' };
  }

  const safeMessage = raw && /[가-힣]/.test(raw) && !TECHNICAL_ERROR.test(raw) ? raw : fallback;
  return { title: '정보를 불러오지 못했어요', description: safeMessage };
}
