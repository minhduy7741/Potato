"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Activity, TrendingUp, Database, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { io, Socket } from "socket.io-client"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string
  change: string
  positive: boolean
  icon: React.ReactNode
}

function MetricCard({ title, value, change, positive, icon }: MetricCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
          <div className={`text-sm ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricsChartsProps {
  projectId: number
}

export function MetricsCharts({ projectId }: MetricsChartsProps) {
  const [liveStats, setLiveStats] = useState<any[]>([])
  const [historyStats, setHistoryStats] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<"live" | "history">("live")
  const [loadingHistory, setLoadingHistory] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  // Live stats via WebSocket
  useEffect(() => {
    const socket = io("http://localhost:3000/stats")
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("watch_stats", { projectId })
    })

    socket.on("stats_update", (data) => {
      setLiveStats((prev) => {
        const newStats = [...prev, {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: data.cpu.usagePercent,
          ram: data.memory.usagePercent
        }]
        return newStats.slice(-30)
      })
    })

    return () => { socket.disconnect() }
  }, [projectId])

  // Historical stats from DB
  useEffect(() => {
    if (viewMode !== "history") return
    setLoadingHistory(true)
    apiFetch<any[]>(`/projects/${projectId}/stats/history`)
      .then((data) => {
        const formatted = (data || []).map((s: any) => ({
          time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cpu: s.cpuUsage,
          ram: s.ramUsage,
        }))
        setHistoryStats(formatted)
      })
      .catch(() => setHistoryStats([]))
      .finally(() => setLoadingHistory(false))
  }, [viewMode, projectId])

  const displayStats = viewMode === "live" ? liveStats : historyStats
  const currentStats = liveStats[liveStats.length - 1] || { cpu: 0, ram: 0 }

  const tooltipStyle = {
    backgroundColor: "#000",
    border: "1px solid #333",
    borderRadius: "8px",
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="CPU Usage"
          value={`${currentStats.cpu.toFixed(1)}%`}
          change="Real-time"
          positive={true}
          icon={<Cpu className="h-5 w-5" />}
        />
        <MetricCard
          title="RAM Usage"
          value={`${currentStats.ram.toFixed(1)}%`}
          change="Real-time"
          positive={true}
          icon={<HardDrive className="h-5 w-5" />}
        />
        <MetricCard
          title="Vitals"
          value="Healthy"
          change="Stable"
          positive={true}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Growth"
          value="Active"
          change="Optimized"
          positive={true}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Historical Performance Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 mb-2 gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Historical Performance</h2>
          <span className="text-xs text-muted-foreground">({displayStats.length} data points • {viewMode === 'live' ? 'Live' : '24h'})</span>
        </div>

        {/* View Mode Toggle looking like a dropdown */}
        <div className="flex items-center gap-1 p-1 bg-[#1a1a1a] border border-border/50 rounded-lg w-fit">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewMode("live")}
            className={cn(
              "h-8 rounded-md px-3 text-xs transition-all",
              viewMode === "live" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="mr-1.5 animate-pulse text-emerald-400">●</span> Live
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setViewMode("history")}
            className={cn(
              "h-8 rounded-md px-3 text-xs transition-all",
              viewMode === "history" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="mr-1.5 h-3.5 w-3.5" /> 24h History
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CPU Chart */}
        <motion.div
          key={`cpu-${viewMode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border/50 bg-[#121212] h-full shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-3 text-lg font-bold">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Cpu className="h-5 w-5 text-blue-500" />
                  </div>
                  CPU Usage
                </CardTitle>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-500">{currentStats.cpu.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">4 cores</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loadingHistory && viewMode === "history" ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải dữ liệu...</div>
                ) : displayStats.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Database className="h-8 w-8 opacity-20" />
                    <p>{viewMode === "history" ? "Chưa có dữ liệu lịch sử." : "Đang chờ dữ liệu..."}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} domain={[0, 100]} label={{ value: 'CPU %', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11, dy: 30 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#cpuGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* RAM Chart */}
        <motion.div
          key={`ram-${viewMode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/50 bg-[#121212] h-full shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-3 text-lg font-bold">
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Database className="h-5 w-5 text-emerald-500" />
                  </div>
                  Memory Usage
                </CardTitle>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-500">{currentStats.ram.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{((currentStats.ram / 100) * 5.79).toFixed(2)} GB / 5.79 GB</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loadingHistory && viewMode === "history" ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Đang tải dữ liệu...</div>
                ) : displayStats.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Database className="h-8 w-8 opacity-20" />
                    <p>{viewMode === "history" ? "Chưa có dữ liệu lịch sử." : "Đang chờ dữ liệu..."}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="time" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} domain={[0, 100]} label={{ value: 'Memory %', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 11, dy: 40 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={2} fill="url(#ramGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
