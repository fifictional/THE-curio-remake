"use client"

import * as React from "react"
import Link from "next/link"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface CurioUserInfoProps {
  avatarSrc?: string
  name: string
  href?: string
  onNameClick?: () => void
  rightButton?: React.ReactNode
  collapsed?: boolean
  className?: string
}

export function CurioUserInfo({
  avatarSrc,
  name,
  href,
  onNameClick,
  rightButton,
  collapsed = false,
  className,
}: CurioUserInfoProps) {
  // Generate fallback from name (first letter of first name + first letter of last name)
  const nameParts = name.trim().split(/\s+/)
  const avatarFallback = nameParts.length > 1
    ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
    : nameParts[0].charAt(0).toUpperCase()
  const avatar = (
    <Avatar
      src={avatarSrc}
      fallback={avatarFallback}
      className={cn(
        "h-6! w-6! cursor-pointer border-2 hover:border-gray-600 border-gray-700 transition-colors",
        className
      )}
    />
  )

  const nameElement = !collapsed && (
    <span className="text-base text-gray-700">{name}</span>
  )

  const content = (
    <div className={cn("flex flex-row gap-2 justify-between items-center", className)}>
      {href ? (
        <Link
          href={href}
          onClick={onNameClick}
          title="My profile"
          className="flex flex-row gap-2 items-center"
        >
          {avatar}
          {nameElement}
        </Link>
      ) : (
        <div
          onClick={onNameClick}
          title="My profile"
          className="flex flex-row gap-2 items-center cursor-pointer"
        >
          {avatar}
          {nameElement}
        </div>
      )}
      {!collapsed && rightButton && (
        <div className="flex flex-row gap-2 items-center">
          {rightButton}
        </div>
      )}
    </div>
  )

  return content
}
