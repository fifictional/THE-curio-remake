"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SubscriptionLevel = 'none' | 'super' | 'ultra'

export interface CurioLogoProps {
  subscriptionLevel?: SubscriptionLevel
  collapsed?: boolean
  onLogoClick?: () => void
  className?: string
  showLink?: boolean
}

export function CurioLogo({
  subscriptionLevel = 'none',
  collapsed = false,
  onLogoClick,
  className,
  showLink = true,
}: CurioLogoProps) {
  const logoContent = (
    <>
      {subscriptionLevel === 'super' && !collapsed && (
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.6,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="absolute left-2 -top-2"
          data-testid="super-curio-logo"
        >
          <Image
            src="/super-logo.png"
            alt="Super Curio Logo"
            width={40}
            height={16}
            className="cursor-pointer"
            priority
          />
        </motion.div>
      )}
      {subscriptionLevel === 'ultra' && !collapsed && (
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.6,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="absolute left-0 -top-1"
          data-testid="ultra-curio-logo"
        >
          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </motion.div>
      )}
      {collapsed ? (
        <Image 
          src="/logo-small.svg" 
          alt="Curio Logo" 
          width={100} 
          height={32} 
          className="w-5 h-10" 
          priority 
        />
      ) : (
        <Image 
          src="/logo.svg" 
          alt="Curio Logo" 
          width={100} 
          height={32} 
          className="w-20 h-10" 
          priority 
        />
      )}
    </>
  )

  const containerClasses = cn(
    "flex items-center justify-start transition-all duration-300 h-13 relative",
    className
  )

  if (showLink) {
    return (
      <div className={containerClasses}>
        <Link 
          href="/" 
          onClick={onLogoClick}
          className="relative"
        >
          {logoContent}
        </Link>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="relative" onClick={onLogoClick}>
        {logoContent}
      </div>
    </div>
  )
}
