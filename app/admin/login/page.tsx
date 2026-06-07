import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Admin Login",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminSessionValid()) {
    redirect("/admin");
  }

  return (
    <main className="page-shell">
      <nav className="simple-nav">
        <Link className="wordmark" href="/">
          Wedding Admin
        </Link>
        <Link href="/">Back to site</Link>
      </nav>
      <section className="login-card">
        <p className="eyebrow">Private area</p>
        <h1>Admin login</h1>
        <p>Enter the admin password to view RSVP responses.</p>
        <LoginForm />
      </section>
    </main>
  );
}
