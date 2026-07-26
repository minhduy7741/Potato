"use client"

import { motion } from "framer-motion"
import { Rocket, Database, Activity, Shield } from "lucide-react"

const features = [
  {
    icon: Rocket,
    title: "Triển khai 1-Click",
    subtitle: "(Triển khai)",
    description:
      "Triển khai ứng dụng của bạn chỉ với một cú nhấp chuột. Hạ tầng thông minh của chúng tôi tự động xử lý mở rộng, rollback và mọi thứ ở giữa.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Database,
    title: "Khởi tạo Database Tự động",
    subtitle: "(Cơ sở dữ liệu)",
    description:
      "Khởi tạo database nhanh chóng. PostgreSQL, MySQL, Redis - tất cả đều được cấu hình sẵn và luôn sẵn sàng hoạt động.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "Giám sát Thời gian thực",
    subtitle: "(Giám sát)",
    description:
      "Theo dõi sát sao ứng dụng của bạn 24/7. Nhật ký, tài nguyên và logs - tất cả ở một nơi với cảnh báo thông minh.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Chống DDoS Toàn diện",
    subtitle: "(Bảo mật)",
    description:
      "Bảo mật cấp doanh nghiệp loại bỏ các mối đe dọa trước khi chúng tiếp cận ứng dụng của bạn. Ngủ ngon hơn vì đã được bảo vệ.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Mọi thứ lập trình viên cần,{" "}
            <span className="text-primary">tích hợp sẵn</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Từ triển khai đến giám sát, Potato cung cấp một nền tảng hoàn chỉnh
            mà đội ngũ của bạn sẽ thực sự thích sử dụng.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Icon */}
              <div
                className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor}`}
              >
                <feature.icon className={`h-7 w-7 ${feature.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground">
                {feature.title}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {feature.subtitle}
                </span>
              </h3>
              <p className="mt-3 text-muted-foreground">{feature.description}</p>

              {/* Hover decoration */}
              <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </motion.div>

        {/* Additional features list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 rounded-2xl border border-border bg-card p-8"
        >
          <h3 className="text-center text-lg font-semibold text-foreground">
            Cùng với nhiều tính năng nâng cao khác
          </h3>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[
              "Tích hợp Git",
              "Môi trường Preview",
              "Tên miền riêng",
              "Chứng chỉ SSL tự động",
              "Edge Functions",
              "API Gateway",
              "Quản lý Secret",
              "Cộng tác Đội nhóm",
              "Nhật ký Hoạt động",
              "SSO/SAML",
            ].map((item, index) => (
              <span
                key={index}
                className="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
