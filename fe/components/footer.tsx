import Link from "next/link"
import { PotatoLogo } from "@/components/potato-logo"
import { Github, Twitter, Linkedin } from "lucide-react"

const footerLinks = {
  "Sản phẩm": [
    { label: "Tính năng", href: "#features" },
    { label: "Bảng giá", href: "#pricing" },
    { label: "Nhật ký thay đổi", href: "#" },
    { label: "Lộ trình", href: "#" },
  ],
  "Tài nguyên": [
    { label: "Tài liệu", href: "#docs" },
    { label: "Tài liệu API", href: "#" },
    { label: "Hướng dẫn", href: "#" },
    { label: "Ví dụ", href: "#" },
  ],
  "Công ty": [
    { label: "Về chúng tôi", href: "#about" },
    { label: "Blog", href: "#" },
    { label: "Tuyển dụng", href: "#" },
    { label: "Liên hệ", href: "#" },
  ],
  "Pháp lý": [
    { label: "Bảo mật", href: "#" },
    { label: "Điều khoản", href: "#" },
    { label: "An toàn", href: "#" },
    { label: "Cookies", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <PotatoLogo className="h-10 w-10" />
              <span className="text-xl font-bold text-foreground">Potato</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Nền tảng phát triển nội bộ thân thiện giúp quản lý hạ tầng dễ dàng như ăn khoai tây chiên.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Potato Platform. Bảo lưu mọi quyền.
          </p>
          <p className="text-sm text-muted-foreground">
            Phát triển bằng 🥔 bởi lập trình viên, cho lập trình viên.
          </p>
        </div>
      </div>
    </footer>
  )
}
