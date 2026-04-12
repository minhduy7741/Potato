"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Key, Plus, Trash2, Eye, EyeOff, Save, Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface EnvVar {
  id: number
  key: string
  value: string
  isSecret: boolean
}

interface EnvVariablesManagerProps {
  projectId: number
}

function EnvVarRow({ envVar, onDelete }: { envVar: EnvVar; onDelete: (id: number) => void }) {
  const [showValue, setShowValue] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    onDelete(envVar.id)
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <code className="min-w-[140px] rounded bg-primary/10 px-2 py-1 text-xs text-primary font-mono">
        {envVar.key}
      </code>
      <div className="flex flex-1 items-center gap-1 overflow-hidden">
        <code className="flex-1 truncate text-xs text-muted-foreground font-mono">
          {envVar.isSecret && !showValue ? "••••••••••••••" : envVar.value}
        </code>
        {envVar.isSecret && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowValue(!showValue)}>
            {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        {envVar.isSecret && <ShieldCheck className="h-3 w-3 text-amber-400 shrink-0" />}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </Button>
    </div>
  )
}

export function EnvVariablesManager({ projectId }: EnvVariablesManagerProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [isSecret, setIsSecret] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchEnvVars = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${projectId}/env`)
      if (res.ok) setEnvVars(await res.json())
    } catch {} finally { setIsLoading(false) }
  }

  useEffect(() => { fetchEnvVars() }, [projectId])

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error("Vui lòng điền đầy đủ Key và Value")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${projectId}/env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim().toUpperCase(), value: newValue, isSecret }),
      })
      if (!res.ok) throw new Error("Lỗi khi lưu biến môi trường")
      toast.success(`Đã thêm biến "${newKey.toUpperCase()}"`)
      setNewKey("")
      setNewValue("")
      setIsSecret(false)
      fetchEnvVars()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (envId: number) => {
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${projectId}/env/${envId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Lỗi khi xóa biến")
      toast.success("Đã xóa biến môi trường")
      fetchEnvVars()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Environment Fertilizers</CardTitle>
                <CardDescription>Biến môi trường được inject vào container</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-border">
              {envVars.length} variables
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new variable form */}
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add New Variable</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Key</Label>
                <Input
                  placeholder="DATABASE_URL"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.toUpperCase())}
                  className="bg-muted/50 border-border font-mono text-sm h-8"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  placeholder="postgresql://..."
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  type={isSecret ? "password" : "text"}
                  className="bg-muted/50 border-border font-mono text-sm h-8"
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={isSecret} onCheckedChange={setIsSecret} id="isSecret" />
                <Label htmlFor="isSecret" className="text-xs text-muted-foreground cursor-pointer">
                  Secret (hidden)
                </Label>
              </div>
              <Button size="sm" onClick={handleAdd} disabled={isSaving} className="bg-primary text-primary-foreground h-8">
                {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
                Add Variable
              </Button>
            </div>
          </div>

          {/* List of existing variables */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : envVars.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No environment variables yet. Add one above! 🌿
            </p>
          ) : (
            <div className="space-y-2">
              {envVars.map(ev => (
                <EnvVarRow key={ev.id} envVar={ev} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
