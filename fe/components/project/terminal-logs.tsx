"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Terminal, Copy, Check, Pause, Play, Trash2, Download, Search, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface TerminalLogsProps {
  projectId: number
  projectName: string
}

type LogLevel = "all" | "info" | "warn" | "error"

const LEVELS: { label: string; value: LogLevel; color: string }[] = [
  { label: "All", value: "all", color: "text-muted-foreground" },
  { label: "Info", value: "info", color: "text-blue-400" },
  { label: "Warn", value: "warn", color: "text-amber-400" },
  { label: "Error", value: "error", color: "text-red-400" },
]

export function TerminalLogs({ projectId, projectName }: TerminalLogsProps) {
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all")
  const [showSearch, setShowSearch] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io("http://localhost:3000/logs")
    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("join_project", { projectId })
    })

    socket.on("log", (message: string) => {
      if (isPlaying) {
        const type = message.toLowerCase().includes("error")
          ? "error"
          : message.toLowerCase().includes("warn")
          ? "warn"
          : "info"
        setLogs((prev) => [...prev.slice(-499), { type, message }])
      }
    })

    socket.on("log_error", (err: any) => {
      setLogs((prev) => [...prev, { type: "error", message: `[ERROR] ${err.message}` }])
    })

    return () => { socket.disconnect() }
  }, [projectId, isPlaying])

  useEffect(() => {
    if (containerRef.current && isPlaying) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, isPlaying])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesLevel = levelFilter === "all" || log.type === levelFilter
      const matchesSearch = !search || log.message.toLowerCase().includes(search.toLowerCase())
      return matchesLevel && matchesSearch
    })
  }, [logs, levelFilter, search])

  const handleCopy = () => {
    const text = filteredLogs.map((l) => l.message).join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${projectId}/logs/download`)
      if (!response.ok) throw new Error("Không thể tải nhật ký")
      const data = await response.json()
      const blob = new Blob([data.content], { type: "text/plain" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = data.filename
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      toast.success("Đã tải xong nhật ký")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDownloading(false)
    }
  }

  const getLogColor = (type: string, message: string) => {
    if (type === "error" || message.includes("ERROR")) return "text-red-400"
    if (type === "warn" || message.includes("WARN")) return "text-amber-400"
    if (message.includes("success") || message.includes("SUCCESS")) return "text-emerald-400"
    return "text-muted-foreground"
  }

  const highlightSearch = (text: string) => {
    if (!search) return text
    const idx = text.toLowerCase().indexOf(search.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    )
  }

  const counts = {
    error: logs.filter(l => l.type === "error").length,
    warn: logs.filter(l => l.type === "warn").length,
    info: logs.filter(l => l.type === "info").length,
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-[#0d0d0d] overflow-hidden shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-[#1a1a1a] px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Terminal className="h-4 w-4" />
            <span>{projectName.toLowerCase()} @ ~{filteredLogs.length}/{logs.length} lines</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-border/50" onClick={() => setShowSearch(!showSearch)} title="Tìm kiếm">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-border/50" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? "Tạm dừng" : "Tiếp tục"}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-border/50" onClick={handleDownload} disabled={isDownloading} title="Tải nhật ký">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-border/50" onClick={() => setLogs([])} title="Xóa màn hình">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-border/50" onClick={handleCopy} title="Sao chép">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-border/50 bg-[#111] px-4 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trong logs..."
              className="pl-7 h-7 text-xs bg-black/40 border-border/50 font-mono text-muted-foreground"
              autoFocus
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2" onClick={() => setSearch("")}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevelFilter(l.value)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono transition-colors",
                  levelFilter === l.value
                    ? "bg-border text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
                {l.value !== "all" && counts[l.value as keyof typeof counts] > 0 && (
                  <span className={cn("ml-1 opacity-70", l.color)}>
                    {counts[l.value as keyof typeof counts]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <div
        ref={containerRef}
        className="h-[460px] overflow-y-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border bg-black/40"
      >
        {filteredLogs.length === 0 && (
          <div className="text-muted-foreground/30 flex items-center gap-2 italic">
            {logs.length === 0 ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Đang chờ nhật ký từ container...</>
            ) : (
              <>Không có log nào phù hợp với bộ lọc.</>
            )}
          </div>
        )}
        {filteredLogs.map((log, index) => (
          <div key={index} className={cn("py-0.5 break-all", getLogColor(log.type, log.message))}>
            <span className="text-muted-foreground/30 mr-3 select-none inline-block w-8">
              {index + 1}
            </span>
            {highlightSearch(log.message)}
          </div>
        ))}
        <div className="h-2" />
      </div>
    </div>
  )
}
