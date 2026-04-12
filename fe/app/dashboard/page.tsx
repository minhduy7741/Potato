"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Sparkles, Loader2, RefreshCw, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectCard } from "@/components/dashboard/project-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { CreateProjectModal } from "@/components/dashboard/create-project-modal"
import { CreateDatabaseModal } from "@/components/dashboard/create-database-modal"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("Dev Potato")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDbModalOpen, setIsDbModalOpen] = useState(false)
  const router = useRouter()

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:3000/api/projects")
      if (!response.ok) throw new Error("Không thể tải danh sách dự án")
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error("Fetch Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (!userJson) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userJson)
    setUserName(user.name || user.email)
    
    fetchProjects()
  }, [router])

  const expiringProjects = projects.filter(p => p.sslStatus === 'expiring_soon')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* SSL Expiry Warning Banner */}
      {expiringProjects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                ⚠️ {expiringProjects.length} dự án sắp hết hạn SSL!
              </p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                {expiringProjects.map(p => p.name).join(", ")} — Hệ thống sẽ tự động gia hạn trong vòng 7 ngày.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-400 hover:bg-amber-500/20 shrink-0 text-xs">
              Xem chi tiết
            </Button>
          </div>
        </motion.div>
      )}

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {"Sản phẩm của bạn đang phát triển rất tốt trong vườn."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Plant New App
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <StatsCards projects={projects} />

      {/* Projects Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">My Plots</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {projects.length} project(s) sprouting
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Đang kiểm tra vườn của bạn...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl gap-4">
            <p className="text-muted-foreground">Vườn của bạn đang trống. Hãy bắt đầu gieo mầm!</p>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Plant First App</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard 
                key={project.id} 
                {...project} 
                index={index} 
                onUpdate={fetchProjects}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <QuickActions 
        onNewProject={() => setIsModalOpen(true)} 
        onNewDatabase={() => setIsDbModalOpen(true)}
      />

      {/* Modals */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProjects}
      />

      <CreateDatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSuccess={fetchProjects} // Refresh projects to see attached DBs
      />
    </div>
  )
}
