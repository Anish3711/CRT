import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SpecCrtBrand } from "@/components/spec-crt-brand"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="grid min-h-[82px] shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Menu
              </span>
            </div>
            <div className="flex items-center justify-center px-2">
              <SpecCrtBrand compact />
            </div>
            <div className="w-12 sm:w-20" />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
