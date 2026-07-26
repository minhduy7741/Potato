"use client"

import { motion } from "framer-motion"
import { Database, Rocket, Shield, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardsProps {
  projects: any[]
  quotaUsage?: {
    projects: { used: number; limit: number }
    databases: { used: number; limit: number }
    users: { used: number; limit: number }
    ram: { used: number; limit: number }
  } | null
}

export function StatsCards({ projects, quotaUsage }: StatsCardsProps) {
  // Tính toán dự phòng nếu API chưa trả về kịp
  const pUsed = quotaUsage?.projects?.used ?? projects.length
  const pLimit = quotaUsage?.projects?.limit ?? 3
  const pPercent = Math.min((pUsed / pLimit) * 100, 100)

  const dbUsed = quotaUsage?.databases?.used ?? 0
  const dbLimit = quotaUsage?.databases?.limit ?? 2
  const dbPercent = Math.min((dbUsed / dbLimit) * 100, 100)

  const ramUsed = quotaUsage?.ram?.used ?? 0
  const ramLimit = quotaUsage?.ram?.limit ?? 1024
  const ramPercent = Math.min((ramUsed / ramLimit) * 100, 100)

  const usersUsed = quotaUsage?.users?.used ?? 1
  const usersLimit = quotaUsage?.users?.limit ?? 3
  const usersPercent = Math.min((usersUsed / usersLimit) * 100, 100)

  const stats = [
    {
      name: "Dự án (Plots)",
      value: `${pUsed} / ${pLimit}`,
      change: `Đã sử dụng ${pPercent.toFixed(0)}%`,
      icon: Rocket,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      barColor: "bg-emerald-400",
      percent: pPercent,
    },
    {
      name: "Cơ sở dữ liệu (Sprouts)",
      value: `${dbUsed} / ${dbLimit}`,
      change: `Đã sử dụng ${dbPercent.toFixed(0)}%`,
      icon: Database,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      barColor: "bg-blue-400",
      percent: dbPercent,
    },
    {
      name: "Dung lượng RAM",
      value: `${ramUsed}MB / ${ramLimit}MB`,
      change: `Đã chạy ${ramPercent.toFixed(0)}%`,
      icon: Shield,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      barColor: "bg-amber-400",
      percent: ramPercent,
    },
    {
      name: "Nhân sự doanh nghiệp",
      value: `${usersUsed} / ${usersLimit}`,
      change: `Đã tuyển ${usersPercent.toFixed(0)}%`,
      icon: Users,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      barColor: "bg-red-400",
      percent: usersPercent,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="border-border bg-card hover:border-border/80 transition-all duration-300">
            <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>

              {/* Progress Bar hiển thị Quota */}
              <div className="space-y-1.5">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={`${stat.barColor} h-full rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
