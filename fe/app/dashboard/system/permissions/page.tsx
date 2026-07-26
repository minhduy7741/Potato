"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Users,
  Shield,
  Trash2,
  Edit2,
  Lock,
  Plus,
  Key,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const AVAILABLE_ACTIONS = [
  { id: "project:read", name: "Xem thông tin dự án", desc: "Xem chi tiết dự án, hoạt động và tiến trình deploy" },
  { id: "project:start", name: "Khởi chạy (Start)", desc: "Bật container của dự án" },
  { id: "project:stop", name: "Dừng (Stop)", desc: "Tắt container của dự án" },
  { id: "project:restart", name: "Khởi động lại (Restart)", desc: "Chạy lại container của dự án" },
  { id: "project:hibernate", name: "Ngủ đông (Hibernate)", desc: "Đưa container về chế độ dừng nghỉ" },
  { id: "project:delete", name: "Xóa dự án", desc: "Xóa vĩnh viễn dự án khỏi hệ thống" },
  { id: "project:settings", name: "Cấu hình dự án", desc: "Đổi Tên miền, Volume, Slack Webhook, Restart Policy" },
  { id: "project:resources", name: "Cấp phát tài nguyên", desc: "Thay đổi RAM và CPU limit của dự án" },
  { id: "project:deploy", name: "Triển khai Git", desc: "Thực hiện Deploy và Rollback phiên bản build" },
  { id: "env:read", name: "Xem biến môi trường", desc: "Đọc các giá trị biến môi trường cấu hình" },
  { id: "env:write", name: "Cấu hình biến môi trường", desc: "Thêm, sửa, xóa biến môi trường" },
  { id: "member:manage", name: "Quản lý thành viên", desc: "Thêm/xóa lập trình viên khác vào dự án" },
  { id: "database:manage", name: "Quản lý Database", desc: "Tạo, xóa, sao lưu cơ sở dữ liệu Sprout" },
  { id: "system:project:create", name: "Tạo dự án mới", desc: "Quyền được phép khởi tạo project/plot mới trên hệ thống" },
  { id: "system:user:manage", name: "Quản lý tài khoản hệ thống", desc: "Thêm, sửa thông tin, phân vai trò, xóa tài khoản" },
  { id: "system:role:manage", name: "Quản lý vai trò & quyền hạn", desc: "Tạo mới, sửa đổi quyền hạn của các Custom Roles" },
  { id: "system:infrastructure:read", name: "Giám sát tài nguyên hạ tầng", desc: "Được phép xem biểu đồ tài nguyên CPU/RAM/Disk máy chủ" }
]

