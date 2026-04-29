import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const isApiRoute = path.startsWith("/api/");

    if (!token) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (token.mustChangePassword && path !== "/trocar-senha") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Senha provisória pendente" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/trocar-senha", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin/:path*", "/trocar-senha", "/api/((?!auth).*)"],
};
