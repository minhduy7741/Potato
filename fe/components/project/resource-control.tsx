"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Zap, Save, RotateCcw, Loader2, CheckCircle2, Server } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface InstanceType {
  id: string
  name: string
  tier: string
  cpu: number
  ram: number     // MB
  description: string
  useCases: string[]
  color: string
}

const INSTANCE_TYPES: InstanceType[] = [
  {
    id: "t3.nano",
    name: "t3.nano",
    tier: "Seedling",
    cpu: 0.5,
    ram: 512,
    description: "Siêu nhẹ, khởi động cực nhanh",
    useCases: ["Chạy thử nghiệm", "Cron jobs", "Static websites"],
    color: "emerald",
  },
  {
    id: "t3.micro",
    name: "t3.micro",
    tier: "Sprout",
    cpu: 1,
    ram: 1024,
    description: "Phù hợp môi trường phát triển",
    useCases: ["API cơ bản", "Blog cá nhân", "Dev environment"],
    color: "sky",
  },
  {
    id: "t3.small",
    name: "t3.small",
    tier: "Mature",
    cpu: 2,
    ram: 2048,
    description: "Chuẩn cho ứng dụng web thông thường",
    useCases: ["Ứng dụng web", "Database nhỏ", "Staging server"],
    color: "violet",
  },
  {
    id: "t3.medium",
    name: "t3.medium",
    tier: "Harvest",
    cpu: 2,
    ram: 4096,
    description: "Tải vừa đến cao, xử lý hàng đợi",
    useCases: ["Microservices", "Worker queue", "Medium traffic"],
    color: "amber",
  },
  {
    id: "t3.large",
    name: "t3.large",
    tier: "Industrial",
    cpu: 4,
    ram: 8192,
    description: "Môi trường production, tải nặng",
    useCases: ["Production traffic", "Large database", "Heavy workloads"],
    color: "rose",
  },
]

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/60",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    glow: "shadow-emerald-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/60",
    text: "text-sky-400",
    badge: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    glow: "shadow-sky-500/20",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/60",
    text: "text-violet-400",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    glow: "shadow-violet-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/60",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    glow: "shadow-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/60",
    text: "text-rose-400",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    glow: "shadow-rose-500/20",
  },
}

function findInstanceType(ramMB: number, cpu: number): InstanceType | null {
  return INSTANCE_TYPES.find((t) => t.ram === ramMB && t.cpu === cpu) ?? null
}

interface ResourceControlProps {
  project: any
  onUpdate?: () => void
}

export function ResourceControl({ project, onUpdate }: ResourceControlProps) {
  const initialType = findInstanceType(project.ramLimit || 512, project.cpuLimit || 1) ?? null
  const [selected, setSelected] = useState<InstanceType | null>(initialType)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSelect = (type: InstanceType) => {
    setSelected(type)
    setHasChanges(
      type.ram !== (project.ramLimit || 512) || type.cpu !== (project.cpuLimit || 1)
    )
  }

  const handleSave = async () => {
    if (!selected) return
    setIsSaving(true)
    try {
      await apiFetch(`/projects/${project.id}/resources`, {
        method: "PATCH",
        body: JSON.stringify({ ramLimit: selected.ram, cpuLimit: selected.cpu }),
      })
      toast.success(`Đã cập nhật cấu hình thành ${selected.name} (${selected.tier}) 🌱`, {
        description: `${selected.cpu} vCPU · ${selected.ram >= 1024 ? `${selected.ram / 1024} GB` : `${selected.ram} MB`} RAM`,
      })
      setHasChanges(false)
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSelected(initialType)
    setHasChanges(false)
  }

  const isCustom = !selected && (project.ramLimit || project.cpuLimit)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Soil Adjustment</CardTitle>
              <CardDescription>Chọn gói cấu hình phù hợp với nhu cầu của bạn</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instance Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INSTANCE_TYPES.map((type, index) => {
              const isActive = selected?.id === type.id
              const colors = colorMap[type.color]
              const ramLabel = type.ram >= 1024 ? `${type.ram / 1024} GB` : `${type.ram} MB`

              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(type)}
                  className={cn(
                    "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                    isActive
                      ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                      : "border-border bg-muted/20 hover:bg-muted/40 hover:border-border/80"
                  )}
                >
                  {/* Active check */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-3 top-3"
                    >
                      <CheckCircle2 className={cn("h-5 w-5", colors.text)} />
                    </motion.div>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 pr-6">
                    <Server className={cn("h-4 w-4 shrink-0", isActive ? colors.text : "text-muted-foreground")} />
                    <div>
                      <p className={cn("text-sm font-bold font-mono", isActive ? colors.text : "text-foreground")}>
                        {type.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] mt-0.5 py-0 px-1.5", isActive ? colors.badge : "border-border text-muted-foreground")}
                      >
                        {type.tier}
                      </Badge>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {type.cpu} vCPU
                    </span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {ramLabel} RAM
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {type.description}
                  </p>

                  {/* Use cases */}
                  <div className="flex flex-wrap gap-1">
                    {type.useCases.map((uc) => (
                      <span
                        key={uc}
                        className={cn(
                          "text-[10px] rounded-md px-1.5 py-0.5 border",
                          isActive
                            ? `${colors.bg} ${colors.text} border-current/20`
                            : "bg-muted/50 text-muted-foreground border-border/50"
                        )}
                      >
                        {uc}
                      </span>
                    ))}
                  </div>
                </motion.button>
              )
            })}

            {/* Custom config card (if current doesn't match any tier) */}
            {isCustom && (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border p-4 bg-muted/10 opacity-60">
                <p className="text-xs font-semibold text-muted-foreground">Cấu hình tùy chỉnh</p>
                <p className="text-xs text-muted-foreground">
                  {project.cpuLimit} vCPU · {project.ramLimit >= 1024 ? `${project.ramLimit / 1024} GB` : `${project.ramLimit} MB`} RAM
                </p>
                <p className="text-[10px] text-muted-foreground/60 italic">
                  Chọn một gói trên để nâng cấp lên cấu hình tiêu chuẩn
                </p>
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selected ? `${selected.name} — ${selected.tier}` : "Chưa chọn gói"}
                  </p>
                  <p className="text-xs text-primary/70 mt-0.5">
                    🌱 Tài nguyên được cung cấp hoàn toàn miễn phí
                  </p>
                </div>
              </div>
              {selected && (
                <div className="text-right text-sm text-muted-foreground space-y-0.5">
                  <p className="font-mono text-xs">{selected.cpu} vCPU</p>
                  <p className="font-mono text-xs">
                    {selected.ram >= 1024 ? `${selected.ram / 1024} GB` : `${selected.ram} MB`} RAM
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
              className="border-border hover:bg-muted"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Đặt lại
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
