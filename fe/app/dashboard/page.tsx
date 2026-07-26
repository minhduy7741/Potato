"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Plus, Sparkles, Loader2, RefreshCw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectCard } from "@/components/dashboard/project-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { CreateProjectModal } from "@/components/dashboard/create-project-modal"
import { CreateDatabaseModal } from "@/components/dashboard/create-database-modal"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [quotaUsage, setQuotaUsage] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("Dev Potato")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDbModalOpen, setIsDbModalOpen] = useState(false)
  const router = useRouter()

  // Track polling interval so we can clear it
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const [projectsData, quotaData] = await Promise.all([
        apiFetch<any[]>("/projects"),
        apiFetch<any>("/tenant/quota-usage")
      ])
      setProjects(projectsData)
      setQuotaUsage(quotaData)
    } catch (error) {
      console.error("Fetch Error:", error)
      // If 401, token expired — redirect to login
      if ((error as any).message?.toLowerCase().includes('unauthorized') ||
          (error as any).message?.toLowerCase().includes('401')) {
        router.push("/login")
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    const token = localStorage.getItem("potato_token")
    if (!userJson || !token) {
      router.push("/login")
      return
    }
    const user = JSON.parse(userJson)
    setCurrentUser(user)
    setUserName(user.name || user.email)
    fetchData()
  }, [router])

  // Poll every 4 seconds if any project is still "sprouting" (provisioning)
  useEffect(() => {
    const hasSprouting = projects.some(p => p.status === 'sprouting')

    if (hasSprouting) {
      pollingRef.current = setInterval(() => fetchData(true), 4000)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [projects])

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
            <Button variant="ghost" size="sm" className="text-amber-400 hover:bg-amber-500/20 shrink-0 text-xs"
              onClick={() => router.push(`/dashboard/project/${expiringProjects[0].id}`)}
            >
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
            Chào mừng trở lại, {userName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {"Sản phẩm của bạn đang phát triển rất tốt trong vườn."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Gieo mầm App
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      {currentUser?.email !== "superadmin@potato.com" && (
        <StatsCards projects={projects} quotaUsage={quotaUsage} />
      )}

      {/* Projects Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Dự án của tôi</h2>
          </div>
          <div className="flex items-center gap-2">
            {projects.some(p => p.status === 'sprouting') && (
              <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang khởi tạo...
              </span>
            )}
            <p className="text-xs text-muted-foreground">
              {projects.length} dự án đang nảy mầm
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Đang kiểm tra vườn của bạn...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl gap-4">
            <p className="text-muted-foreground">Vườn của bạn đang trống. Hãy bắt đầu gieo mầm!</p>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Gieo mầm App đầu tiên</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                {...project}
                index={index}
                onUpdate={() => fetchData()}
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
        onSuccess={() => fetchData()}
      />

      <CreateDatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
