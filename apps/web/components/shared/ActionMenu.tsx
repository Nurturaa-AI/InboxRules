"use client"

import * as React from "react"
import { MoreVertical, type LucideIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
  label: React.ReactNode
  icon?: LucideIcon
  onClick: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

export interface ActionMenuProps {
  items: ActionMenuItem[]
  /** Accessible label for the trigger. Default "Actions". */
  label?: string
  /** Optional trigger override. Default is a vertical ellipsis icon button. */
  trigger?: React.ReactNode
  /** Where the menu should align relative to the trigger. */
  align?: "start" | "center" | "end"
  className?: string
}

/**
 * Keyboard-accessible action menu for row/overflow actions.
 * Replaces manual menus built on divs or unmarked buttons.
 */
export function ActionMenu({
  items,
  label = "Actions",
  trigger,
  align = "end",
  className,
}: ActionMenuProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(className)}
          >
            <MoreVertical />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-40">
        {items.map((item, i) => {
          const Icon = item.icon
          const isLast = i === items.length - 1
          const nextVariantChanges =
            !isLast && items[i + 1]?.variant !== item.variant

          return (
            <React.Fragment key={i}>
              <DropdownMenuItem
                variant={item.variant}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick()
                  setOpen(false)
                }}
              >
                {Icon && <Icon aria-hidden="true" />}
                {item.label}
              </DropdownMenuItem>
              {nextVariantChanges && <DropdownMenuSeparator />}
            </React.Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
