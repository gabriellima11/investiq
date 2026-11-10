/**
 * Proxy (antigo "middleware" — renomeado no Next.js 16).
 * Roda ANTES da página. Aqui fazemos uma checagem OTIMISTA: só verifica se o
 * cookie de sessão existe, sem consultar o banco (rápido).
 *
 * A checagem DE VERDADE (sessão válida no banco) acontece em `requireUser()`,
 * dentro de cada página e Server Action. Nunca confie só no proxy.
 */
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (!hasSession && pathname.startsWith("/carteira")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/carteira", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/carteira/:path*", "/login"],
};
