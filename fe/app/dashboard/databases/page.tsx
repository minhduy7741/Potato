"use client"

import { useState, useEffect } from "react"
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
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { CreateDatabaseModal } from "@/components/dashboard/create-database-modal"

export default function DatabasesPage() {
  const [databases, setDatabases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [prevRunningCount, setPrevRunningCount] = useState<number>(0)

  const fetchDatabases = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    try {
      const response = await fetch("http://localhost:3000/api/databases")
      if (!response.ok) throw new Error("Không thể tải danh sách database")
      const data = await response.json()
      
      // Kiểm tra xem có database nào vừa chuyển sang 'running' không để báo Toast
      const currentRunningCount = data.filter((d: any) => d.status === 'running').length
      if (prevRunningCount > 0 && currentRunningCount > prevRunningCount) {
        toast.success("Một Sprout mới đã sẵn sàng! 🐬", {
          description: "Chuỗi kết nối đã được cập nhật.",
        })
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
    if (!confirm("Bạn có chắc chắn muốn xóa Sprout này? Dữ liệu sẽ mất vĩnh viễn.")) return
    
    try {
      const response = await fetch(`http://localhost:3000/api/databases/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Lỗi khi xóa database")
      toast.success("Đã nhổ bỏ Sprout thành công")
      fetchDatabases()
    } catch (error: any) {
      toast.error(error.message)
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
                          <CardTitle className="text-lg font-bold">{db.name}</CardTitle>
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
                          <a href="https://potato-docs.local" target="_blank">
                            <Info className="mr-1.5 h-3 w-3" />
                            Doc
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-muted" disabled={db.status !== 'running'}>
                          <Lock className="mr-1.5 h-3 w-3" />
                          Credentials
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => handleDelete(db.id)}
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
    </div>
  )
}
