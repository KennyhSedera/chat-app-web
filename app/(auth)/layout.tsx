import { redirect } from "next/navigation";
import { getSession } from "../dev/services/cookieService";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSession();

  if (userId) {
    redirect("/");
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}