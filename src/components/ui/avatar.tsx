"use client"

import * as React from "react"

interface AvatarProps {
  className?: string
  children: React.ReactNode
}

interface AvatarImageProps {
  src?: string
  alt?: string
  className?: string
}

interface AvatarFallbackProps {
  className?: string
  children: React.ReactNode
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
)
Avatar.displayName = "Avatar"

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt, className, ...props }, ref) => (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={`aspect-square h-full w-full ${className || ""}`}
      {...props}
    />
  )
)
AvatarImage.displayName = "AvatarImage"

export const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className || ""}`}
      {...props}
    >
      {children}
    </div>
  )
)
AvatarFallback.displayName = "AvatarFallback"
