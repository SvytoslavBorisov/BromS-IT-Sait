// Детектируем окружение, где нельзя трогать fs
export const isClient = typeof window !== "undefined";

export const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  // внутренний флаг next build worker
  !!(process as any).env?.__NEXT_PRIVATE_BUILD_WORKER;

export const isEdge = process.env.NEXT_RUNTIME === "edge";

// В этих средах файловая система недоступна
export const isRestrictedFS = isClient || isBuildPhase || isEdge;
