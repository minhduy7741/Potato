"use client"

import { motion } from "framer-motion"
import { Activity, Database, Rocket, Shield } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardsProps {
  projects: any[]
}

export function StatsCards({ projects }: StatsCardsProps) {
  const activePlots = projects.length
  const runningSprouts = projects.filter((p) => p.status === "running").length

  const stats = [
    {
      name: "Active Plots",
      value: activePlots.toString(),
      change: "Tất cả dự án",
      icon: Rocket,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Sprouts Running",
      value: runningSprouts.toString(),
      change: "Đang hoạt động",
      icon: Database,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "System Health",
      value: "100%",
      change: "Ổn định",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      name: "CPU Total",
      value: "2.4%",
      change: "Tải hiện tại",
      icon: Shield,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
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
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
