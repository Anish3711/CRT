"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  MonitorDot,
  BarChart3,
  UserCheck,
  ShieldCheck,
  Settings,
  LogOut,
  PanelLeftClose,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Exams", url: "/dashboard/exams", icon: FileText },
]

const navMonitor = [
  { title: "Monitoring", url: "/dashboard/monitoring", icon: MonitorDot },
  { title: "Attendance", url: "/dashboard/attendance", icon: UserCheck },
  { title: "Results", url: "/dashboard/results", icon: BarChart3 },
]

const navSettings = [
  { title: "Security Settings", url: "/dashboard/security", icon: ShieldCheck },
  { title: "Admin Settings", url: "/dashboard/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    router.push("/")
    router.refresh()
  }

  const isActive = (url: string) => {
    if (!pathname) return false
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(url)
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary/12 text-sidebar-primary">
              <PanelLeftClose className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Navigation
              </span>
              <span className="text-sm font-medium text-sidebar-foreground">Faculty Navigation</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Monitor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMonitor.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSettings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
