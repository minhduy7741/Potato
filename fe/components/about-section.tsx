"use client"

import { motion } from "framer-motion"
import { Users, Heart, Zap } from "lucide-react"

export function AboutSection() {
  return (
    <section id="about" className="relative py-24 sm:py-32 bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
              Về Potato PaaS
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Potato PaaS được sinh ra với một mục tiêu duy nhất: Làm cho việc triển khai ứng dụng trở nên "dễ như ăn khoai tây chiên". 
              Chúng tôi hiểu rằng lập trình viên nên dành thời gian để viết code và tạo ra sản phẩm tuyệt vời, thay vì phải vật lộn với việc cấu hình máy chủ Linux, cài đặt Nginx hay gia hạn SSL.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Dù bạn là một sinh viên đang làm đồ án, hay một Startup đang cần một hệ thống ổn định để scale, Potato luôn ở đây để lo phần cơ sở hạ tầng cho bạn.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2"
          >
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Cộng đồng</h3>
              <p className="text-muted-foreground">Được xây dựng bởi lập trình viên, dành riêng cho lập trình viên.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
              <Heart className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Đam mê</h3>
              <p className="text-muted-foreground">Chúng tôi yêu thích những dòng code sạch và hệ thống tối ưu.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm sm:col-span-2">
              <Zap className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Tốc độ</h3>
              <p className="text-muted-foreground">Triển khai siêu tốc, giảm 80% thời gian cấu hình server để bạn có thể Launch sản phẩm ngay trong đêm.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
