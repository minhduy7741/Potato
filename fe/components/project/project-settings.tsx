"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { motion } from "framer-motion"
import {
  Settings,
  Trash2,
  AlertTriangle,
  Globe,
  Bell,
  Save,
  Lock,
  ShieldCheck,
  Check,
  Loader2,
  Pencil,
  X,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ProjectSettingsProps {
  project: any
  onUpdate?: () => void
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [projectName, setProjectName] = useState(project.name)
  const [autoScale, setAutoScale] = useState(project.autoScale || false)
  const [notifications, setNotifications] = useState(project.notificationsEnabled ?? true)
  const [publicAccess, setPublicAccess] = useState(true)
  const [restartPolicy, setRestartPolicy] = useState(project.restartPolicy || 'on-failure')
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)
  const [isHibernating, setIsHibernating] = useState(false)
  const [hibernateConfirmOpen, setHibernateConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Custom domain state
  const [customDomain, setCustomDomain] = useState(project.customDomain || "")
  const [isEditingDomain, setIsEditingDomain] = useState(false)
  const [isSavingDomain, setIsSavingDomain] = useState(false)
  const [isEnablingSsl, setIsEnablingSsl] = useState(false)

  const handleEnableSsl = async () => {
    setIsEnablingSsl(true)
    try {
      await apiFetch(`/projects/${project.id}/ssl/activate`, { method: "PATCH" })
      toast.success("Dự án của bạn đã được mã hóa thành công (HTTPS)! 🔒")
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsEnablingSsl(false)
    }
  }

  const handleSaveDomain = async () => {
    setIsSavingDomain(true)
    try {
      await apiFetch(`/projects/${project.id}/domain`, {
        method: "PATCH",
        body: JSON.stringify({ customDomain }),
      })
      toast.success(`Domain "${customDomain}" đã được gắn thành công! 🌐`)
      setIsEditingDomain(false)
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSavingDomain(false)
    }
  }

  const [isSavingGeneral, setIsSavingGeneral] = useState(false)

  const handleSaveGeneral = async () => {
    setIsSavingGeneral(true)
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: projectName }),
      })
      toast.success("Đã cập nhật thông tin Plot thành công!")
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || "Đã lưu cài đặt")
    } finally {
      setIsSavingGeneral(false)
    }
  }

  const handleSavePolicy = async () => {
    setIsSavingPolicy(true)
    try {
      await apiFetch(`/projects/${project.id}/restart-policy`, {
        method: "PATCH",
        body: JSON.stringify({ restartPolicy }),
      })
      toast.success(`Chính sách khởi động đã được đặt thành "${restartPolicy}" 🔄`)
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSavingPolicy(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await apiFetch(`/projects/${project.id}`, { method: "DELETE" })
      toast.success(`Đã xóa dự án "${project.name}" thành công`)
      window.location.href = "/dashboard"
    } catch (error: any) {
      toast.error(error.message)
      setIsDeleting(false)
    }
  }

  const handleHibernate = async () => {
    setIsHibernating(true)
    try {
      await apiFetch(`/projects/${project.id}/hibernate`, { method: "PATCH" })
      toast.success("Dự án đã được đưa vào trạng thái ngủ đông 😴")
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsHibernating(false)
    }
  }

  const toggleAutoScale = async (val: boolean) => {
    setAutoScale(val)
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ autoScale: val }),
      })
      toast.success(`Đã ${val ? "bật" : "tắt"} tính năng Tự động mở rộng 🚀`)
    } catch (error: any) {
      toast.error(error.message)
      setAutoScale(!val)
    }
  }

  const toggleNotifications = async (val: boolean) => {
    setNotifications(val)
    try {
      await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notificationsEnabled: val }),
      })
      toast.success(`Thông báo đã được ${val ? "bật" : "tắt"} 🔔`)
    } catch (error: any) {
      toast.error(error.message)
      setNotifications(!val)
    }
  }

  const isSslActive = project.sslStatus === 'active' || project.sslStatus === 'expiring_soon'
  const isExpiring = project.sslStatus === 'expiring_soon'

  return (
    <div className="flex flex-col gap-6">
      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">General Settings</CardTitle>
                <CardDescription>Configure your plot&apos;s basic settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Plot Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Mock)</Label>
              <Input
                id="description"
                defaultValue="Main API service for the Potato platform"
                className="bg-muted border-border"
              />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Public Access</p>
                  <p className="text-xs text-muted-foreground">Allow external traffic to this plot</p>
                </div>
              </div>
              <Switch checked={publicAccess} onCheckedChange={setPublicAccess} />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-Scale</p>
                  <p className="text-xs text-muted-foreground">Tự động tăng RAM/CPU khi ứng dụng bị quá tải</p>
                </div>
              </div>
              <Switch checked={autoScale} onCheckedChange={toggleAutoScale} />
            </div>
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">Nhận cảnh báo khi Deploy lỗi hoặc dự án gặp sự cố</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={toggleNotifications} />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveGeneral}
              disabled={isSavingGeneral}
            >
              {isSavingGeneral ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Domain Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Domain Management</CardTitle>
                  <CardDescription>Kết nối tên miền riêng cho dự án của bạn</CardDescription>
                </div>
              </div>
              {isSslActive && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex gap-1">
                  <Lock className="h-3 w-3" /> Secure
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="customDomain"
                    placeholder="ví dụ: myapp.com"
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    className="bg-muted border-border font-mono"
                    readOnly={!isEditingDomain}
                  />
                  {isEditingDomain ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSaveDomain}
                        disabled={isSavingDomain}
                        className="bg-primary text-primary-foreground"
                      >
                        {isSavingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsEditingDomain(false); setCustomDomain(project.customDomain || "") }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => setIsEditingDomain(true)}>
                      <Pencil className="mr-1.5 h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>
              </div>

              {isSslActive ? (
                <div className={`rounded-xl border p-4 ${isExpiring ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full ${isExpiring ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isExpiring ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isExpiring ? 'Certificate Expiring Soon' : 'SSL Protection Active'}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {isExpiring
                          ? `Chứng chỉ của bạn sẽ hết hạn vào ${new Date(project.sslExpiry).toLocaleDateString()}. Vui lòng gia hạn.`
                          : `Sử dụng HTTPS (TLS 1.3) và Force Redirect từ HTTP.`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Kích hoạt SSL để bảo vệ dữ liệu người dùng và tăng uy tín cho "vườn khoai" của bạn.
                  </p>
                </div>
              )}
            </div>

            {!isSslActive && (
              <Button
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
                onClick={handleEnableSsl}
                disabled={project.sslStatus === 'provisioning' || isEnablingSsl}
              >
                {isEnablingSsl ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Encrypting...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" />{project.sslStatus === 'provisioning' ? 'Encrypting...' : 'Encrypt with SSL'}</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>


      {/* Restart Policy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Restart Policy</CardTitle>
                <CardDescription>Chính sách tự khởi động khi container bị lỗi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'no', label: 'Không bao giờ', desc: 'Container sẽ không tự khởi động lại', icon: '🚫' },
                { value: 'on-failure', label: 'Khi gặp lỗi', desc: 'Tự khởi động khi exit code ≠ 0', icon: '🔁' },
                { value: 'always', label: 'Luôn luôn', desc: 'Luôn tự khởi động, kể cả bị stop thủ công', icon: '♾️' },
                { value: 'unless-stopped', label: 'Trừ khi dừng', desc: 'Khởi động lại trừ khi bị dừng thủ công', icon: '⏸️' },
              ].map((policy) => (
                <button
                  key={policy.value}
                  onClick={() => setRestartPolicy(policy.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                    restartPolicy === policy.value
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  )}
                >
                  <span className="text-2xl leading-none mt-0.5">{policy.icon}</span>
                  <div>
                    <p className={cn("text-sm font-semibold", restartPolicy === policy.value ? "text-primary" : "text-foreground")}>
                      {policy.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{policy.desc}</p>
                  </div>
                  {restartPolicy === policy.value && (
                    <Check className="ml-auto h-4 w-4 text-primary shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSavePolicy}
              disabled={isSavingPolicy}
            >
              {isSavingPolicy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu chính sách
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="border-red-500/30 bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <CardTitle className="text-lg text-red-400">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions - proceed with caution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div>
                <p className="font-medium text-foreground">Hibernate Plot</p>
                <p className="text-sm text-muted-foreground">Tạm dừng dự án để tiết kiệm tài nguyên</p>
              </div>
              <Button
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => setHibernateConfirmOpen(true)}
                disabled={isHibernating || project.status === 'hibernated'}
              >
                {isHibernating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hibernate"}
              </Button>
              <ConfirmDialog
                open={hibernateConfirmOpen}
                title="Cho dự án đi ngủ đông?"
                description="Dự án sẽ ngừng tiêu tốn tài nguyên. Bạn có thể bật lại bất cứ lúc nào."
                confirmLabel="Hibernate"
                variant="warning"
                onConfirm={() => { setHibernateConfirmOpen(false); handleHibernate() }}
                onCancel={() => setHibernateConfirmOpen(false)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div>
                <p className="font-medium text-foreground">Delete Plot</p>
                <p className="text-sm text-muted-foreground">Permanently remove this project and all data</p>
              </div>
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </Button>
              <ConfirmDialog
                open={deleteConfirmOpen}
                title={`Xóa dự án "${project.name}"?`}
                description="Hành động này sẽ xóa vĩnh viễn container, logs và toàn bộ dữ liệu liên quan. Không thể hoàn tác."
                confirmLabel="Xóa dự án"
                onConfirm={() => { setDeleteConfirmOpen(false); handleDelete() }}
                onCancel={() => setDeleteConfirmOpen(false)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
