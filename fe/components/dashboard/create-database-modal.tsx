"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Database, Server, Check, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface CreateDatabaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const dbTypes = [
  { id: "postgres", name: "PostgreSQL", icon: "🐘", color: "text-blue-400" },
  { id: "mysql", name: "MySQL", icon: "🐬", color: "text-blue-500" },
  { id: "mongodb", name: "MongoDB", icon: "🍃", color: "text-emerald-500" },
  { id: "redis", name: "Redis", icon: "🧣", color: "text-red-500" },
]

export function CreateDatabaseModal({ isOpen, onClose, onSuccess }: CreateDatabaseModalProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
    }
  }, [isOpen])

  const fetchProjects = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/projects")
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      toast.error("Không thể tải danh sách dự án")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject || !selectedType || !name) {
      toast.error("Vui lòng điền đầy đủ thông tin")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("http://localhost:3000/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: selectedType,
          projectId: parseInt(selectedProject),
        }),
      })

      if (!response.ok) throw new Error("Lỗi khi tạo database")
      
      toast.success("Đã gieo mầm Database thành công!")
      onSuccess()
      onClose()
      // Reset form
      setName("")
      setSelectedType("")
      setSelectedProject("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Gieo mầm Sprout mới</h2>
                  <p className="text-sm text-muted-foreground">Khởi tạo một instance Database Docker</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project">Chọn dự án (Project)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project" className="bg-muted/50 border-border">
                    <SelectValue placeholder="Chọn dự án để gắn DB" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Chọn loại Database</Label>
                <div className="grid grid-cols-2 gap-3">
                  {dbTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                        selectedType === type.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className={`font-medium ${selectedType === type.id ? "text-primary" : "text-foreground"}`}>
                        {type.name}
                      </span>
                      {selectedType === type.id && (
                        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground">
                          <Check className="h-2 w-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dbName">Tên Database Instance</Label>
                <Input
                  id="dbName"
                  placeholder="Ví dụ: redis-cache-01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </div>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0" />
                  <div className="text-xs text-blue-200/80 leading-relaxed">
                    Mật khẩu mặc định sẽ là <span className="text-blue-400 font-bold">potato123</span>. 
                    Bạn có thể thay đổi sau khi DB được khởi tạo thành công.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-border">
                  Hủy bỏ
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gieo mầm...
                    </>
                  ) : (
                    "Bắt đầu Provisioning"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
