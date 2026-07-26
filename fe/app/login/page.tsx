"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PotatoLogo } from "@/components/potato-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, ArrowRight, Loader2, Mail, Lock, User as UserIcon, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("login")
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const data = await apiFetch<{ user: any; accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })

      // Store both user info and JWT token
      localStorage.setItem("potato_user", JSON.stringify(data.user))
      localStorage.setItem("potato_token", data.accessToken)

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string

    try {
      const data = await apiFetch<{ user: any; accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
        skipAuth: true,
      })

      // Auto-login: store token and redirect directly to dashboard
      localStorage.setItem("potato_user", JSON.stringify(data.user))
      localStorage.setItem("potato_token", data.accessToken)

      setRegisterSuccess(true)
      // Short delay to show success state then redirect
      setTimeout(() => router.push("/dashboard"), 1200)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-2 group">
            <div className="relative">
              <PotatoLogo className="h-16 w-16 transition-transform group-hover:scale-110" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </motion.div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Potato IDP</h1>
          </Link>
          <p className="text-muted-foreground mt-2 text-center text-balance">
            {"Tưới nước cho ứng dụng của bạn và xem chúng nảy mầm."}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(null) }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">Đăng nhập</TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">Đăng ký</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Chào mừng trở lại</CardTitle>
                  <CardDescription>Nhập thông tin để tiếp tục chăm sóc khu vườn của bạn.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="email" name="email" type="text" placeholder="potato@example.com" className="pl-10 bg-background/50" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="password" name="password" type="password" placeholder="••••••••" className="pl-10 bg-background/50" required />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Đang đăng nhập...
                        </>
                      ) : (
                        <>
                          Đăng nhập
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="register">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Gia nhập Vườn khoai</CardTitle>
                  <CardDescription>Bắt đầu hành trình DevOps dễ dàng như ăn khoai tây chiên.</CardDescription>
                </CardHeader>
                {registerSuccess ? (
                  <CardContent className="py-10 flex flex-col items-center gap-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                    </motion.div>
                    <p className="text-lg font-semibold text-foreground">Đăng ký thành công! 🥔</p>
                    <p className="text-sm text-muted-foreground">Đang chuyển hướng đến dashboard...</p>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </CardContent>
                ) : (
                  <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                      {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                          {error}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="reg-name">Họ và tên</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-name" name="name" type="text" placeholder="Dev Potato" className="pl-10 bg-background/50" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-email" name="email" type="text" placeholder="potato@example.com" className="pl-10 bg-background/50" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">Mật khẩu</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input id="reg-password" name="password" type="password" placeholder="Tối thiểu 6 ký tự" className="pl-10 bg-background/50" required minLength={6} />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Gieo mầm...
                          </>
                        ) : (
                          <>
                            Đăng ký
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của vườn khoai.
        </p>
      </motion.div>
    </div>
  )
}
