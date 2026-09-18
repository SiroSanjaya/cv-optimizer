const STORAGE_KEY = "cv_optimizer_usage";
const DEFAULT_LIMIT = 2;

interface UsageState {
  used: number;
  limit: number;
}

function readUsage(): UsageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { used: 0, limit: DEFAULT_LIMIT };
    const parsed = JSON.parse(raw) as Partial<UsageState>;
    return {
      used: typeof parsed.used === "number" ? parsed.used : 0,
      limit: typeof parsed.limit === "number" ? parsed.limit : DEFAULT_LIMIT,
    };
  } catch {
    return { used: 0, limit: DEFAULT_LIMIT };
  }
}

function writeUsage(state: UsageState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getUsage(): UsageState {
  return readUsage();
}

export function hasQuotaRemaining(): boolean {
  const { used, limit } = readUsage();
  return used < limit;
}

export function incrementUsage(): UsageState {
  const state = readUsage();
  const next = { ...state, used: state.used + 1 };
  writeUsage(next);
  return next;
}

export function remainingCredits(): number {
  const { used, limit } = readUsage();
  return Math.max(0, limit - used);
}
