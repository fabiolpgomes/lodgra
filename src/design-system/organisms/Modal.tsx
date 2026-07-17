'use client'

import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeButton?: boolean
  backdrop?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
  backdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      {backdrop && (
        <div
          className="fixed inset-0 bg-black/50 z-modal"
          onClick={onClose}
          role="presentation"
        />
      )}

      {/* Modal */}
      <div
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div
          className={cn(
            'bg-white rounded-sm shadow-lg w-full',
            sizeClasses[size],
            'animate-in fade-in scale-95 duration-200'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || closeButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-be-border/10">
              {title && (
                <h2 id="modal-title" className="text-design-base font-heading font-black text-be-text">
                  {title}
                </h2>
              )}
              {closeButton && (
                <button
                  onClick={onClose}
                  className="ml-auto p-1 rounded-sm hover:bg-be-blue/5 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-be-border/10 flex gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

Modal.displayName = 'Modal'