export default function AccessControlPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users")
  
  // Users States
  const [users, setUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // User Actions Modals
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRole, setCreateRole] = useState("DEVELOPER")
  const [createCustomRoleId, setCreateCustomRoleId] = useState<string>("none")
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editModalUser, setEditModalUser] = useState<any>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editCustomRoleId, setEditCustomRoleId] = useState<string>("none")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [editSelectedProjects, setEditSelectedProjects] = useState<number[]>([])
  const [createSelectedProjects, setCreateSelectedProjects] = useState<number[]>([])

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null)

  // Roles States
  const [customRoles, setCustomRoles] = useState<any[]>([])
  const [roleDeletingId, setRoleDeletingId] = useState<number | null>(null)
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [roleCreateOpen, setRoleCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([])

  // Edit Role States
  const [editRoleModal, setEditRoleModal] = useState<any>(null)
  const [editRoleName, setEditRoleName] = useState("")
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([])
  const [editRoleSubmitting, setEditRoleSubmitting] = useState(false)

  const [deleteConfirmRole, setDeleteConfirmRole] = useState<any>(null)

  const fetchCustomRoles = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/roles")
      setCustomRoles(data)
    } catch {}
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/projects")
      setProjects(data || [])
    } catch {}
  }, [])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await apiFetch<any[]>("/admin/users")
      setUsers(data)
    } catch (err: any) {
      toast.error(err.message || "Không thể tải danh sách người dùng")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Check auth
  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (!userJson) { router.push("/login"); return }
    const user = JSON.parse(userJson)
    setCurrentUser(user)

    const isSystemAdmin = user?.role === "ADMIN"
    const permissions = user?.customRole?.permissions || []
    const canManagePermissions = isSystemAdmin || permissions.includes("system:role:manage") || permissions.includes("system:user:manage")

    // Verify if Admin or has custom permission
    if (!canManagePermissions) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    setLoading(false)
    fetchUsers()
    fetchCustomRoles()
    fetchProjects()
  }, [router, fetchUsers, fetchCustomRoles, fetchProjects])

  // Sync edit modal state
  useEffect(() => {
    if (editModalUser) {
      setEditName(editModalUser.name || "")
      setEditEmail(editModalUser.email || "")
      setEditPassword("")
      setEditRole(editModalUser.role || "DEVELOPER")
      setEditCustomRoleId(editModalUser.customRoleId ? String(editModalUser.customRoleId) : "none")
      
      const userProjIds = editModalUser.memberships?.map((m: any) => m.projectId) || []
      setEditSelectedProjects(userProjIds)
    }
  }, [editModalUser])

  // Sync edit role state
  useEffect(() => {
    if (editRoleModal) {
      setEditRoleName(editRoleModal.name || "")
      setEditRolePermissions(editRoleModal.permissions || [])
    }
  }, [editRoleModal])

  // CRUD User Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createEmail.trim() || !createPassword.trim() || !createName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin")
      return
    }
    setCreateSubmitting(true)
    let newUserId: number | null = null
    try {
      // 1. Tạo tài khoản thông thường qua auth/register
      const regResult = await apiFetch<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          parentId: currentUser?.id,
        }),
      })
      newUserId = regResult.user.id

      // 2. Gán vai trò (role / customRoleId) & Dự án tham gia
      await apiFetch(`/users/${regResult.user.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: createRole,
          customRoleId: createCustomRoleId === "none" ? null : parseInt(createCustomRoleId, 10),
          projectIds: createSelectedProjects,
        }),
      })

      toast.success("Tạo tài khoản người dùng mới thành công!")
      setCreateName("")
      setCreateEmail("")
      setCreatePassword("")
      setCreateRole("DEVELOPER")
      setCreateCustomRoleId("none")
      setCreateSelectedProjects([])
      setCreateUserOpen(false)
      fetchUsers()
    } catch (err: any) {
      // Nếu bước 1 thành công nhưng bước 2 thất bại → rollback: xóa user vừa tạo
      if (newUserId) {
        try {
          await apiFetch(`/admin/users/${newUserId}`, { method: "DELETE" })
        } catch {}
      }
      toast.error(err.message || "Không thể tạo tài khoản")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSubmitting(true)
    try {
      // 1. Cập nhật thông tin cơ bản
      await apiFetch(`/admin/users/${editModalUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined,
        }),
      })

      // 2. Cập nhật vai trò & Dự án tham gia
      await apiFetch(`/users/${editModalUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
          customRoleId: editCustomRoleId === "none" ? null : parseInt(editCustomRoleId, 10),
          projectIds: editSelectedProjects,
        }),
      })

      toast.success("Cập nhật tài khoản thành công!")
      setEditModalUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật tài khoản")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "DELETE",
      })
      toast.success("Đã xóa tài khoản người dùng thành công!")
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa người dùng")
    }
  }

  // CRUD Role Handlers
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) {
      toast.error("Tên vai trò không được để trống")
      return
    }
    setRoleSubmitting(true)
    try {
      await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({
          name: newRoleName,
          assignableByManager: false,
          permissions: newRolePermissions,
        }),
      })
      toast.success("Tạo vai trò tùy biến mới thành công!")
      setNewRoleName("")
      setNewRolePermissions([])
      setRoleCreateOpen(false)
      fetchCustomRoles()
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo vai trò")
    } finally {
      setRoleSubmitting(false)
    }
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRoleName.trim()) {
      toast.error("Tên vai trò không được để trống")
      return
    }
    setEditRoleSubmitting(true)
    try {
      await apiFetch(`/roles/${editRoleModal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editRoleName,
          assignableByManager: false,
          permissions: editRolePermissions,
        }),
      })
      toast.success("Cập nhật vai trò thành công!")
      setEditRoleModal(null)
      fetchCustomRoles()
      fetchUsers() // Tải lại Users để hiển thị đúng customRole mới cập nhật
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật vai trò")
    } finally {
      setEditRoleSubmitting(false)
    }
  }

  const handleDeleteRole = async (id: number) => {
    setRoleDeletingId(id)
    try {
      await apiFetch(`/roles/${id}`, {
        method: "DELETE",
      })
      toast.success("Xóa vai trò tùy biến thành công!")
      fetchCustomRoles()
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa vai trò")
    } finally {
      setRoleDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Đang tải cấu hình phân quyền...</p>
        </div>
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Truy cập bị từ chối</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Bạn không có quyền hệ thống để quản lý phân quyền và tài khoản (`system:user:manage`).
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Quay lại Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quản lý phân quyền</h1>
              <p className="text-sm text-muted-foreground">Phân bổ tài khoản, tạo vai trò và phân quyền chi tiết hệ thống</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "users" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={usersLoading}
                className="border-border"
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", usersLoading && "animate-spin")} />
                Tải lại danh sách
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateUserOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Tạo tài khoản
              </Button>
            </>
          )}
          {activeTab === "roles" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCustomRoles}
                disabled={roleSubmitting}
                className="border-border"
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", roleSubmitting && "animate-spin")} />
                Tải lại vai trò
              </Button>
              <Button
                size="sm"
                onClick={() => setRoleCreateOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Tạo vai trò
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border gap-2">
        <Button
          variant={activeTab === "users" ? "secondary" : "ghost"}
          className={cn(
            "rounded-none border-b-2 px-4 py-2 text-sm font-medium h-9 bg-transparent hover:bg-muted/50 transition-colors",
            activeTab === "users" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("users")}
        >
          <Users className="mr-2 h-4 w-4" />
          Quản lý tài khoản ({users.length})
        </Button>
        <Button
          variant={activeTab === "roles" ? "secondary" : "ghost"}
          className={cn(
            "rounded-none border-b-2 px-4 py-2 text-sm font-medium h-9 bg-transparent hover:bg-muted/50 transition-colors",
            activeTab === "roles" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("roles")}
        >
          <Key className="mr-2 h-4 w-4" />
          Vai trò tùy biến ({customRoles.length})
        </Button>
      </div>

      {/* Tab: Users Management */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Danh sách tài khoản</CardTitle>
              <CardDescription>Quản lý vai trò và tài khoản của các lập trình viên trên hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {usersLoading && users.length === 0 ? (
                <div className="flex h-36 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex h-36 flex-col items-center justify-center text-muted-foreground text-sm">
                  Không tìm thấy người dùng nào
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                      <th className="px-6 py-3">Lập trình viên</th>
                      <th className="px-6 py-3">Vai trò hệ thống</th>
                      <th className="px-6 py-3">Số dự án</th>
                      <th className="px-6 py-3">Ngày gia nhập</th>
                      <th className="px-6 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((u) => {
                      const isMe = u.id === currentUser?.id
                      return (
                        <tr key={u.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                                {u.name ? u.name.slice(0, 2) : u.email.slice(0, 2)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                                  {u.name || "Chưa đặt tên"}
                                  {isMe && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20">Tôi</Badge>}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {u.role === "ADMIN" ? (
                              u.email === "superadmin@potato.com" ? (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] gap-1">
                                  <Shield className="h-3 w-3" /> Super Admin
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] gap-1">
                                  <Shield className="h-3 w-3" /> Admin Project
                                </Badge>
                              )
                            ) : u.customRole ? (
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-medium">
                                🎭 {u.customRole.name}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                👤 Thành viên thường
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-foreground">{u._count?.projects ?? 0} dự án</td>
                          <td className="px-6 py-4 text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                onClick={() => setEditModalUser(u)}
                                disabled={isMe}
                                title="Sửa thông tin"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => setDeleteConfirmUser(u)}
                                disabled={isMe || u.role === "ADMIN"}
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tab: Custom Roles */}
      {activeTab === "roles" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {customRoles.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-muted-foreground text-sm border border-border border-dashed rounded-2xl p-6 bg-card">
              <Key className="h-8 w-8 opacity-25 mb-2 text-primary" />
              <p className="font-semibold">Chưa có vai trò tùy biến nào</p>
              <p className="text-xs opacity-75 mt-0.5">Nhấn "Tạo vai trò" để định nghĩa phân quyền mới cho công ty</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customRoles.map((role) => (
                <Card key={role.id} className="border-border bg-card flex flex-col justify-between overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-2 pl-5 pr-4 pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-1.5 text-foreground">
                          🎭 {role.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditRoleModal(role)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md"
                          title="Sửa quyền"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmRole(role)}
                          disabled={roleDeletingId === role.id}
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-md"
                          title="Xóa vai trò"
                        >
                          {roleDeletingId === role.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 pl-5">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Quyền hạn ({role.permissions?.length ?? 0}/{AVAILABLE_ACTIONS.length})
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.map((action: string) => {
                            const matched = AVAILABLE_ACTIONS.find(a => a.id === action)
                            return (
                              <Badge key={action} variant="outline" className="text-[9px] bg-muted/40 px-2 py-0.5 border-border text-muted-foreground font-mono">
                                {matched ? matched.name : action}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Không có quyền nào</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Modal: Create User */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl my-8"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Tạo tài khoản mới</h3>
              <p className="text-xs text-muted-foreground mt-1">Đăng ký tài khoản và phân quyền cho lập trình viên mới</p>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Họ và tên</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    placeholder="VD: Nguyễn Văn A"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    placeholder="VD: dev@company.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Mật khẩu ban đầu</label>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    placeholder="Mật khẩu từ 6 ký tự..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Loại tài khoản</label>
                  <select
                    value={createRole}
                    onChange={(e) => {
                      setCreateRole(e.target.value)
                      if (e.target.value === "ADMIN") setCreateCustomRoleId("none")
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="DEVELOPER">Thành viên thường</option>
                    <option value="ADMIN">Admin Project (Toàn quyền dự án)</option>
                  </select>
                </div>

                {createRole === "DEVELOPER" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Gán vai trò tùy biến</label>
                    <select
                      value={createCustomRoleId}
                      onChange={(e) => setCreateCustomRoleId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="none">Không gán (Thành viên thường)</option>
                      {customRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          🎭 {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Chọn dự án được phép tham gia */}
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Dự án được phép tham gia</label>
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa có dự án nào được tạo.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {projects.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/10 p-1.5 rounded-lg border border-border/30">
                          <input
                            type="checkbox"
                            checked={createSelectedProjects.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreateSelectedProjects([...createSelectedProjects, p.id])
                              } else {
                                setCreateSelectedProjects(createSelectedProjects.filter(id => id !== p.id))
                              }
                            }}
                            className="rounded border-border bg-muted text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreateUserOpen(false)} disabled={createSubmitting}>Hủy</Button>
                <Button type="submit" disabled={createSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {createSubmitting ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Đang tạo...</>
                  ) : "Tạo tài khoản"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl my-8"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Sửa thông tin tài khoản</h3>
              <p className="text-xs text-muted-foreground mt-1">Cập nhật họ tên, mật khẩu và vai trò cho thành viên</p>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Họ và tên</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Mật khẩu mới (Để trống nếu giữ nguyên)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    placeholder="Mật khẩu tối thiểu 6 ký tự..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Vai trò hệ thống</label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      setEditRole(e.target.value)
                      if (e.target.value === "ADMIN") setEditCustomRoleId("none")
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="DEVELOPER">Thành viên thường (Chưa gán vai trò)</option>
                    <option value="ADMIN">Admin Project</option>
                  </select>
                </div>

                {editRole === "DEVELOPER" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Gán vai trò tùy biến</label>
                    <select
                      value={editCustomRoleId}
                      onChange={(e) => setEditCustomRoleId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="none">Không gán (Thành viên thường)</option>
                      {customRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground mt-1">
                  {editRole === "ADMIN" && "⚡ Toàn quyền dự án"}
                  {editRole === "DEVELOPER" && editCustomRoleId === "none" && "👤 Tài khoản thường — chưa gán vai trò tùy biến"}
                  {editRole === "DEVELOPER" && editCustomRoleId !== "none" && (() => {
                    const r = customRoles.find(x => String(x.id) === editCustomRoleId)
                    return r ? `🎭 ${r.permissions?.length ?? 0} quyền hệ thống được cấp` : ""
                  })()}
                </p>

                {/* Chọn dự án được phép tham gia */}
                <div className="space-y-1.5 border-t border-border/50 pt-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Dự án được phép tham gia</label>
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa có dự án nào được tạo.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {projects.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/10 p-1.5 rounded-lg border border-border/30">
                          <input
                            type="checkbox"
                            checked={editSelectedProjects.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditSelectedProjects([...editSelectedProjects, p.id])
                              } else {
                                setEditSelectedProjects(editSelectedProjects.filter(id => id !== p.id))
                              }
                            }}
                            className="rounded border-border bg-muted text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditModalUser(null)} disabled={editSubmitting}>Hủy</Button>
                <Button type="submit" disabled={editSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {editSubmitting ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Đang lưu...</>
                  ) : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Create Role */}
      {roleCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl my-8"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Tạo vai trò tùy biến mới</h3>
              <p className="text-xs text-muted-foreground mt-1">Định nghĩa vai trò mới và phân quyền chi tiết từng hành động trên hệ thống</p>
            </div>
            <form onSubmit={handleCreateRole}>
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tên vai trò</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    placeholder="VD: CTO, QA Lead, Viewer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">
                    Bảng cấu hình quyền hạn ({newRolePermissions.length}/{AVAILABLE_ACTIONS.length})
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {AVAILABLE_ACTIONS.map((action) => {
                      const isChecked = newRolePermissions.includes(action.id)
                      return (
                        <div
                          key={action.id}
                          onClick={() => {
                            if (isChecked) {
                              setNewRolePermissions(newRolePermissions.filter(p => p !== action.id))
                            } else {
                              setNewRolePermissions([...newRolePermissions, action.id])
                            }
                          }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                            isChecked 
                              ? "bg-primary/5 border-primary/40 shadow-sm" 
                              : "bg-muted/10 border-border/60 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors",
                            isChecked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                          )}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{action.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{action.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRoleCreateOpen(false)} disabled={roleSubmitting}>Hủy</Button>
                <Button type="submit" disabled={roleSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {roleSubmitting ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Đang tạo...</>
                  ) : "Tạo vai trò"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Edit Role */}
      {editRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl my-8"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Chỉnh sửa vai trò</h3>
              <p className="text-xs text-muted-foreground mt-1">Cập nhật tên và danh sách quyền cho vai trò <span className="font-semibold text-foreground">{editRoleModal.name}</span></p>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tên vai trò</label>
                  <input
                    type="text"
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground outline-none focus:border-primary/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block">
                    Quyền hạn ({editRolePermissions.length}/{AVAILABLE_ACTIONS.length})
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AVAILABLE_ACTIONS.map((action) => {
                      const isChecked = editRolePermissions.includes(action.id)
                      return (
                        <div
                          key={action.id}
                          onClick={() => {
                            if (isChecked) {
                              setEditRolePermissions(editRolePermissions.filter(p => p !== action.id))
                            } else {
                              setEditRolePermissions([...editRolePermissions, action.id])
                            }
                          }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none",
                            isChecked ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-muted/10 border-border/60 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors",
                            isChecked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                          )}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{action.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{action.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditRoleModal(null)} disabled={editRoleSubmitting}>Hủy</Button>
                <Button type="submit" disabled={editRoleSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {editRoleSubmitting ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Đang lưu...</>
                  ) : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation: Delete User */}
      <ConfirmDialog
        open={!!deleteConfirmUser}
        title="Xóa tài khoản người dùng"
        description={`Bạn có chắc chắn muốn xóa tài khoản "${deleteConfirmUser?.email}"? Hành động này sẽ hủy kích hoạt tài khoản và xóa sạch tất cả dự án/database liên quan của lập trình viên này khỏi hệ thống.`}
        confirmLabel="Xóa tài khoản"
        cancelLabel="Hủy"
        onConfirm={async () => {
          if (deleteConfirmUser) {
            await handleDeleteUser(deleteConfirmUser.id)
            setDeleteConfirmUser(null)
          }
        }}
        onCancel={() => setDeleteConfirmUser(null)}
        variant="danger"
      />

      {/* Confirmation: Delete Role */}
      <ConfirmDialog
        open={!!deleteConfirmRole}
        title="Xóa vai trò tùy biến"
        description={`Bạn có chắc chắn muốn xóa vai trò "${deleteConfirmRole?.name}"? Các tài khoản đang được gán vai trò này sẽ quay trở về làm Thành viên thường (Chưa gán vai trò).`}
        confirmLabel="Xóa vai trò"
        cancelLabel="Hủy"
        onConfirm={async () => {
          if (deleteConfirmRole) {
            await handleDeleteRole(deleteConfirmRole.id)
            setDeleteConfirmRole(null)
          }
        }}
        onCancel={() => setDeleteConfirmRole(null)}
        variant="danger"
      />
    </div>
  )
}
