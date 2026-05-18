"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  Users,
  FolderKanban,
  Database,
  RefreshCw,
  Shield,
  Clock,
  Loader2,
  Wifi,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SystemStats {
  ram: { totalGB: number; usedGB: number; freeGB: number; usagePercent: number }
  cpu: { model: string; cores: number; loadAvg1m: number; loadAvg5m: number; usagePercent: number }
  disk: { totalGB: number; usedGB: number; freeGB: number; usagePercent: number }
  system: { platform: string; uptime: { days: number; hours: number; minutes: number } }
  platform: { totalUsers: number; totalProjects: number; runningProjects: number; totalDatabases: number }
}

function RadialProgress({ percent, color, size = 120 }: { percent: number; color: string; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} fill="none" className="stroke-muted/30" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={8}
        fill="none"
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

function ResourceCard({
  title,
  icon,
  percent,
  color,
  colorHex,
  lines,
  warning,
  delay,
}: {
  title: string
  icon: React.ReactNode
  percent: number
  color: string
  colorHex: string
  lines: { label: string; value: string }[]
  warning?: boolean
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.4 }}
    >
      <Card className={cn("border-border bg-card overflow-hidden", warning && "border-red-500/40")}>
        {warning && (
          <div className="h-1 bg-gradient-to-r from-red-500 to-rose-600" />
        )}
        {!warning && (
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${colorHex}99, ${colorHex})` }} />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${colorHex}18` }}>
              <span style={{ color: colorHex }}>{icon}</span>
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {warning && (
                <Badge className="text-[10px] mt-0.5 bg-red-500/20 text-red-400 border-red-500/30">
                  ⚠ Dung lượng thấp
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Radial */}
            <div className="relative shrink-0">
              <RadialProgress percent={percent} color={warning ? "#ef4444" : colorHex} size={100} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-lg font-bold"
                  style={{ color: warning ? "#ef4444" : colorHex }}
                >
                  {percent}%
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-2">
              {lines.map((line) => (
                <div key={line.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="font-mono font-medium text-foreground">{line.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatCard({ icon, label, value, sub, color, delay }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay ?? 0, duration: 0.3 }}
    >
      <Card className="border-border bg-card">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {sub && <p className="text-[11px] text-primary mt-0.5">{sub}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function SystemMonitorPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const data = await apiFetch<SystemStats>("/admin/system-stats")
      setStats(data)
      setLastUpdated(new Date())
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes("403") || err?.message?.includes("Forbidden")) {
        setUnauthorized(true)
      }
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [])

  // Check auth
  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (!userJson) { router.push("/login"); return }
    const user = JSON.parse(userJson)
    if (user?.role !== "ADMIN") { setUnauthorized(true); setLoading(false); return }
    fetchStats()
  }, [router, fetchStats])

  // Auto-refresh every 10s
  useEffect(() => {
    if (unauthorized) return
    const interval = setInterval(() => fetchStats(), 10000)
    return () => clearInterval(interval)
  }, [fetchStats, unauthorized])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Đang tải thông số hệ thống...</p>
        </div>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Truy cập bị từ chối</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Chỉ tài khoản có quyền <span className="text-amber-400 font-semibold">Admin</span> mới có thể xem trang này.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Quay lại Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const diskWarning = stats.disk.usagePercent > 85

  const uptimeStr = [
    stats.system.uptime.days > 0 ? `${stats.system.uptime.days} ngày` : null,
    stats.system.uptime.hours > 0 ? `${stats.system.uptime.hours} giờ` : null,
    `${stats.system.uptime.minutes} phút`,
  ].filter(Boolean).join(" ")

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Activity className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">System Monitor</h1>
              <p className="text-sm text-muted-foreground">Giám sát tài nguyên máy chủ theo thời gian thực</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
              Cập nhật lúc {lastUpdated.toLocaleTimeString("vi-VN")}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="border-border"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Làm mới
          </Button>
        </div>
      </motion.div>

      {/* System Info Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{stats.system.platform}</span>
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" />
          {stats.cpu.model} ({stats.cpu.cores} luồng)
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Hoạt động liên tục: <span className="text-emerald-400 font-medium ml-1">{uptimeStr}</span>
        </span>
        <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
          ● Online
        </Badge>
      </motion.div>

      {/* Resource Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ResourceCard
          title="RAM (Bộ nhớ)"
          icon={<HardDrive className="h-5 w-5" />}
          percent={stats.ram.usagePercent}
          color="sky"
          colorHex="#38bdf8"
          delay={0.15}
          lines={[
            { label: "Đã dùng", value: `${stats.ram.usedGB} GB` },
            { label: "Còn trống", value: `${stats.ram.freeGB} GB` },
            { label: "Tổng cộng", value: `${stats.ram.totalGB} GB` },
          ]}
        />

        <ResourceCard
          title="CPU (Bộ xử lý)"
          icon={<Cpu className="h-5 w-5" />}
          percent={stats.cpu.usagePercent}
          color="violet"
          colorHex="#a78bfa"
          delay={0.2}
          lines={[
            { label: "Tải 1 phút", value: `${stats.cpu.loadAvg1m}` },
            { label: "Tải 5 phút", value: `${stats.cpu.loadAvg5m}` },
            { label: "Số luồng", value: `${stats.cpu.cores} cores` },
          ]}
        />

        <ResourceCard
          title="Ổ cứng (Disk)"
          icon={<Server className="h-5 w-5" />}
          percent={stats.disk.usagePercent}
          color="amber"
          colorHex="#f59e0b"
          warning={diskWarning}
          delay={0.25}
          lines={[
            { label: "Đã dùng", value: `${stats.disk.usedGB} GB` },
            { label: "Còn trống", value: `${stats.disk.freeGB} GB` },
            { label: "Tổng cộng", value: `${stats.disk.totalGB} GB` },
          ]}
        />
      </div>

      {/* Platform Stats */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3"
        >
          Thống kê nền tảng
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-sky-400" />}
            label="Tổng lập trình viên"
            value={stats.platform.totalUsers}
            color="bg-sky-500/10"
            delay={0.32}
          />
          <StatCard
            icon={<FolderKanban className="h-5 w-5 text-violet-400" />}
            label="Tổng dự án"
            value={stats.platform.totalProjects}
            sub={`${stats.platform.runningProjects} đang chạy`}
            color="bg-violet-500/10"
            delay={0.36}
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-emerald-400" />}
            label="Dự án đang chạy"
            value={stats.platform.runningProjects}
            color="bg-emerald-500/10"
            delay={0.4}
          />
          <StatCard
            icon={<Database className="h-5 w-5 text-amber-400" />}
            label="Database đã tạo"
            value={stats.platform.totalDatabases}
            color="bg-amber-500/10"
            delay={0.44}
          />
        </div>
      </div>

      {/* Auto-refresh notice */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[11px] text-muted-foreground/50 italic"
      >
        🔄 Tự động làm mới mỗi 10 giây · Chỉ dành riêng cho quản trị viên hệ thống
      </motion.p>
    </div>
  )
}
