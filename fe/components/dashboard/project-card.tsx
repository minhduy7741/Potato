"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ExternalLink, Play, Square, Trash2, Activity, Cpu, Database, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"

export type ProjectStatus = "running" | "stopped" | "sprouting"

interface ProjectCardProps {
  id: number
  name: string
  status: string
  subdomain: string
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
}

export function ProjectCard({
  id,
  name,
  status: initialStatus,
  subdomain,
  index = 0,
  onUpdate,
}: ProjectCardProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [stats, setStats] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  const statusInfo = statusConfig[status] || statusConfig.stopped

  // Polling để cập nhật trạng thái khi đang 'sprouting'
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (status === "sprouting") {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/projects/${id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.status === "running") {
              setStatus("running")
              toast.success(`Dự án ${name} đã nảy mầm thành công! 🥔`, {
                description: "Bạn có thể bắt đầu quản lý và truy cập ứng dụng.",
                duration: 5000,
              })
              clearInterval(interval)
              onUpdate()
            } else if (data.status === "error") {
              setStatus("error")
              toast.error(`Gieo mầm dự án ${name} thất bại.`, {
                description: "Vui lòng kiểm tra lại logs hệ thống.",
              })
              clearInterval(interval)
              onUpdate()
            }
          }
        } catch (error) {
          console.error("Polling error:", error)
        }
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
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
      const url = `http://localhost:3000/api/projects/${id}${action === "delete" ? "" : `/${action}`}`
      
      const response = await fetch(url, { method })
      if (!response.ok) throw new Error(`Không thể ${action} dự án`)

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

        <CardContent className="relative space-y-4 pt-0">
          {/* Real-time Charts Area */}
          <div className="grid grid-cols-2 gap-2 h-16">
            <div className="relative rounded-md bg-muted/30 p-2 overflow-hidden border border-border/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> CPU
                </span>
                <span className="text-[10px] font-bold text-primary">{currentStats.cpu.toFixed(1)}%</span>
              </div>
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ADFA1D" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ADFA1D" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="cpu" stroke="#ADFA1D" fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                    <YAxis hide domain={[0, 100]} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="relative rounded-md bg-muted/30 p-2 overflow-hidden border border-border/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Database className="h-3 w-3" /> RAM
                </span>
                <span className="text-[10px] font-bold text-blue-400">{currentStats.ram.toFixed(1)}%</span>
              </div>
              <div className="h-8 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="ram" stroke="#60A5FA" fillOpacity={1} fill="url(#colorRam)" isAnimationActive={false} />
                    <YAxis hide domain={[0, 100]} />
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
                title="Start"
              >
                {actionLoading === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
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
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn xóa dự án ${name}?`)) handleActionWithState("delete")
                }}
                disabled={!!actionLoading}
                title="Delete"
              >
                {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-primary hover:text-primary hover:bg-primary/10 text-xs font-medium"
              asChild
            >
              <Link href={`http://${subdomain}.potato.local`} target="_blank">
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
