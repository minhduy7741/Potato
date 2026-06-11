"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Bell, Search, Settings, LogOut, User, Shield, X, Loader2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"

export function DashboardHeader() {
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null)
  const router = useRouter()

  // ── Search ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ projects: any[]; databases: any[] } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  // ── Notifications ───────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (userJson) {
      try { setUser(JSON.parse(userJson)) } catch {}
    }
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const projects = await apiFetch<any[]>("/projects")
      const notifs: any[] = []
      for (const p of projects) {
        if (p.sslStatus === "expiring_soon")
          notifs.push({ type: "ssl", project: p, message: `SSL của "${p.name}" sắp hết hạn`, level: "warning" })
        if (p.status === "error")
          notifs.push({ type: "error", project: p, message: `Dự án "${p.name}" đang gặp lỗi`, level: "error" })
      }
      setNotifications(notifs)
    } catch {}
  }

  const handleLogout = () => {
    localStorage.removeItem("potato_user")
    localStorage.removeItem("potato_token")
    router.push("/login")
  }

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setIsSearching(true)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      try {
        const [projects, databases] = await Promise.all([
          apiFetch<any[]>("/projects"),
          apiFetch<any[]>("/databases"),
        ])
        const q = searchQuery.toLowerCase()
        setSearchResults({
          projects: projects.filter(p =>
            p.name.toLowerCase().includes(q) || p.subdomain.toLowerCase().includes(q)
          ),
          databases: databases.filter(d =>
            d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
          ),
        })
      } catch {
        setSearchResults({ projects: [], databases: [] })
      } finally {
        setIsSearching(false)
      }
    }, 350)
  }, [searchQuery])

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearchQuery("")
        setSearchResults(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSearchResults(null)
    setShowSearch(false)
  }, [])

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  const hasNotifications = notifications.length > 0

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />

      {/* Global Search */}
      <div ref={searchRef} className="relative hidden w-full max-w-sm md:flex">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search plots, sprouts..."
          className="pl-10 pr-8 bg-muted border-border"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true) }}
          onFocus={() => setShowSearch(true)}
        />
        {searchQuery && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={clearSearch}>
            <X className="h-3 w-3" />
          </Button>
        )}

        {/* Search results dropdown */}
        <AnimatePresence>
          {showSearch && searchQuery && (
            <motion.div
              key="search-dropdown"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            >
              {isSearching ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm kiếm...
                </div>
              ) : !searchResults || (searchResults.projects.length === 0 && searchResults.databases.length === 0) ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Không tìm thấy kết quả nào cho &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.projects.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border">
                        🌱 Plots
                      </div>
                      {searchResults.projects.map((p) => (
                        <Link
                          key={p.id}
                          href={`/dashboard/project/${p.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={clearSearch}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{p.subdomain}.potato.local</p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${p.status === "running" ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}>
                            {p.status}
                          </Badge>
                        </Link>
                      ))}
                    </>
                  )}
                  {searchResults.databases.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border border-t">
                        🥔 Sprouts
                      </div>
                      {searchResults.databases.map((d) => (
                        <Link
                          key={d.id}
                          href="/dashboard/databases"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                          onClick={clearSearch}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-base shrink-0">
                            {d.type === "postgres" ? "🐘" : d.type === "redis" ? "🧣" : d.type === "mysql" ? "🐬" : "🍃"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{d.type}</p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${d.status === "running" ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground"}`}>
                            {d.status}
                          </Badge>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Notification Bell */}
        <DropdownMenu open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) fetchNotifications() }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {hasNotifications && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {notifications.length}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-card border-border p-0" forceMount>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Thông báo</p>
              {hasNotifications && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                  {notifications.length} mới
                </Badge>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Bell className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">Không có thông báo mới</p>
                <p className="text-xs opacity-60">Mọi thứ đang hoạt động tốt! 🥔</p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notif, i) => (
                  <Link
                    key={i}
                    href={`/dashboard/project/${notif.project.id}`}
                    onClick={() => setNotifOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${notif.level === "warning" ? "bg-amber-500/15" : "bg-red-500/15"}`}>
                      {notif.type === "ssl" ? "🔒" : "⚠️"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-snug">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notif.type === "ssl" ? "Nhấn để gia hạn SSL" : "Nhấn để xem lỗi chi tiết"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="border-t border-border">
              <Link href="/dashboard" onClick={() => setNotifOpen(false)} className="flex items-center justify-center py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                Xem tất cả dự án →
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border-2 border-primary/30 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end" forceMount>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold leading-none">{user?.name || "Potato User"}</p>
                  {user?.role === "ADMIN" && (
                    <Badge className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" /> Profile & Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
