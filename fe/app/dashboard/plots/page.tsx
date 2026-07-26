"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FolderKanban, Search, Plus, RefreshCw, Loader2, LayoutGrid, List, Play, Square, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ProjectCard } from "@/components/dashboard/project-card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CreateProjectModal } from "@/components/dashboard/create-project-modal"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

export default function PlotsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [statusFilter, setStatusFilter] = useState("all")

  const statusConfig: Record<string, any> = {
    running: { label: "Đang chạy", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    stopped: { label: "Đã dừng", cls: "bg-muted text-muted-foreground border-border" },
    hibernated: { label: "Ngủ đông", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    sprouting: { label: "Đang nảy mầm", cls: "bg-primary/20 text-primary border-primary/30" },
    error: { label: "Lỗi", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  }

  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const handleDelete = async (project: any) => {
    try {
      await apiFetch(`/projects/${project.id}`, { method: "DELETE" })
      toast.success(`Đã xóa "${project.name}"`)
      fetchProjects()
    } catch (e: any) { toast.error(e.message) }
  }

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const data = await apiFetch<any[]>("/projects")
      setProjects(data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" />
            Dự án của tôi
          </h1>
          <p className="text-muted-foreground">Quản lý và theo dõi quá trình sinh trưởng của các dự án.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gieo mầm App
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-card/50 p-4 rounded-2xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm dự án..."
            className="pl-10 bg-muted/30 border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="h-10 bg-muted/30 border border-border rounded-lg px-3 text-xs text-muted-foreground outline-none focus:border-primary/50"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="running">Đang chạy</option>
            <option value="stopped">Đã dừng</option>
            <option value="hibernated">Ngủ đông</option>
            <option value="sprouting">Đang nảy mầm</option>
          </select>
          
          <div className="flex items-center border border-border rounded-lg p-1 bg-muted/20">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Đang kiểm kê vườn tược...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl gap-4">
          <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center text-4xl">🪴</div>
          <div className="text-center">
            <h3 className="text-lg font-medium">Không tìm thấy dự án nào</h3>
            <p className="text-sm text-muted-foreground">Hãy thử tìm kiếm từ khóa khác hoặc tạo mới ngay.</p>
          </div>
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Gieo mầm App đầu tiên</Button>
        </div>
      ) : (
        viewMode === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.id} {...project} index={index} onUpdate={fetchProjects} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-border overflow-hidden">
            {filteredProjects.map((project) => {
              const cfg = statusConfig[project.status] || statusConfig.stopped
              return (
                <div key={project.id} className="flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    {project.name.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/project/${project.id}`} className="font-medium text-foreground hover:text-primary transition-colors text-sm truncate block">
                      {project.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {project.hostPort ? `localhost:${project.hostPort}` : `${project.subdomain}.potato.local`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-2 py-0 ${cfg.cls}`}>{cfg.label}</Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-emerald-400 hover:bg-emerald-500/10"
                      onClick={async () => { try { await apiFetch(`/projects/${project.id}/start`, {method:"PATCH"}); fetchProjects() } catch(e:any){toast.error(e.message)} }}
                      disabled={project.status === 'running'} title="Start">
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-amber-400 hover:bg-amber-500/10"
                      onClick={async () => { try { await apiFetch(`/projects/${project.id}/stop`, {method:"PATCH"}); fetchProjects() } catch(e:any){toast.error(e.message)} }}
                      disabled={project.status !== 'running'} title="Stop">
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setDeleteTarget(project)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" asChild title="Visit">
                      <a href={project.hostPort ? `http://localhost:${project.hostPort}` : `http://${project.subdomain}.potato.local`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Xóa dự án "${deleteTarget?.name}"?`}
        description="Hành động này sẽ xóa vĩnh viễn dự án và toàn bộ dữ liệu liên quan. Không thể hoàn tác."
        confirmLabel="Xóa dự án"
        onConfirm={() => { const t = deleteTarget; setDeleteTarget(null); handleDelete(t) }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProjects}
      />
    </div>
  )
}
