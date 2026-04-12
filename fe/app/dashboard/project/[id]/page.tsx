"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, RefreshCw, ExternalLink, MoreVertical, Loader2, GitBranch, Key } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PotatoLogo } from "@/components/potato-logo"
import { TerminalLogs } from "@/components/project/terminal-logs"
import { MetricsCharts } from "@/components/project/metrics-charts"
import { ResourceControl } from "@/components/project/resource-control"
import { ProjectOverview } from "@/components/project/project-overview"
import { ProjectSettings } from "@/components/project/project-settings"
import { GitDeploy } from "@/components/project/git-deploy"
import { EnvVariablesManager } from "@/components/project/env-variables-manager"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProject = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${id}`)
      if (!response.ok) throw new Error("Không tìm thấy dự án")
      const data = await response.json()
      setProject(data)
    } catch (error: any) {
      toast.error(error.message)
      router.push("/dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchProject()
  }, [id])

  if (isLoading || !project) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    )
  }

  const statusColors: any = {
    running: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    stopped: "bg-muted text-muted-foreground border-border",
    sprouting: "bg-primary/20 text-primary border-primary/30",
    error: "bg-destructive/20 text-destructive border-destructive/30",
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Project Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4"
      >
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative p-3 bg-card border border-border rounded-2xl shadow-sm">
              <PotatoLogo className="h-12 w-12" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {project.name}
                </h1>
                <Badge className={statusColors[project.status] || statusColors.stopped}>
                  {project.status.toUpperCase()}
                </Badge>
                {project.gitRepo && (
                  <Badge variant="outline" className="border-border text-xs">
                    <GitBranch className="mr-1 h-3 w-3" />
                    {project.deployBranch || "main"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.containerId 
                  ? <>Container: <span className="font-mono text-xs">{project.containerId?.substring(0, 12)}</span> · </>
                  : null}
                Subdomain: {project.subdomain}.potato.local
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-border hover:bg-primary/10 hover:text-primary" onClick={fetchProject}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="border-border hover:bg-primary/10 hover:text-primary" asChild>
              <Link href={`http://${project.subdomain}.potato.local`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit URL
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border hover:bg-muted h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem onClick={() => toast.info("Tính năng đang phát triển")}>Restart Plot</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Tính năng đang phát triển")}>Clone Plot</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400">Delete Plot</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Overview
            </TabsTrigger>
            <TabsTrigger value="deploy" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <GitBranch className="mr-1.5 h-3.5 w-3.5" />
              Git Deploy
            </TabsTrigger>
            <TabsTrigger value="env" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Key className="mr-1.5 h-3.5 w-3.5" />
              Fertilizers
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Logs
            </TabsTrigger>
            <TabsTrigger value="metrics" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverview project={project} />
          </TabsContent>

          <TabsContent value="deploy">
            <GitDeploy project={project} onUpdate={fetchProject} />
          </TabsContent>

          <TabsContent value="env">
            <EnvVariablesManager projectId={project.id} />
          </TabsContent>

          <TabsContent value="logs">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Build & Runtime Logs</h2>
                <p className="text-sm text-muted-foreground">
                  Theo dõi trực tiếp quá trình "sinh trưởng" của ứng dụng từ container Docker.
                </p>
              </div>
              <TerminalLogs projectId={project.id} projectName={project.name} />
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Performance Metrics</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Giám sát các chỉ số tài nguyên hệ thống (CPU, RAM) của dự án.
                </p>
              </div>
              <MetricsCharts projectId={project.id} />
              <ResourceControl project={project} onUpdate={fetchProject} />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <ProjectSettings project={project} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
