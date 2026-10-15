import { NextRequest, NextResponse } from "next/server";

// Tudo protegido, exceto o webhook do Apify e assets estáticos
export const config = {
  matcher: ["/((?!api/webhook-apify|_next/static|_next/image|favicon.ico).*)"],
};

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function middleware(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return new NextResponse("ADMIN_PASSWORD não configurada", { status: 500 });

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6)); // "usuario:senha" (usuário livre)
      if (safeEq(decoded.slice(decoded.indexOf(":") + 1), pass)) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SyncSaas", charset="UTF-8"' },
  });
}
