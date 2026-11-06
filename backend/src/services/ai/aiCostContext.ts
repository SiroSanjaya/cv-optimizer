import { AsyncLocalStorage } from "node:async_hooks";

export interface AiCostContext {
  userId: string;
  jobId: string;
  taskType: string;
}

const storage = new AsyncLocalStorage<AiCostContext>();

export function withAiCostContext<T>(
  context: AiCostContext,
  callback: () => T
): T {
  return storage.run(context, callback);
}

export function getAiCostContext(): AiCostContext | undefined {
  return storage.getStore();
}
