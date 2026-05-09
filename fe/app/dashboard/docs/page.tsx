"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useCallback } from "react"
import {
  BookOpen, Search, Globe, Lock, Terminal, Database,
  Zap, ChevronRight, Cpu, Shield, Info, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const docSections = [
  {
    icon: Zap,
    title: "Quick Start",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    articles: [
      { title: "Tạo dự án đầu tiên (Plot)", desc: "Hướng dẫn từng bước khởi tạo container đầu tiên", badge: "Mới bắt đầu" },
      { title: "Kết nối Database (Sprout)", desc: "Thêm PostgreSQL, MySQL, MongoDB, Redis vào dự án" },
      { title: "Deploy ứng dụng Node.js", desc: "Cách đóng gói và triển khai ứng dụng Node.js" },
    ]
  },
  {
    icon: Globe,
    title: "Domain & Networking",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    articles: [
      { title: "Cấu hình Custom Domain", desc: "Kết nối tên miền riêng với dự án của bạn" },
      { title: "Cấu hình DNS & CNAME Record", desc: "Thêm bản ghi DNS vào nhà cung cấp tên miền" },
      { title: "Wildcard Subdomains", desc: "Sử dụng subdomain tự động *.potato.local" },
    ]
  },
  {
    icon: Lock,
    title: "SSL & Security",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    articles: [
      { title: "Kích hoạt SSL/HTTPS", desc: "Mã hóa traffic với chứng chỉ SSL tự động (Let's Encrypt)", badge: "Quan trọng" },
      { title: "Force HTTPS Redirect", desc: "Cưỡng bức toàn bộ traffic qua HTTPS" },
      { title: "Auto-renewal Certificate", desc: "Hệ thống tự gia hạn chứng chỉ trước 7 ngày" },
    ]
  },
  {
    icon: Terminal,
    title: "Logs & Monitoring",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    articles: [
      { title: "Real-time Container Logs", desc: "Xem logs trực tiếp qua WebSocket" },
      { title: "Download Log File", desc: "Tải toàn bộ lịch sử log về máy (.txt)" },
      { title: "CPU & RAM Metrics", desc: "Theo dõi tài nguyên container theo thời gian thực" },
    ]
  },
  {
    icon: Database,
    title: "Database Management",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    articles: [
      { title: "Provisioning Database", desc: "Tự động khởi tạo container database mới" },
      { title: "Connection Strings", desc: "Lấy chuỗi kết nối và thêm vào biến môi trường" },
      { title: "Database Backup", desc: "Cấu hình backup tự động (coming soon)", badge: "Sắp ra mắt" },
    ]
  },
  {
    icon: Cpu,
    title: "Resource Control",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    articles: [
      { title: "RAM & CPU Limits", desc: "Cấu hình giới hạn tài nguyên cho container" },
      { title: "Auto-Scaling", desc: "Tự động mở rộng tài nguyên khi cần thiết (coming soon)", badge: "Sắp ra mắt" },
      { title: "Start, Stop & Restart", desc: "Điều khiển vòng đời container từ Dashboard" },
    ]
  },
]

const badgeColors: Record<string, string> = {
  "Mới bắt đầu": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Quan trọng": "bg-red-500/20 text-red-400 border-red-500/30",
  "Sắp ra mắt": "bg-muted text-muted-foreground border-border",
}

export default function DocsPage() {
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState<{ title: string } | null>(null)

  const showToast = useCallback((title: string) => {
    setToast({ title })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const filtered = docSections.map((section) => ({
    ...section,
    articles: section.articles.filter(
      (a) =>
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => !search || s.articles.length > 0)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
            <p className="text-sm text-muted-foreground">Hướng dẫn sử dụng toàn diện cho Potato IDP</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="pl-10 bg-muted border-border h-11 text-sm"
          />
        </div>
      </motion.div>

      {/* Quick Nav Banner */}
      {!search && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Bắt đầu với Potato IDP</p>
              <p className="text-xs text-muted-foreground">Đọc phần <strong>Quick Start</strong> để tạo dự án đầu tiên trong dưới 5 phút!</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sections Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`border bg-card h-full ${section.bg}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {section.articles.map((article) => (
                  <button
                    key={article.title}
                    onClick={() => showToast(article.title)}
                    className="w-full text-left rounded-lg p-3 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {article.title}
                          </p>
                          {article.badge && (
                            <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${badgeColors[article.badge] || ""}`}>
                              {article.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Không tìm thấy tài liệu phù hợp</p>
        </div>
      )}

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          Potato IDP Documentation — Nếu bạn cần hỗ trợ, hãy liên hệ team Potato! 🥔
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-sm shadow-xl px-4 py-3.5 max-w-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">📖 Tài liệu đang biên soạn</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Bài viết <span className="font-medium text-foreground">&ldquo;{toast.title}&rdquo;</span> sẽ sớm có mặt. Hãy quay lại sau nhé!
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
