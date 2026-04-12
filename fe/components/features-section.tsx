"use client"

import { motion } from "framer-motion"
import { Rocket, Database, Activity, Shield } from "lucide-react"

const features = [
  {
    icon: Rocket,
    title: "One-Click Mash",
    subtitle: "(Deploy)",
    description:
      "Deploy your applications with a single click. Our intelligent infrastructure handles scaling, rollbacks, and everything in between.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Database,
    title: "Automated Potato Patches",
    subtitle: "(Databases)",
    description:
      "Spin up managed databases instantly. PostgreSQL, MySQL, Redis - all preconfigured and ready to serve your data fresh.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Activity,
    title: "Real-time Eyeing",
    subtitle: "(Monitoring)",
    description:
      "Keep an eye on your applications 24/7. Logs, metrics, and traces - all in one place with intelligent alerting.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "DDoS Peeling",
    subtitle: "(Protection)",
    description:
      "Enterprise-grade security that peels away threats before they reach your apps. Sleep soundly knowing you&apos;re protected.",
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
            Everything your devs need,{" "}
            <span className="text-primary">baked in</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            From deployment to monitoring, Potato serves up a complete platform
            that your team will actually enjoy using.
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
            Plus everything else you&apos;d expect
          </h3>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[
              "Git Integration",
              "Preview Environments",
              "Custom Domains",
              "SSL Certificates",
              "Edge Functions",
              "API Gateway",
              "Secrets Management",
              "Team Collaboration",
              "Audit Logs",
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
