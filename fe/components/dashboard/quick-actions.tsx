"use client"

import { motion } from "framer-motion"
import { Database, Zap, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface QuickActionsProps {
  onNewProject: () => void
  onNewDatabase: () => void
}

const databaseOptions = [
  {
    id: "project",
    name: "Plant New App",
    description: "Tạo container Docker mới cho dự án của bạn",
    icon: "🌱",
    color: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/30",
    action: "Create",
  },
  {
    id: "db",
    name: "Postgres Spud",
    description: "Gieo mầm PostgreSQL với cơ chế tự động quản lý",
    icon: "🥔",
    color: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    action: "Provision",
  },
  {
    id: "db",
    name: "Redis Tot",
    description: "Bộ nhớ đệm siêu tốc (In-memory caching)",
    icon: "🍠",
    color: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    action: "Provision",
  },
]

export function QuickActions({ onNewProject, onNewDatabase }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">Quick Actions</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Thực hiện nhanh các thao tác hạ tầng cho vườn khoai của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {databaseOptions.map((db, index) => (
              <motion.div
                key={db.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.5 + index * 0.1 }}
                onClick={() => {
                  if (db.id === "project") onNewProject()
                  else onNewDatabase()
                }}
              >
                <div
                  className={`group relative w-full overflow-hidden rounded-lg border ${db.borderColor} bg-gradient-to-br ${db.color} p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/50 text-2xl">
                      {db.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {db.name === "Plant New App" ? <Plus className="h-4 w-4 text-emerald-400" /> : <Database className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold text-foreground">{db.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {db.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      {db.action || "Provision"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
