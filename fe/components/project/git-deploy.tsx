"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { GitBranch, Upload, CheckCircle, XCircle, Clock, Loader2, ExternalLink, RefreshCw, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

interface DeploymentLogEntry {
  id: number
  status: string
  gitCommit: string | null
  gitMessage: string | null
  duration: number | null
  trigger: string
  createdAt: string
  log: string | null
}

interface GitDeployProps {
  project: any
  onUpdate: () => void
}

export function GitDeploy({ project, onUpdate }: GitDeployProps) {
  const [gitRepo, setGitRepo] = useState(project.gitRepo || "")
  const [branch, setBranch] = useState(project.deployBranch || "main")
  const [gitToken, setGitToken] = useState(project.gitToken || "")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployments, setDeployments] = useState<DeploymentLogEntry[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  const fetchDeployments = async () => {
    try {
      const data = await apiFetch<DeploymentLogEntry[]>(`/projects/${project.id}/deployments`)
      setDeployments(data)
      const hasRunning = data.some((d) => d.status === 'running')
      if (hasRunning) setTimeout(fetchDeployments, 3000)
    } catch {}
    finally { setIsLoadingHistory(false) }
  }

  useEffect(() => {
    fetchDeployments()
  }, [project.id])

  const handleDeploy = async () => {
    if (!gitRepo.trim()) {
      toast.error("Vui lòng nhập đường dẫn Git repository")
      return
    }
    setIsDeploying(true)
    try {
      await apiFetch(`/projects/${project.id}/deploy`, {
        method: "POST",
        body: JSON.stringify({ gitRepo, deployBranch: branch, gitToken }),
      })
      toast.success("Gieo mầm bắt đầu! 🚀", { description: "Đang chuẩn bị đất và kéo mã nguồn..." })
      onUpdate()
      fetchDeployments()
      setIsDeploying(false)
    } catch (err: any) {
      toast.error(err.message)
      setIsDeploying(false)
    }
  }

  const handleRollback = async (deploymentId: number) => {
    try {
      toast.loading("Đang thực hiện rollback...", { id: "rollback-project" })
      await apiFetch(`/projects/${project.id}/rollback/${deploymentId}`, {
        method: "POST"
      })
      toast.success("Đã kích hoạt rollback thành công! 🚀", { id: "rollback-project" })
      onUpdate()
      fetchDeployments()
    } catch (err: any) {
      toast.error(err.message, { id: "rollback-project" })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-emerald-400" />
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />
      case "running": return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "success": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "failed": return "bg-destructive/20 text-destructive border-destructive/30"
      case "running": return "bg-primary/20 text-primary border-primary/30"
      default: return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Git Source Config */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <GitBranch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Git Deploy</CardTitle>
                <CardDescription>Kéo mầm từ GitHub/GitLab/Bitbucket</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gitRepo">URL Repository</Label>
              <Input
                id="gitRepo"
                placeholder="https://github.com/your-org/your-repo"
                value={gitRepo}
                onChange={e => setGitRepo(e.target.value)}
                className="bg-muted/50 border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Nhánh</Label>
              <Input
                id="branch"
                placeholder="main"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="bg-muted/50 border-border font-mono text-sm w-40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitToken">Git Access Token (Cần cho Private Repo)</Label>
              <Input
                id="gitToken"
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={gitToken}
                onChange={e => setGitToken(e.target.value)}
                className="bg-muted/50 border-border font-mono text-sm"
              />
            </div>

            {project.deployStatus && project.deployStatus !== "idle" && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                project.deployStatus === "success" 
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                  : project.deployStatus === "failed"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-primary/30 bg-primary/5 text-primary"
              }`}>
                {getStatusIcon(project.deployStatus === "deploying" ? "running" : project.deployStatus)}
                <span className="text-sm font-medium">
                  {project.deployStatus === "success" && `Triển khai lần cuối thành công${project.lastDeployedAt ? ` · ${new Date(project.lastDeployedAt).toLocaleString()}` : ""}`}
                  {project.deployStatus === "failed" && "Triển khai lần cuối thất bại"}
                  {project.deployStatus === "deploying" && "Đang tiến hành triển khai..."}
                </span>
              </div>
            )}

            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isDeploying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang triển khai...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Triển khai ngay</>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deployment History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                <CardTitle className="text-lg">Lịch sử triển khai</CardTitle>
                <CardDescription>20 lần triển khai gần nhất</CardDescription>
              </div>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchDeployments}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : deployments.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Chưa có lịch sử gieo mầm nào. 🌱
              </div>
            ) : (
              <div className="space-y-3">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex flex-col rounded-lg border border-border bg-muted/20 overflow-hidden"
                  >
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setExpandedLogId(expandedLogId === deployment.id ? null : deployment.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deployment.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            {deployment.gitCommit && (
                              <code className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {deployment.gitCommit}
                              </code>
                            )}
                            <span className="text-xs font-medium text-foreground">
                              {deployment.gitMessage || "Triển khai thủ công"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(deployment.createdAt).toLocaleString()}
                            {deployment.duration && ` · Thực hiện trong ${deployment.duration}s`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {deployment.status === "success" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleRollback(deployment.id)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Rollback
                          </Button>
                        )}
                        <Badge className={`text-[9px] px-1.5 py-0 ${getStatusClass(deployment.status)}`}>
                          {deployment.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    
                    {expandedLogId === deployment.id && (
                      <div className="border-t border-border bg-black/40 p-3">
                        <pre className="text-[10px] font-mono text-emerald-400/90 whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {deployment.log || "Đang khởi tạo log..."}
                          {deployment.status === 'running' && (
                            <span className="inline-block w-2 h-4 ml-1 bg-emerald-400/50 animate-pulse">|</span>
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
