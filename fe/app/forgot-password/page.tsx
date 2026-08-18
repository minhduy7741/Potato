"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PotatoLogo } from "@/components/potato-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { apiFetch } from "@/lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuth: true,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <PotatoLogo className="h-12 w-12" />
          <span className="text-3xl font-bold text-foreground tracking-tight">Potato</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl mx-4">
          <CardHeader>
            <CardTitle className="text-xl text-center">Khôi phục mật khẩu</CardTitle>
            <CardDescription className="text-center">
              Nhập email của bạn và chúng tôi sẽ gửi một liên kết để tạo mật khẩu mới.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm text-center mb-6">
                Một email hướng dẫn khôi phục mật khẩu đã được gửi đến địa chỉ của bạn. Vui lòng kiểm tra hộp thư đến (và thư mục Spam).
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="potato@example.com" className="pl-10 bg-background/50" required />
                  </div>
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Gửi liên kết khôi phục"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại trang Đăng nhập
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
