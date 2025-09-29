let _provider: string | undefined;
let _providerAccountId: string | undefined;
let _email: string | undefined;

export function setOAuthCtxProvider(p?: string, pid?: string) {
  _provider = p;
  _providerAccountId = pid;
}
export function setOAuthCtxEmail(email?: string) {
  _email = email;
}
export function getOAuthCtx() {
  return { provider: _provider, providerAccountId: _providerAccountId, email: _email };
}
export function clearOAuthCtx() {
  _provider = _providerAccountId = _email = undefined;
}
