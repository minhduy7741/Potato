"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ExternalLink, Play, Square, Trash2, Activity, Cpu, Database, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, CartesianGrid } from "recharts"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

export type ProjectStatus = "running" | "stopped" | "sprouting" | "hibernated"

interface ProjectCardProps {
  id: number
  name: string
  status: string
  subdomain: string
  hostPort?: number
  index?: number
  onUpdate: () => void
}

const statusConfig: Record<string, any> = {
  running: {
    label: "Running",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  sprouting: {
    label: "Sprouting",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  stopped: {
    label: "Stopped",
    className: "bg-muted text-muted-foreground border-border",
  },
  hibernated: {
    label: "Hibernated",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
}

export function ProjectCard({
  id,
  name,
  status: initialStatus,
  subdomain,
  hostPort,
  index = 0,
  onUpdate,
}: ProjectCardProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [stats, setStats] = useState<any[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const statusInfo = statusConfig[status] || statusConfig.stopped

  // Polling to update status when 'sprouting'
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === "sprouting") {
      interval = setInterval(async () => {
        try {
          const data = await apiFetch<any>(`/projects/${id}`)
          if (data.status === "running") {
            setStatus("running")
            toast.success(`Dự án ${name} đã nảy mầm thành công! 🥔`, {
              description: "Bạn có thể bắt đầu quản lý và truy cập ứng dụng.",
              duration: 5000,
            })
            clearInterval(interval)
            onUpdate()
          } else if (data.status === "error") {
            setStatus("error" as any)
            toast.error(`Gieo mầm dự án ${name} thất bại.`, {
              description: "Vui lòng kiểm tra lại logs hệ thống.",
            })
            clearInterval(interval)
            onUpdate()
          }
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [status, id, name, onUpdate])

  // Kết nối WebSocket để lấy stats thời gian thực
  useEffect(() => {
    if (status === "running") {
      const socket = io("http://localhost:3000/stats")
      socketRef.current = socket

      socket.on("connect", () => {
        socket.emit("watch_stats", { projectId: id })
      })

      socket.on("stats_update", (data) => {
        setStats((prev) => {
          const newStats = [...prev, { 
            time: new Date().toLocaleTimeString(), 
            cpu: data.cpu.usagePercent,
            ram: data.memory.usagePercent 
          }]
          return newStats.slice(-20) // Giữ lại 20 điểm dữ liệu cuối (khoảng 40s)
        })
      })

      socket.on("stats_error", (err) => {
        console.error("Stats Error:", err)
      })

      return () => {
        socket.disconnect()
      }
    } else {
      setStats([])
    }
  }, [status, id])

  const handleAction = async (action: "start" | "stop" | "delete") => {
    setIsActionLoading(true)
    try {
      const method = action === "delete" ? "DELETE" : "PATCH"
      const path = `/projects/${id}${action === "delete" ? "" : `/${action}`}`
      await apiFetch(path, { method })
      toast.success(`Dự án đã ${action === "start" ? "khởi động" : action === "stop" ? "tạm dừng" : "đã xóa"}`)
      if (action === "delete") {
        onUpdate()
      } else {
        setStatus(action === "start" ? "running" : "stopped")
        onUpdate()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const [actionLoading, setActionLoading] = useState<"start" | "stop" | "delete" | null>(null)

  const handleActionWithState = async (action: "start" | "stop" | "delete") => {
    setActionLoading(action)
    await handleAction(action)
    setActionLoading(null)
  }

  const currentStats = stats[stats.length - 1] || { cpu: 0, ram: 0 }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between relative z-10">
            <Link href={`/dashboard/project/${id}`} className="flex items-center gap-3 transition-colors hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {name}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {subdomain}.potato.local
                </p>
              </div>
            </Link>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className={`${statusInfo.className} text-[10px] px-2 py-0`}>
                {status === "running" && <Activity className="mr-1 h-3 w-3 animate-pulse" />}
                {actionLoading === "start" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {actionLoading === "stop" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {actionLoading ? (actionLoading === "start" ? "Starting..." : actionLoading === "stop" ? "Stopping..." : statusInfo.label) : statusInfo.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-6 pt-2">
          {/* Real-time Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Chart */}
            <div className="relative rounded-xl border border-border/50 bg-[#121212] p-4 flex flex-col h-[260px] group shadow-sm">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                    <Cpu className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-base font-semibold text-foreground">CPU Usage</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-500">{currentStats.cpu.toFixed(2)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Real-time</div>
                </div>
              </div>
              <div className="h-full w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCpuCard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} domain={[0, 100]} />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCpuCard)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* RAM Chart */}
            <div className="relative rounded-xl border border-border/50 bg-[#121212] p-4 flex flex-col h-[260px] group shadow-sm">
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <Database className="h-5 w-5 text-emerald-500" />
                  </div>
                  <span className="text-base font-semibold text-foreground">Memory Usage</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-500">{currentStats.ram.toFixed(2)}%</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Real-time</div>
                </div>
              </div>
              <div className="h-full w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRamCard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} domain={[0, 100]} />
                    <Area type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={2} fill="url(#colorRamCard)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-colors ${status === "running" ? "text-muted-foreground/30" : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                onClick={() => handleActionWithState("start")}
                disabled={status === "running" || !!actionLoading}
                title={status === "hibernated" ? "Wake Up" : "Start"}
              >
                {actionLoading === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "hibernated" ? (
                  <Play className="h-4 w-4 text-amber-400" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-colors ${status !== "running" ? "text-muted-foreground/30" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"}`}
                onClick={() => handleActionWithState("stop")}
                disabled={status !== "running" || !!actionLoading}
                title="Stop"
              >
                {actionLoading === "stop" ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Square className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                disabled={!!actionLoading}
                title="Delete"
              >
                {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                title={`Xóa dự án "${name}"?`}
                description="Hành động này sẽ xóa vĩnh viễn dự án và toàn bộ dữ liệu liên quan. Không thể hoàn tác."
                confirmLabel="Xóa dự án"
                onConfirm={() => { setConfirmOpen(false); handleActionWithState("delete") }}
                onCancel={() => setConfirmOpen(false)}
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-primary hover:text-primary hover:bg-primary/10 text-xs font-medium"
              asChild
            >
              <Link href={hostPort ? `http://localhost:${hostPort}` : `http://${subdomain}.potato.local`} target="_blank">
                Visit
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
