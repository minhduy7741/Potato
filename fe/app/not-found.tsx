"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Home, Sprout, Ghost } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="flex flex-col items-center gap-6"
      >
        {/* Ghost potato */}
        <div className="relative">
          <div className="text-9xl select-none">🥔</div>
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute -top-4 -right-4"
          >
            <Ghost className="h-10 w-10 text-muted-foreground/40" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black text-foreground tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Vườn khoai bị lạc rồi!</h2>
          <p className="text-muted-foreground max-w-sm">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang vườn khác.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Về Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/plots">
              <Sprout className="mr-2 h-4 w-4" />
              Xem My Plots
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
