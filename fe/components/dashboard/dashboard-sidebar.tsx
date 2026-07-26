"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  FolderKanban,
  Database,
  Settings,
  BookOpen,
  Home,
  LogOut,
  Activity,
  Shield,
} from "lucide-react"
import { PotatoLogo } from "@/components/potato-logo"
import { Badge } from "@/components/ui/badge"
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

const navItems = [
  {
    title: "Tổng quan",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Dự án của tôi",
    href: "/dashboard/plots",
    icon: FolderKanban,
    description: "Projects",
  },
  {
    title: "Cơ sở dữ liệu",
    href: "/dashboard/databases",
    icon: Database,
    description: "Databases",
  },
]

const secondaryItems = [
  {
    title: "Cài đặt",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Tài liệu hướng dẫn",
    href: "/dashboard/docs",
    icon: BookOpen,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasSystemUserManage, setHasSystemUserManage] = useState(false)
  const [hasSystemRoleManage, setHasSystemRoleManage] = useState(false)
  const [hasSystemInfraRead, setHasSystemInfraRead] = useState(false)

  useEffect(() => {
    try {
      const userJson = localStorage.getItem("potato_user")
      if (userJson) {
        const user = JSON.parse(userJson)
        const isSuperAdmin = user?.role === "ADMIN" && user?.email === "superadmin@potato.com"
        const isAdminProject = user?.role === "ADMIN" && user?.email !== "superadmin@potato.com"
        setIsAdmin(isSuperAdmin || isAdminProject)
        
        const permissions = user?.customRole?.permissions || []
        setHasSystemUserManage(permissions.includes("system:user:manage"))
        setHasSystemRoleManage(permissions.includes("system:role:manage"))
        setHasSystemInfraRead(isSuperAdmin) // Only SuperAdmin can see infra stats
      }
    } catch {}
  }, [])

  const showAdminSection = isAdmin || hasSystemUserManage || hasSystemRoleManage
  const showSystemStats = hasSystemInfraRead // SuperAdmin only
  const showPermissions = isAdmin || hasSystemRoleManage || hasSystemUserManage

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3">
          <PotatoLogo className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">Potato</span>
            <span className="text-xs text-muted-foreground">Developer Platform</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Hỗ trợ</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section for Super Admin or users with system permissions */}
        {showAdminSection && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400/80">Admin</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showSystemStats && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/dashboard/system"}
                    >
                      <Link href="/dashboard/system" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>Giám sát hệ thống</span>
                        <Badge className="ml-auto text-[9px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                          LIVE
                        </Badge>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {showPermissions && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/dashboard/system/permissions"}
                    >
                      <Link href="/dashboard/system/permissions" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Quản lý phân quyền</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => {
                localStorage.removeItem("potato_user");
                window.location.href = "/login";
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
