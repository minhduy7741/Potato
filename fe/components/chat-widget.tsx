"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api"
import { PotatoLogo } from "./potato-logo"

interface Message {
  id: string
  role: "user" | "bot"
  content: string
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "bot", content: "Chào bạn! Tôi là Potato Bot. Tôi có thể giúp gì cho bạn hôm nay?" }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isOpen])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue("")
    
    // Add user message
    const newMessages = [...messages, { id: Date.now().toString(), role: "user" as const, content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    // Chuẩn bị history (bỏ tin nhắn welcome đầu tiên cho nhẹ)
    const history = newMessages.slice(1).map(m => ({ role: m.role, content: m.content }))

    try {
      // Local keyword matching (Lớp 1: Bắt Keyword)
      const lowerMsg = userMessage.toLowerCase()
      if (lowerMsg.includes("giá") || lowerMsg.includes("tiền") || lowerMsg.includes("chi phí")) {
        setTimeout(() => {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", content: "Hiện tại Potato PaaS đang hoàn toàn miễn phí trong quá trình thử nghiệm. Bạn cứ thoải mái sử dụng nhé!" }])
          setIsLoading(false)
        }, 500)
        return
      }

      // Lớp 2 & 3: Gọi lên Backend
      const res = await apiFetch<{ answer: string }>("/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage, history }),
        skipAuth: true // Để ai cũng chat được kể cả chưa đăng nhập
      })

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", content: res.answer }])
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", content: "Xin lỗi, tôi đang gặp chút sự cố kết nối. Vui lòng thử lại sau." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Nút nổi */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 p-0 flex items-center justify-center border-2 border-background"
            >
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cửa sổ Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[350px] sm:w-[400px] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{ height: "min(600px, calc(100vh - 48px))" }}
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-background/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <PotatoLogo className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground leading-none">Potato Bot</h3>
                  <span className="text-xs text-primary-foreground/80">Trợ lý ảo AI 24/7</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-background/20 rounded-full h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-muted" : "bg-primary/20"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-background border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-end gap-2 flex-row">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-background border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-background flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 rounded-full border-border bg-muted/50 focus-visible:ring-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="rounded-full h-10 w-10 p-0 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
