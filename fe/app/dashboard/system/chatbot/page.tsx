"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bot, Save, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

export default function ChatbotSettingsPage() {
  const [isChatbotEnabled, setIsChatbotEnabled] = useState(true)
  const [chatbotSystemPrompt, setChatbotSystemPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const data = await apiFetch<any>("/system/config")
      setIsChatbotEnabled(data.isChatbotEnabled)
      setChatbotSystemPrompt(data.chatbotSystemPrompt)
    } catch (e: any) {
      toast.error(e.message || "Không thể tải cấu hình")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await apiFetch("/system/config", {
        method: "PATCH",
        body: JSON.stringify({
          isChatbotEnabled,
          chatbotSystemPrompt,
        }),
      })
      toast.success("Đã lưu cấu hình AI Chatbot thành công!")
      // Tải lại trang để áp dụng
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message || "Không thể lưu cấu hình")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Chatbot CMS</h2>
        <p className="text-muted-foreground mt-2">
          Quản lý Trợ lý ảo AI của hệ thống. Tùy chỉnh "Não bộ" (System Prompt) và bật/tắt hiển thị Chat Widget.
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle>Cấu hình Trợ lý ảo (Potato Bot)</CardTitle>
            </div>
            <CardDescription>
              Thay đổi luật lệ và kiến thức của AI. Các thay đổi sẽ được áp dụng ngay lập tức mà không cần khởi động lại.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="chatbot-toggle" className="text-base font-semibold">Trạng thái Chatbot</Label>
                <p className="text-sm text-muted-foreground">
                  Bật để hiển thị Chat Widget ở góc phải dưới màn hình.
                </p>
              </div>
              <Switch
                id="chatbot-toggle"
                checked={isChatbotEnabled}
                onCheckedChange={setIsChatbotEnabled}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="system-prompt" className="text-base font-semibold">Chỉ thị Hệ thống (System Prompt)</Label>
                <div className="flex items-center text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md text-primary">
                  <Info className="h-3 w-3 mr-1" />
                  Markdown Hỗ trợ
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Hãy viết thật rõ ràng các tính năng, bảng giá, hoặc thái độ bạn muốn AI thể hiện. Càng chi tiết AI càng thông minh.
              </p>
              <Textarea
                id="system-prompt"
                value={chatbotSystemPrompt}
                onChange={(e) => setChatbotSystemPrompt(e.target.value)}
                placeholder="Bạn là chuyên gia hỗ trợ của hệ thống..."
                className="min-h-[400px] font-mono text-sm leading-relaxed resize-y"
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t border-border px-6 py-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
