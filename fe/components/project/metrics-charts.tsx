"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Activity, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [stats, setStats] = useState<any[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io("http://localhost:3000/stats")
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("watch_stats", { projectId })
    })

    socket.on("stats_update", (data) => {
      setStats((prev) => {
        const newStats = [...prev, { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          cpu: data.cpu.usagePercent,
          ram: data.memory.usagePercent 
        }]
        return newStats.slice(-30) // Giữ lại 30 điểm gần nhất
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [projectId])

  const currentStats = stats[stats.length - 1] || { cpu: 0, ram: 0 }

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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CPU Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Cpu className="h-4 w-4 text-primary" />
                  CPU History (%)
                </CardTitle>
                <span className="text-sm text-muted-foreground animate-pulse text-emerald-400">● Live</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ADFA1D" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ADFA1D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.04 55)" />
                    <XAxis
                      dataKey="time"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      stroke="#ADFA1D"
                      strokeWidth={2}
                      fill="url(#cpuGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* RAM Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <HardDrive className="h-4 w-4 text-blue-400" />
                  RAM History (%)
                </CardTitle>
                <span className="text-sm text-muted-foreground animate-pulse text-blue-400">● Live</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.04 55)" />
                    <XAxis
                      dataKey="time"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ram"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#ramGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
