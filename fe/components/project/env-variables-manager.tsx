"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Key, Plus, Trash2, Eye, EyeOff, Save, Loader2, ShieldCheck, FileText, Pencil, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

interface EnvVar {
  id: number
  key: string
  value: string
  isSecret: boolean
}

interface EnvVariablesManagerProps {
  projectId: number
}

function EnvVarRow({ envVar, onDelete, onUpdate }: { envVar: EnvVar; onDelete: (id: number) => void; onUpdate: (id: number, val: string, sec: boolean) => Promise<void> }) {
  const [showValue, setShowValue] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(envVar.value)
  const [editSecret, setEditSecret] = useState(envVar.isSecret)
  const [isSaving, setIsSaving] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    onDelete(envVar.id)
  }

  const handleSave = async () => {
    setIsSaving(true)
    await onUpdate(envVar.id, editValue, editSecret)
    setIsSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-muted/50 p-2.5">
        <code className="min-w-[140px] rounded bg-primary/10 px-2 py-1 text-xs text-primary font-mono opacity-70">
          {envVar.key}
        </code>
        <Input 
          value={editValue} 
          onChange={e => setEditValue(e.target.value)} 
          type={editSecret ? "password" : "text"}
          className="h-7 text-xs font-mono bg-background"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditSecret(!editSecret)}>
          {editSecret ? <ShieldCheck className="h-4 w-4 text-amber-400" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:bg-green-500/10" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => { setIsEditing(false); setEditValue(envVar.value); setEditSecret(envVar.isSecret); }} disabled={isSaving}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
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
        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 shrink-0"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
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
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkEnv, setBulkEnv] = useState("")

  const fetchEnvVars = async () => {
    try {
      const data = await apiFetch<EnvVar[]>(`/projects/${projectId}/env`)
      setEnvVars(data)
    } catch { } finally { setIsLoading(false) }
  }

  useEffect(() => { fetchEnvVars() }, [projectId])

  const handleAdd = async () => {
    if (!newKey.trim()) {
      toast.error("Vui lòng điền Key cho biến môi trường")
      return
    }
    setIsSaving(true)
    try {
      await apiFetch(`/projects/${projectId}/env`, {
        method: "POST",
        body: JSON.stringify({ key: newKey.trim().toUpperCase(), value: newValue, isSecret }),
      })
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

  const handleBulkAdd = async () => {
    if (!bulkEnv.trim()) return
    setIsSaving(true)
    
    const lines = bulkEnv.split('\n')
    let addedCount = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      
      const key = trimmed.substring(0, eqIdx).trim().toUpperCase()
      let value = trimmed.substring(eqIdx + 1).trim()
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }
      
      if (key) {
        try {
          await apiFetch(`/projects/${projectId}/env`, {
            method: "POST",
            body: JSON.stringify({ key, value, isSecret: false }),
          })
          addedCount++
        } catch (e) {
          console.error(`Failed to add ${key}`)
        }
      }
    }
    
    toast.success(`Đã thêm ${addedCount} biến môi trường từ file .env`)
    setBulkEnv("")
    setIsBulkMode(false)
    fetchEnvVars()
    setIsSaving(false)
  }

  const handleUpdate = async (envId: number, value: string, isSecret: boolean) => {
    try {
      await apiFetch(`/projects/${projectId}/env/${envId}`, {
        method: "PATCH",
        body: JSON.stringify({ value, isSecret }),
      })
      toast.success("Đã cập nhật biến môi trường")
      fetchEnvVars()
    } catch (err: any) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async (envId: number) => {
    try {
      await apiFetch(`/projects/${projectId}/env/${envId}`, { method: "DELETE" })
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
                <CardTitle className="text-lg">Biến môi trường</CardTitle>
                <CardDescription>Biến môi trường được inject vào container</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-border">
              {envVars.length} biến
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new variable form */}
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isBulkMode ? "Nhập hàng loạt (.env)" : "Thêm biến mới"}
              </p>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setIsBulkMode(!isBulkMode)}>
                {isBulkMode ? <Plus className="mr-1.5 h-3 w-3" /> : <FileText className="mr-1.5 h-3 w-3" />}
                {isBulkMode ? "Nhập tay từng biến" : "Nhập hàng loạt"}
              </Button>
            </div>
            
            {isBulkMode ? (
              <div className="space-y-3">
                <Textarea
                  placeholder={"APP_NAME=Potato\nDB_HOST=host.docker.internal\nDB_PORT=3306"}
                  value={bulkEnv}
                  onChange={e => setBulkEnv(e.target.value)}
                  className="bg-muted/50 border-border font-mono text-sm min-h-[120px]"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleBulkAdd} disabled={isSaving || !bulkEnv.trim()} className="bg-primary text-primary-foreground h-8">
                    {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                    Lưu tất cả biến
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                      Bảo mật (ẩn giá trị)
                    </Label>
                  </div>
                  <Button size="sm" onClick={handleAdd} disabled={isSaving} className="bg-primary text-primary-foreground h-8">
                    {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
                    Thêm biến
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* List of existing variables */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : envVars.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Chưa có biến môi trường nào. Hãy thêm ở trên! 🌿
            </p>
          ) : (
            <div className="space-y-2">
              {envVars.map(ev => (
                <EnvVarRow key={ev.id} envVar={ev} onDelete={handleDelete} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
