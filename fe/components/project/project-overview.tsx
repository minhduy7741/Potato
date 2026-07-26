"use client"

import { motion } from "framer-motion"
import {
  Globe,
  GitBranch,
  Clock,
  Shield,
  Database,
  Activity,
  ExternalLink,
  Copy,
  Check,
  GitCommit,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  copyable?: boolean
  link?: boolean
}

function InfoRow({ icon, label, value, copyable, link }: InfoRowProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {link ? (
          <a
            href={value.startsWith('http') ? value : `http://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-sm font-medium text-foreground">{value}</span>
        )}
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

interface ProjectOverviewProps {
  project: any
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const [deployments, setDeployments] = useState<any[]>([])
  const [loadingDeployments, setLoadingDeployments] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(true)

  useEffect(() => {
    // Fetch deployments
    apiFetch(`/projects/${project.id}/deployments`)
      .then((data) => setDeployments(data || []))
      .catch(() => setDeployments([]))
      .finally(() => setLoadingDeployments(false))

    // Fetch activities
    apiFetch(`/projects/${project.id}/activities`)
      .then((data) => setActivities(data || []))
      .catch(() => setActivities([]))
      .finally(() => setLoadingActivities(false))
  }, [project.id, project.ramLimit, project.cpuLimit, project.status])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Project Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Thông tin Dự án</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              label="Subdomain"
              value={`${project.subdomain}.potato.local`}
              link
              copyable
            />
            {project.hostPort && (
              <InfoRow
                icon={<ExternalLink className="h-4 w-4" />}
                label="Local Port"
                value={`localhost:${project.hostPort}`}
                link
                copyable
              />
            )}
            <InfoRow
              icon={<GitBranch className="h-4 w-4" />}
              label="ID Dự án"
              value={project.id.toString()}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Thời gian tạo"
              value={new Date(project.createdAt).toLocaleString()}
            />
            <InfoRow
              icon={<Shield className="h-4 w-4" />}
              label="Bảo mật"
              value="Nội bộ (Internal)"
            />
            <InfoRow
              icon={<Database className="h-4 w-4" />}
              label="Môi trường chạy"
              value="Local Docker"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Sprouts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="lg:col-span-1"
      >
        <Card className="border-border bg-card h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Cơ sở dữ liệu đã kết nối</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {project.databases && project.databases.length > 0 ? (
                project.databases.map((db: any) => (
                  <div key={db.id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {db.type === 'postgres' ? '🐘' : db.type === 'redis' ? '🧣' : db.type === 'mysql' ? '🐬' : '🍃'}
                        </span>
                        <span className="text-sm font-medium">{db.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {db.type}
                      </Badge>
                    </div>
                    <div className="group relative font-mono text-[10px] bg-black/20 p-2 rounded truncate text-muted-foreground pr-8">
                      {db.connectionString}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground italic">Chưa có database nào được gắn.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Health Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Trạng thái Hoạt động</CardTitle>
              <Badge className={project.status === "running" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}>
                {project.status === "running" ? "Đang chạy" : project.status === "sprouting" ? "Đang khởi tạo" : "Đang tạm dừng"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[
                { label: "Trình chạy Container (Runner)", status: project.status === "running" ? "đang hoạt động" : "đã dừng", latency: project.status === "running" ? "ổn định" : "N/A" },
                { label: "Internal Sprout API", status: "đang hoạt động", latency: "ổn định" },
                { label: "Phân vùng lưu trữ (Root File System)", status: "đang hoạt động", latency: "đã mount" },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${service.status === "operational" ? "bg-emerald-400 animate-pulse" : "bg-muted"}`} />
                    <span className="text-sm text-foreground">{service.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{service.latency}</span>
                    <Badge variant="outline" className={`text-xs ${service.status === "operational" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity — from real DeploymentLog */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="lg:col-span-2"
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Lịch sử Triển khai</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingDeployments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deployments.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
                {/* Always show project creation as baseline activity */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 mx-0">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Khởi tạo Dự án</p>
                      <p className="text-xs text-muted-foreground">
                        Khởi tạo dự án ban đầu · {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">Xong</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">Chưa có lần deploy nào. Git Deploy để bắt đầu!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Project creation baseline */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Khởi tạo Dự án</p>
                      <p className="text-xs text-muted-foreground">
                        Khởi tạo dự án ban đầu · {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">Xong</Badge>
                </div>
                {deployments.slice(0, 5).map((dep: any) => (
                  <div key={dep.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      {dep.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : dep.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          Git Deploy
                          {dep.gitCommit && (
                            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                              <GitCommit className="h-3 w-3" />
                              {dep.gitCommit}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dep.gitMessage && `${dep.gitMessage} · `}
                          {new Date(dep.createdAt).toLocaleString()}
                          {dep.duration != null && ` · ${dep.duration}s`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        dep.status === 'success'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : dep.status === 'failed'
                          ? 'text-red-400 border-red-500/30'
                          : 'text-primary border-primary/30'
                      }`}
                    >
                      {dep.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="lg:col-span-2"
      >
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Hoạt động Gần đây</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Activity className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Chưa ghi nhận hoạt động nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      activity.type === 'START' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                      activity.type === 'STOP' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                      activity.type === 'DEPLOY' ? 'border-primary/30 bg-primary/10 text-primary' :
                      'border-border bg-muted text-muted-foreground'
                    }`}>
                      {activity.type === 'START' && <CheckCircle2 className="h-4 w-4" />}
                      {activity.type === 'STOP' && <XCircle className="h-4 w-4" />}
                      {activity.type === 'DEPLOY' && <GitBranch className="h-4 w-4" />}
                      {activity.type === 'UPDATE_RESOURCES' && <Activity className="h-4 w-4" />}
                      {!['START', 'STOP', 'DEPLOY', 'UPDATE_RESOURCES'].includes(activity.type) && <Clock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5">
                      {activity.type}
                    </Badge>
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
