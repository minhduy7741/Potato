"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Cpu, HardDrive, Zap, Save, RotateCcw, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

interface ResourceSliderProps {
  label: string
  icon: React.ReactNode
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit: string
  tiers: { value: number; label: string }[]
}

function ResourceSlider({ label, icon, value, onChange, min, max, unit, tiers }: ResourceSliderProps) {
  const currentTier = tiers.reduce((prev, curr) =>
    value >= curr.value ? curr : prev, tiers[0])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {currentTier.label}
          </Badge>
          <span className="text-lg font-bold text-foreground">
            {value}{unit}
          </span>
        </div>
      </div>
      <div className="relative pt-2">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={min}
          max={max}
          step={128}
          className="w-full"
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          {tiers.map((tier) => (
            <span key={tier.value} className={value >= tier.value ? "text-primary" : ""}>
              {tier.value}{unit}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ResourceControlProps {
  project: any
  onUpdate?: () => void
}

export function ResourceControl({ project, onUpdate }: ResourceControlProps) {
  const [ramLimit, setRamLimit] = useState(project.ramLimit || 256)
  const [cpuLimit, setCpuLimit] = useState(project.cpuLimit || 1)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleRamChange = (value: number) => {
    setRamLimit(value)
    setHasChanges(true)
  }

  const handleCpuChange = (value: number) => {
    setCpuLimit(value)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await apiFetch(`/projects/${project.id}/resources`, {
        method: "PATCH",
        body: JSON.stringify({ ramLimit, cpuLimit }),
      })
      toast.success("Đã cập nhật giới hạn tài nguyên thành công 🌱", {
        description: `RAM: ${ramLimit}MB · CPU: ${cpuLimit} vCPU`,
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
    setRamLimit(project.ramLimit || 256)
    setCpuLimit(1)
    setHasChanges(false)
  }

  const ramTiers = [
    { value: 256, label: "Seedling" },
    { value: 512, label: "Sprout" },
    { value: 1024, label: "Mature" },
    { value: 2048, label: "Harvest" },
  ]

  const cpuTiers = [
    { value: 0.5, label: "Light" },
    { value: 1, label: "Medium" },
    { value: 2, label: "Heavy" },
    { value: 4, label: "Industrial" },
  ]

  // Calculate estimated monthly cost (mock calculation)
  const estimatedCost = ((ramLimit / 256) * 5 + cpuLimit * 10).toFixed(2)

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
              <CardDescription>Fine-tune your potato&apos;s growing conditions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* RAM Control */}
          <ResourceSlider
            label="RAM Allocation"
            icon={<HardDrive className="h-4 w-4" />}
            value={ramLimit}
            onChange={handleRamChange}
            min={256}
            max={2048}
            unit="MB"
            tiers={ramTiers}
          />

          {/* CPU Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Cpu className="h-4 w-4" />
                </div>
                <span className="font-medium text-foreground">CPU Cores</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {cpuTiers.find((t) => cpuLimit >= t.value)?.label || "Light"}
                </Badge>
                <span className="text-lg font-bold text-foreground">
                  {cpuLimit} vCPU
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {cpuTiers.map((tier) => (
                <Button
                  key={tier.value}
                  variant={cpuLimit === tier.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCpuChange(tier.value)}
                  className={cpuLimit === tier.value
                    ? "bg-primary text-primary-foreground"
                    : "border-border hover:bg-primary/10 hover:text-primary"
                  }
                >
                  {tier.value} vCPU
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chi phí ước tính / tháng</p>
                <p className="text-2xl font-bold text-foreground">${estimatedCost}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">* Số liệu tham khảo, không phải hoá đơn thực tế</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>RAM: {ramLimit}MB</p>
                <p>CPU: {cpuLimit} vCPU</p>
              </div>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges}
              className="border-border hover:bg-muted"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
