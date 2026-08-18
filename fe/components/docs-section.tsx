"use client"

import { motion } from "framer-motion"
import { GitBranch, Box, Globe, Activity } from "lucide-react"

const steps = [
  {
    icon: GitBranch,
    title: "1. Kết nối kho mã nguồn",
    description: "Nhập đường dẫn Github của bạn. Potato hỗ trợ đa dạng mã nguồn như Node.js, Python, Java, Go, Rust."
  },
  {
    icon: Box,
    title: "2. Khởi tạo Database",
    description: "Chỉ với 1 click, bạn có ngay PostgreSQL, MySQL hoặc MongoDB. Lấy Connection String và bỏ vào Biến môi trường."
  },
  {
    icon: Globe,
    title: "3. Triển khai & Gắn tên miền",
    description: "Bấm nút Deploy. Hệ thống sẽ tự động đóng gói Docker và cấp cho bạn một tên miền miễn phí hoặc gắn tên miền riêng của bạn."
  },
  {
    icon: Activity,
    title: "4. Giám sát hệ thống",
    description: "Mở biểu đồ theo dõi RAM, CPU theo thời gian thực và đọc log ứng dụng để đảm bảo mọi thứ luôn trơn tru."
  }
]

export function DocsSection() {
  return (
    <section id="docs" className="relative py-24 sm:py-32 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Tài liệu hướng dẫn
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Triển khai dự án của bạn lên Internet chưa bao giờ đơn giản đến thế. Chỉ với 4 bước cơ bản để đưa ứng dụng của bạn đến với thế giới.
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
