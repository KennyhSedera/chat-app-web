import { redirect } from "next/navigation";
import { getSession } from "../dev/services/cookieService";

export default async function AppLayout({ children }: { children: React.ReactNode }) {

  const userId = await getSession();

  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="flex">
      <div className="flex-1">
        <main>{children}</main>
      </div>
    </div>
  )
}