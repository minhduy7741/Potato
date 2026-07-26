"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Users, Plus, Shield, Trash2, Edit2, Loader2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

interface Member {
  id: number
  userId: number
  role: "LEADER" | "DEVELOPER" | "OPERATOR" | "VIEWER"
  createdAt: string
  user: {
    id: number
    name: string | null
    email: string
  }
}

interface ProjectMembersProps {
  projectId: number
  projectOwnerId?: number
}

export function ProjectMembers({ projectId, projectOwnerId }: ProjectMembersProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Modals state
  const [addOpen, setAddOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("none")
  const [selectedRole, setSelectedRole] = useState<string>("VIEWER")
  const [submitting, setSubmitting] = useState(false)

  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editRole, setEditRole] = useState<string>("VIEWER")
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteMember, setDeleteMember] = useState<Member | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiFetch<Member[]>(`/projects/${projectId}/members`)
      setMembers(data || [])
    } catch (err: any) {
      toast.error(err.message || "Không thể tải danh sách thành viên")
    }
  }, [projectId])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/admin/users")
      setAvailableUsers(data || [])
    } catch {}
  }, [])

  useEffect(() => {
    const userJson = localStorage.getItem("potato_user")
    if (userJson) {
      setCurrentUser(JSON.parse(userJson))
    }
    
    setLoading(true)
    Promise.all([fetchMembers(), fetchUsers()]).finally(() => setLoading(false))
  }, [fetchMembers, fetchUsers])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUserId === "none") {
      toast.error("Vui lòng chọn một người dùng")
      return
    }
    setSubmitting(true)
    try {
      await apiFetch(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({
          userId: parseInt(selectedUserId, 10),
          role: selectedRole,
        }),
      })
      toast.success("Đã thêm thành viên vào dự án thành công!")
      setSelectedUserId("none")
      setSelectedRole("VIEWER")
      setAddOpen(false)
      fetchMembers()
    } catch (err: any) {
      toast.error(err.message || "Không thể thêm thành viên")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return
    setEditSubmitting(true)
    try {
      await apiFetch(`/projects/${projectId}/members/${editMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
        }),
      })
      toast.success("Cập nhật vai trò thành viên thành công!")
      setEditMember(null)
      fetchMembers()
    } catch (err: any) {
      toast.error(err.message || "Không thể cập nhật vai trò")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteMember = async (memberId: number) => {
    try {
      await apiFetch(`/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      })
      toast.success("Đã xóa thành viên khỏi dự án thành công!")
      fetchMembers()
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa thành viên")
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "LEADER":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]"><Shield className="h-3 w-3 mr-1" /> LEADER</Badge>
      case "DEVELOPER":
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">DEVELOPER</Badge>
      case "OPERATOR":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">OPERATOR</Badge>
      case "VIEWER":
        return <Badge variant="secondary" className="text-[10px]">VIEWER</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-36 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground text-xs">Đang tải thành viên...</p>
        </div>
      </div>
    )
  }

  // Check if current user has management rights (Owner, Leader, Tenant Admin, or Super Admin)
  const isProjectOwner = currentUser?.id === projectOwnerId
  const isProjectLeader = members.some(m => m.userId === currentUser?.id && m.role === "LEADER")
  const isSuperAdmin = currentUser?.role === "ADMIN"
  const isTenantAdmin = currentUser && currentUser.parentId === null // Admin của doanh nghiệp
  const canManage = isProjectOwner || isProjectLeader || isSuperAdmin || isTenantAdmin

  // Filter out users who are already members
  const nonMemberUsers = availableUsers.filter(
    u => !members.some(m => m.userId === u.id)
  )

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Thành viên tham gia dự án
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quản lý những người dùng có quyền truy cập và thao tác bên trong Plot này
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Thêm thành viên
          </Button>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          {members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Chưa có thành viên nào trong dự án
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-6 py-3">Tên & Email</th>
                  <th className="px-6 py-3">Vai trò trong dự án</th>
                  <th className="px-6 py-3">Ngày tham gia</th>
                  {canManage && <th className="px-6 py-3 text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {members.map((m) => {
                  const isMe = m.userId === currentUser?.id
                  return (
                    <tr key={m.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-xs uppercase">
                            {m.user.name ? m.user.name.slice(0, 2) : m.user.email.slice(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                              {m.user.name || "Chưa đặt tên"}
                              {isMe && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/20">Tôi</Badge>}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{m.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(m.role)}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              onClick={() => {
                                setEditMember(m)
                                setEditRole(m.role)
                              }}
                              disabled={isMe && m.role === "LEADER" && !isSuperAdmin} // Leader không tự hạ role của mình nếu không phải SuperAdmin
                              title="Đổi vai trò"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => setDeleteMember(m)}
                              disabled={isMe} // Không tự xóa chính mình khỏi dự án
                              title="Xóa thành viên"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Add Member */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Thêm thành viên mới</h3>
              <p className="text-xs text-muted-foreground mt-1">Chọn thành viên trong công ty để cấp quyền truy cập dự án</p>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Chọn nhân sự</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="none">-- Chọn thành viên nhóm --</option>
                    {nonMemberUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Vai trò dự án</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="VIEWER">Viewer (Chỉ đọc Logs/Cấu hình)</option>
                    <option value="OPERATOR">Operator (Vận hành: Start/Stop/Restart)</option>
                    <option value="DEVELOPER">Developer (Phát triển: Deploy, Env, Start/Stop)</option>
                    <option value="LEADER">Leader (Trưởng dự án: Toàn quyền)</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={submitting}>Hủy</Button>
                <Button type="submit" disabled={submitting || selectedUserId === "none"} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {submitting ? "Đang thêm..." : "Thêm vào dự án"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Edit Member */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-border bg-muted/10">
              <h3 className="text-lg font-bold text-foreground">Thay đổi vai trò</h3>
              <p className="text-xs text-muted-foreground mt-1">Cập nhật vai trò dự án của <span className="font-semibold text-foreground">{editMember.user.name || editMember.user.email}</span></p>
            </div>
            <form onSubmit={handleUpdateRole}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Chọn vai trò mới</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="VIEWER">Viewer (Chỉ đọc Logs/Cấu hình)</option>
                    <option value="OPERATOR">Operator (Vận hành: Start/Stop/Restart)</option>
                    <option value="DEVELOPER">Developer (Phát triển: Deploy, Env, Start/Stop)</option>
                    <option value="LEADER">Leader (Trưởng dự án: Toàn quyền)</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditMember(null)} disabled={editSubmitting}>Hủy</Button>
                <Button type="submit" disabled={editSubmitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  {editSubmitting ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Confirmation: Delete Member */}
      <ConfirmDialog
        open={!!deleteMember}
        title="Xóa thành viên khỏi dự án"
        description={`Bạn có chắc chắn muốn xóa "${deleteMember?.user.name || deleteMember?.user.email}" khỏi dự án này? Tài khoản này sẽ mất toàn bộ quyền truy cập vào Plot này.`}
        confirmLabel="Xóa thành viên"
        onConfirm={async () => {
          if (deleteMember) {
            await handleDeleteMember(deleteMember.id)
            setDeleteMember(null)
          }
        }}
        onCancel={() => setDeleteMember(null)}
      />
    </div>
  )
}
