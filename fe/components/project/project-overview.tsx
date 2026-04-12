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
  Check
} from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
            href={`https://${value}`} 
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
            <CardTitle className="text-lg">Plot Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow
              icon={<Globe className="h-4 w-4" />}
              label="Local URL"
              value={`${project.subdomain}.potato.local`}
              link
              copyable
            />
            <InfoRow
              icon={<GitBranch className="h-4 w-4" />}
              label="Sprout ID"
              value={project.id.toString()}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="Planted At"
              value={new Date(project.createdAt).toLocaleString()}
            />
            <InfoRow
              icon={<Shield className="h-4 w-4" />}
              label="Tuber Security"
              value="Internal Only"
            />
            <InfoRow
              icon={<Database className="h-4 w-4" />}
              label="Farm Region"
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
              <CardTitle className="text-lg">Connected Sprouts</CardTitle>
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
              <CardTitle className="text-lg">Health Status</CardTitle>
              <Badge className={project.status === "running" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}>
                {project.status === "running" ? "Healthy" : "Hibernating"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[
                { label: "Container Runner", status: project.status === "running" ? "operational" : "stopped", latency: project.status === "running" ? "stable" : "N/A" },
                { label: "Internal Sprout API", status: "operational", latency: "active" },
                { label: "Root File System", status: "operational", latency: "mounted" },
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

      {/* Recent Activity */}
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
              <CardTitle className="text-lg">Recent Plot Activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {[
                { event: "Project Planted", detail: `User created initial plot`, time: new Date(project.createdAt).toLocaleDateString(), status: "success" },
                { event: "Docker Attached", detail: `Container ${project.containerId?.substring(0, 12)} mapping`, time: "Just now", status: "success" },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.event}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.detail}
                        {" · "}{activity.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="ghost" size="sm" className="text-muted-foreground">
                    Done
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
