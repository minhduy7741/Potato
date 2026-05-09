"use client"

import { useState, useEffect, useRef } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { motion } from "framer-motion"
import { 
  Database, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  Loader2,
  Lock,
  Zap,
  Info,
  Download,
  UploadCloud,
  History,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { CreateDatabaseModal } from "@/components/dashboard/create-database-modal"
import { apiFetch } from "@/lib/api"

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [changePasswordDbId, setChangePasswordDbId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [importingId, setImportingId] = useState<number | null>(null)
  const [exportingId, setExportingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeImportDbId, setActiveImportDbId] = useState<number | null>(null)
  const [historyModalDbId, setHistoryModalDbId] = useState<number | null>(null)
  const [historyLogs, setHistoryLogs] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [prevRunningCount, setPrevRunningCount] = useState<number>(0)

  const fetchDatabases = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    try {
      const data = await apiFetch<any[]>("/databases")
      const currentRunningCount = data.filter((d) => d.status === 'running').length
      if (prevRunningCount > 0 && currentRunningCount > prevRunningCount) {
        toast.success("Một Sprout mới đã sẵn sàng! 🐬", { description: "Chuỗi kết nối đã được cập nhật." })
      }
      setPrevRunningCount(currentRunningCount)
      setDatabases(data)
    } catch (error: any) {
      if (!isSilent) toast.error(error.message)
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDatabases()
  }, [])

  // Cơ chế Polling cho các database đang provisioning
  useEffect(() => {
    const hasProvisioning = databases.some(db => db.status === 'provisioning')
    let interval: NodeJS.Timeout

    if (hasProvisioning) {
      interval = setInterval(() => {
        fetchDatabases(true) // Fetch ngầm không hiện loading spinner
      }, 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [databases])

  const handleCopy = (text: string | null, id: number) => {
    if (!text) {
      toast.error("Database chưa sẵn sàng để kết nối")
      return
    }
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success("Đã sao chép chuỗi kết nối")
  }

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/databases/${id}`, { method: "DELETE" })
      toast.success("Đã nhổ bỏ Sprout thành công")
      fetchDatabases()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Vui lòng nhập mật khẩu mới")
      return
    }
    setIsChangingPassword(true)
    try {
      await apiFetch(`/databases/${changePasswordDbId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
      })
      toast.success("Đổi mật khẩu thành công! Các biến môi trường trong dự án cũng đã được cập nhật.")
      fetchDatabases()
      setChangePasswordDbId(null)
      setNewPassword("")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleExport = async (id: number) => {
    setExportingId(id);
    try {
      const token = localStorage.getItem('potato_token');
      const res = await fetch(`http://localhost:3000/api/databases/${id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Xuất dữ liệu thất bại");
      }
      
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `export_${id}.sql`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Đã xuất dữ liệu thành công");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setExportingId(null);
    }
  }

  const triggerImport = (id: number) => {
    setActiveImportDbId(id);
    if (fileInputRef.current) fileInputRef.current.click();
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportDbId) return;
    
    setImportingId(activeImportDbId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('potato_token');
      const res = await fetch(`http://localhost:3000/api/databases/${activeImportDbId}/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Nạp dữ liệu thất bại');
      }
      
      toast.success("Nạp dữ liệu thành công!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setImportingId(null);
      setActiveImportDbId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleOpenHistory = async (id: number) => {
    setHistoryModalDbId(id);
    setIsLoadingHistory(true);
    try {
      const data = await apiFetch<any[]>(`/databases/${id}/logs`);
      setHistoryLogs(data);
    } catch (error: any) {
      toast.error("Không thể tải lịch sử thao tác");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const filteredDbs = databases.filter(db => 
    db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getDbIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'postgres': return "🐘"
      case 'mysql': return "🐬"
      case 'mongodb': return "🍃"
      case 'redis': return "🧣"
      default: return "📦"
    }
  }

  const statusConfig: Record<string, any> = {
    running: {
      label: "RUNNING",
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    provisioning: {
      label: "PROVISIONING",
      className: "bg-primary/20 text-primary border-primary/30",
    },
    error: {
      label: "ERROR",
      className: "bg-destructive/20 text-destructive border-destructive/30",
    },
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Sprouts (Databases)</h1>
          <p className="text-muted-foreground">Quản lý các instance cơ sở dữ liệu Docker của bạn.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchDatabases()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Provision Sprout
          </Button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm database theo tên hoặc loại..."
            className="pl-10 bg-muted/30 border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="px-3 py-1 border-border">
            Total: {databases.length}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Running: {databases.filter(d => d.status === 'running').length}
          </Badge>
        </div>
      </div>

      {/* Database Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Đang kiểm tra các mầm non...</p>
        </div>
      ) : filteredDbs.length === 0 ? (
        <Card className="border-dashed border-2 py-20 text-center bg-transparent">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center text-4xl">🌱</div>
            <div>
              <h3 className="text-lg font-medium">Chưa có database nào</h3>
              <p className="text-sm text-muted-foreground">Hãy gieo mầm database đầu tiên của bạn!</p>
            </div>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Provision Database</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredDbs.map((db) => {
            const statusInfo = statusConfig[db.status] || statusConfig.provisioning
            return (
              <motion.div
                key={db.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border bg-card overflow-hidden group hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shadow-inner">
                          {getDbIcon(db.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold">
                            {db.name}
                            {db.activityLogs?.some((l: any) => l.action === 'IMPORT' && l.status === 'SUCCESS') && (
                              <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5 h-4 align-middle">
                                <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                                Đã nạp dữ liệu
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                              {db.type}
                            </Badge>
                            <span className="text-xs">Project: {db.project?.name || 'Global'}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={`${statusInfo.className} text-[10px]`}>
                        {db.status === 'provisioning' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Connection String</Label>
                        <Zap className={`h-3 w-3 ${db.status === 'running' ? 'text-amber-400' : 'text-muted-foreground/30'}`} />
                      </div>
                      <div className={`group/code relative font-mono text-xs rounded-lg border border-border bg-muted/50 p-3 overflow-hidden ${db.status !== 'running' ? 'opacity-50' : ''}`}>
                        <div className="truncate pr-8">
                          {db.status === 'running' ? db.connectionString : (db.status === 'error' ? 'Provisioning failed' : 'Provisioning in progress...')}
                        </div>
                        {db.status === 'running' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
                            onClick={() => handleCopy(db.connectionString, db.id)}
                          >
                            {copiedId === db.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-muted" asChild>
                          <Link href="/dashboard/docs">
                            <Info className="mr-1.5 h-3 w-3" />
                            Doc
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-border hover:bg-muted" 
                          onClick={() => {
                            if (db.status !== 'running') {
                              toast.error("Database chưa sẵn sàng")
                              return
                            }
                            if (db.type !== 'mysql' && db.type !== 'postgres') {
                              toast.error("Hiện chỉ hỗ trợ đổi mật khẩu cho MySQL và Postgres")
                              return
                            }
                            setChangePasswordDbId(db.id)
                          }}
                        >
                          <Lock className="mr-1.5 h-3 w-3" />
                          Đổi Pass
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-border hover:bg-muted" 
                          disabled={db.status !== 'running'}
                          onClick={() => {
                            const url = new URL(db.connectionString.replace('mongodb://', 'http://')) // Helper for parsing
                            const credentials = `User: ${url.username}\nPass: ${url.password}`
                            toast.info(`Thông tin truy cập cho ${db.name}`, {
                              description: credentials,
                              duration: 10000,
                            })
                          }}
                        >
                          <Lock className="mr-1.5 h-3 w-3" />
                          Credentials
                        </Button>
                        {db.type !== 'redis' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs border-border hover:bg-muted" 
                              disabled={db.status !== 'running' || exportingId === db.id}
                              onClick={() => handleExport(db.id)}
                            >
                              {exportingId === db.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Download className="mr-1.5 h-3 w-3" />}
                              Export
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs border-border hover:bg-muted" 
                              disabled={db.status !== 'running' || importingId === db.id}
                              onClick={() => triggerImport(db.id)}
                            >
                              {importingId === db.id ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <UploadCloud className="mr-1.5 h-3 w-3" />}
                              Import
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-border hover:bg-muted" 
                          onClick={() => handleOpenHistory(db.id)}
                        >
                          <History className="mr-1.5 h-3 w-3" />
                          History
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => setPendingDeleteId(db.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <CreateDatabaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDatabases}
      />

      {/* Confirm Delete Sprout */}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Xóa Sprout này?"
        description="Dữ liệu database sẽ bị xóa vĩnh viễn và không thể khôi phục."
        confirmLabel="Xóa Sprout"
        onConfirm={() => { const id = pendingDeleteId!; setPendingDeleteId(null); handleDelete(id) }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <input type="file" ref={fileInputRef} className="hidden" accept=".sql,.archive" onChange={handleFileChange} />

      {/* Change Password Modal */}
      {changePasswordDbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-2">Đổi mật khẩu Database</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Mật khẩu mới sẽ được áp dụng ngay lập tức và tự động đồng bộ vào biến môi trường của dự án.
            </p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Mật khẩu mới</Label>
                <Input
                  type="text"
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-mono bg-muted/50 border-border"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setChangePasswordDbId(null); setNewPassword(""); }} disabled={isChangingPassword}>
                Hủy
              </Button>
              <Button onClick={handleChangePassword} disabled={isChangingPassword} className="bg-primary text-primary-foreground">
                {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Database History Modal */}
      {historyModalDbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">Lịch sử thao tác</h3>
                <p className="text-xs text-muted-foreground">
                  Bản ghi các hoạt động Import, Export và Đổi mật khẩu.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHistoryModalDbId(null)}>
                <Plus className="h-4 w-4 rotate-45" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có bản ghi lịch sử nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {log.action === 'IMPORT' ? <UploadCloud className="h-4 w-4" /> : 
                           log.action === 'EXPORT' ? <Download className="h-4 w-4" /> : 
                           <Lock className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {log.action === 'IMPORT' ? 'Nạp dữ liệu (Import)' : 
                             log.action === 'EXPORT' ? 'Xuất dữ liệu (Export)' : 
                             'Đổi mật khẩu'}
                            {log.filename && <span className="ml-2 text-xs text-muted-foreground font-normal">({log.filename})</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-[10px] ${
                          log.status === 'SUCCESS' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5'
                        }`}>
                          {log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                        </Badge>
                        {log.message && (
                          <div className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={log.message}>
                            {log.message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setHistoryModalDbId(null)}>Đóng</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
