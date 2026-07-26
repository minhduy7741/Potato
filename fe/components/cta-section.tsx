"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PotatoLogo } from "@/components/potato-logo"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export function CTASection() {
  return (
    <section className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card"
        >
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="px-8 py-16 text-center md:px-16 md:py-24">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8 flex justify-center"
            >
              <PotatoLogo className="h-24 w-24" />
            </motion.div>

            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Sẵn sàng gieo mầm{" "}
              <span className="text-primary">dự án</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Tham gia cùng hàng ngàn đội ngũ đã nâng tầm trải nghiệm phát triển phần mềm. Bắt đầu triển khai trong vài phút, không phải vài giờ.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/login">
                  Bắt đầu miễn phí
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
              >
                Liên hệ hỗ trợ
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Không yêu cầu thẻ tín dụng. Gói miễn phí bao gồm 100 lượt deploy/tháng.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
