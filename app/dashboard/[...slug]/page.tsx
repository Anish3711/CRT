import { redirect } from "next/navigation"

function getAdminPortalUrl() {
  return (
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  )
}

export default async function DashboardAdminRedirect({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const targetPath = slug.join("/")
  redirect(`${getAdminPortalUrl()}/dashboard/${targetPath}`)
}
