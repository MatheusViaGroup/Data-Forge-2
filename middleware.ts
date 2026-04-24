import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Usuário com senha provisória só pode acessar /trocar-senha
    if (token?.mustChangePassword && path !== "/trocar-senha") {
      return NextResponse.redirect(new URL("/trocar-senha", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin/:path*", "/trocar-senha"],
};
