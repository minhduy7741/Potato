"use client"

import { motion } from "framer-motion"

export function PotatoLogo({ className = "" }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{
        rotate: [0, -5, 5, -5, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Potato body */}
      <motion.ellipse
        cx="32"
        cy="36"
        rx="24"
        ry="20"
        fill="#C4A86C"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Potato spots */}
      <circle cx="22" cy="32" r="2" fill="#A08050" />
      <circle cx="40" cy="30" r="2.5" fill="#A08050" />
      <circle cx="28" cy="44" r="2" fill="#A08050" />
      <circle cx="38" cy="42" r="1.5" fill="#A08050" />
      
      {/* Left eye */}
      <motion.ellipse
        cx="26"
        cy="34"
        rx="4"
        ry="5"
        fill="white"
        animate={{
          scaleY: [1, 0.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />
      <motion.circle
        cx="27"
        cy="34"
        r="2"
        fill="#2D1F0F"
        animate={{
          cx: [27, 28, 27, 26, 27],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Right eye */}
      <motion.ellipse
        cx="38"
        cy="34"
        rx="4"
        ry="5"
        fill="white"
        animate={{
          scaleY: [1, 0.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      />
      <motion.circle
        cx="39"
        cy="34"
        r="2"
        fill="#2D1F0F"
        animate={{
          cx: [39, 40, 39, 38, 39],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Smile */}
      <motion.path
        d="M 26 40 Q 32 46 38 40"
        stroke="#2D1F0F"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        animate={{
          d: [
            "M 26 40 Q 32 46 38 40",
            "M 26 41 Q 32 48 38 41",
            "M 26 40 Q 32 46 38 40",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Rosy cheeks */}
      <circle cx="20" cy="38" r="3" fill="#E8B4B8" opacity="0.6" />
      <circle cx="44" cy="38" r="3" fill="#E8B4B8" opacity="0.6" />
      
      {/* Little sprout on top */}
      <motion.path
        d="M 32 16 Q 28 12 32 8 Q 36 12 32 16"
        fill="#7CB342"
        animate={{
          rotate: [-5, 5, -5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ transformOrigin: "32px 16px" }}
      />
      <motion.path
        d="M 32 18 L 32 16"
        stroke="#5D8A2F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}
