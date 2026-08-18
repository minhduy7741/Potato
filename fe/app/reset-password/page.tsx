"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PotatoLogo } from "@/components/potato-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Lock } from "lucide-react"
import { apiFetch } from "@/lib/api"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
        Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng quay lại và gửi lại yêu cầu.
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.")
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.")
      setIsLoading(false)
      return
    }

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
        skipAuth: true,
      })
      setSuccess(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra. Có thể mã đã hết hạn.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-sm text-center">
        Mật khẩu đã được thay đổi thành công! Trình duyệt sẽ tự động chuyển về trang Đăng nhập...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input id="newPassword" name="newPassword" type="password" placeholder="••••••••" className="pl-10 bg-background/50" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" className="pl-10 bg-background/50" required />
        </div>
      </div>
      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang lưu...
          </>
        ) : (
          "Đổi mật khẩu"
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
            <CardTitle className="text-xl text-center">Tạo mật khẩu mới</CardTitle>
            <CardDescription className="text-center">
              Vui lòng nhập mật khẩu mới và bảo mật cho tài khoản của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>}>
              <ResetPasswordForm />
            </Suspense>
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
