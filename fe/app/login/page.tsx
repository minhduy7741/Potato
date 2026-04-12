"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PotatoLogo } from "@/components/potato-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, ArrowRight, Loader2, Mail, Lock, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Đăng nhập thất bại")
      }

      // Lưu info giả định (token/user)
      localStorage.setItem("potato_user", JSON.stringify(data.user))
      
      // Chuyển hướng tới dashboard
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
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors from backend
        if (Array.isArray(data.message)) {
          throw new Error(data.message[0])
        }
        throw new Error(data.message || "Đăng ký thất bại")
      }

      // Đăng ký xong thì chuyển sang tab login hoặc tự động login
      alert("Đăng ký thành công! Bạn có thể đăng nhập ngay.")
      window.location.reload()
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

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
          <TabsContent key="login" value="login">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Welcome Back</CardTitle>
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
                          <Link href="#" className="text-xs text-primary hover:underline">Quên mật khẩu?</Link>
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
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent key="register" value="register">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl">Join the Garden</CardTitle>
                    <CardDescription>Bắt đầu hành trình DevOps dễ dàng như ăn khoai tây chiên.</CardDescription>
                  </CardHeader>
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
                            Sign Up
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của vườn khoai.
        </p>
      </motion.div>
    </div>
  )
}
