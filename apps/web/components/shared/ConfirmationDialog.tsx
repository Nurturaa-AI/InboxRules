"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Label for the primary action. Default "Continue". */
  actionLabel?: React.ReactNode
  /** Label for the cancel button. Default "Cancel". */
  cancelLabel?: React.ReactNode
  /** Called when the user confirms. */
  onConfirm: () => void
  /** Called when the user cancels (optional, onOpenChange(false) is always called). */
  onCancel?: () => void
  /** Use destructive styling for the primary action (delete, remove, etc.). */
  variant?: "default" | "destructive"
}

/**
 * Accessible confirmation dialog. Replaces native `confirm()` and `alert()`.
 * Traps focus, closes on Escape, and works with keyboard-only navigation.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onCancel?.()
              onOpenChange(false)
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                : undefined
            }
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
