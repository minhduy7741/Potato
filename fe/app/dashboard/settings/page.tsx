"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  User, Lock, Shield, Trash2, AlertTriangle, Save, Eye, EyeOff, Bell, Palette, CheckCircle2, Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Toggle states
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [sslAlerts, setSslAlerts] = useState(true)
  const [deployAlerts, setDeployAlerts] = useState(true)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (!userJson) { router.push("/login"); return }
    const u = JSON.parse(userJson)
    setUser(u)
    setName(u.name || "")
    setEmail(u.email || "")
  }, [router])

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "?"

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      // PATCH /api/auth/me reads userId from JWT token — no need to pass userId
      const updatedUser = await apiFetch<any>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      const merged = { ...user, ...updatedUser }
      localStorage.setItem("potato_user", JSON.stringify(merged))
      setUser(merged)
      toast.success("Thông tin cá nhân đã được cập nhật!")
    } catch (e: any) {
      toast.error(e.message || "Không thể cập nhật thông tin, vui lòng thử lại.")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Mật khẩu mới không khớp!"); return }
    if (newPassword.length < 6) { toast.error("Mật khẩu mới phải dài ít nhất 6 ký tự!"); return }
    if (!currentPassword) { toast.error("Vui lòng nhập mật khẩu hiện tại!"); return }
    setIsSavingPassword(true)
    try {
      // POST /api/auth/change-password reads userId from JWT — no need to pass userId
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success("Mật khẩu đã được thay đổi thành công! 🔒")
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch (e: any) {
      toast.error(e.message || "Đổi mật khẩu thất bại, vui lòng thử lại.")
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      toast.loading("Đang xóa tài khoản...", { id: "delete-acc" })
      await apiFetch("/auth/me", { method: "DELETE" })
      toast.success("Tài khoản của bạn đã được xóa. Tạm biệt! 👋", { id: "delete-acc" })

      // Cleanup local state
      localStorage.removeItem("potato_token")
      localStorage.removeItem("potato_user")
      router.push("/login")
    } catch (e: any) {
      toast.error(e.message || "Xóa tài khoản thất bại, vui lòng liên hệ hỗ trợ.")
    }
  }

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Cài đặt tài khoản</h1>
        <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Thông tin cá nhân</CardTitle>
                <CardDescription>Cập nhật tên hiển thị và thông tin tài khoản</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{name || "Potato User"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
                <div className="mt-1">
                  {user?.role === "ADMIN" ? (
                    user?.email === "superadmin@potato.com" ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        <Shield className="h-3 w-3 mr-1" /> Super Admin
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        <Shield className="h-3 w-3 mr-1" /> Admin Project
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary" className="text-xs">Nhà phát triển</Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted border-border"
                  placeholder="Tên của bạn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted border-border opacity-60"
                />
              </div>
            </div>

            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu thay đổi
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Password Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Đổi mật khẩu</CardTitle>
                <CardDescription>Mật khẩu phải có ít nhất 6 ký tự</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPwd">Mật khẩu hiện tại</Label>
              <div className="relative">
                <Input
                  id="currentPwd"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-muted border-border pr-10"
                  placeholder="••••••••"
                />
                <Button
                  variant="ghost" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                  type="button"
                >
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPwd">Mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="newPwd"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-muted border-border pr-10"
                    placeholder="••••••••"
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowNew(!showNew)}
                    type="button"
                  >
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Xác nhận mật khẩu mới</Label>
                <div className="relative">
                  <Input
                    id="confirmPwd"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`bg-muted border-border pr-10 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  {confirmPassword && newPassword === confirmPassword && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              onClick={handleChangePassword}
              disabled={isSavingPassword || !currentPassword || !newPassword}
            >
              {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Đổi mật khẩu
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Thông báo</CardTitle>
                <CardDescription>Cấu hình các loại thông báo bạn muốn nhận</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: "email", label: "Thông báo qua Email", desc: "Nhận email khi có sự kiện quan trọng", value: emailNotifs, setter: setEmailNotifs },
              { id: "ssl", label: "Cảnh báo hết hạn SSL", desc: "Cảnh báo khi chứng chỉ SSL sắp hết hạn", value: sslAlerts, setter: setSslAlerts },
              { id: "deploy", label: "Thông báo Triển khai", desc: "Thông báo khi deploy thành công hoặc thất bại", value: deployAlerts, setter: setDeployAlerts },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.value} onCheckedChange={item.setter} />
              </div>
            ))}
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => toast.success("Cài đặt thông báo đã được lưu!")}>
              <Save className="mr-2 h-4 w-4" />
              Lưu cài đặt
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-red-500/30 bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <CardTitle className="text-lg text-red-400">Vùng nguy hiểm</CardTitle>
                <CardDescription>Các thao tác không thể hoàn tác</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div>
                <p className="font-medium text-foreground">Xóa tài khoản</p>
                <p className="text-sm text-muted-foreground">Xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan</p>
              </div>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setDeleteAccountOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa tài khoản
              </Button>
              <ConfirmDialog
                open={deleteAccountOpen}
                title="Xóa tài khoản vĩnh viễn?"
                description="Hành động này sẽ xóa toàn bộ dự án, database và mọi dữ liệu liên quan. Không thể hoàn tác."
                confirmLabel="Xóa tài khoản"
                onConfirm={() => { setDeleteAccountOpen(false); handleDeleteAccount() }}
                onCancel={() => setDeleteAccountOpen(false)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
