"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  FolderKanban, 
  Search, 
  Plus, 
  RefreshCw, 
  Loader2, 
  Filter,
  LayoutGrid,
  List
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProjectCard } from "@/components/dashboard/project-card"
import { CreateProjectModal } from "@/components/dashboard/create-project-modal"
import { toast } from "sonner"

export default function PlotsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:3000/api/projects")
      if (!response.ok) throw new Error("Không thể tải danh sách dự án")
      const data = await response.json()
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

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-3">
            <FolderKanban className="h-8 w-8 text-primary" />
            My Plots
          </h1>
          <p className="text-muted-foreground">Quản lý và theo dõi quá trình sinh trưởng của các dự án.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Plant New App
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
          <Button variant="outline" size="sm" className="h-10 border-border gap-2">
            <Filter className="h-4 w-4" />
            Lọc
          </Button>
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
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Plant First App</Button>
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" 
          : "flex flex-col gap-4"
        }>
          {filteredProjects.map((project, index) => (
            <ProjectCard 
              key={project.id} 
              {...project} 
              index={index} 
              onUpdate={fetchProjects}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProjects}
      />
    </div>
  )
}
