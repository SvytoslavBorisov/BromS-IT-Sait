import { AsyncLocalStorage } from "node:async_hooks";

type OAuthContextStore = {
  provider?: string;
  providerAccountId?: string;
  email?: string;
};

const storage = new AsyncLocalStorage<OAuthContextStore>();

function currentStore(): OAuthContextStore | undefined {
  return storage.getStore();
}

export function runWithOAuthCtx<T>(fn: () => T): T {
  return storage.run({}, fn);
}

export function setOAuthCtxProvider(provider?: string, providerAccountId?: string) {
  const store = currentStore();
  if (!store) return;
  store.provider = provider;
  store.providerAccountId = providerAccountId;
}

export function setOAuthCtxEmail(email?: string) {
  const store = currentStore();
  if (!store) return;
  store.email = email;
}

export function getOAuthCtx() {
  return currentStore() ?? {};
}

export function clearOAuthCtx() {
  const store = currentStore();
  if (!store) return;
  store.provider = undefined;
  store.providerAccountId = undefined;
  store.email = undefined;
}
