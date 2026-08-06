"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string
  onValueChange: (value: string) => void
  /** Accessible label (visually hidden). Default "Search". */
  label?: string
  /** Show the clear button when non-empty. Default true. */
  clearable?: boolean
  containerClassName?: string
}

/**
 * Labeled search field with a leading icon and optional clear button.
 * The label is visually hidden but present for screen readers.
 */
export function SearchInput({
  value,
  onValueChange,
  label = "Search",
  placeholder = "Search…",
  clearable = true,
  className,
  containerClassName,
  id,
  ...props
}: SearchInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn("relative w-full", containerClassName)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={inputId}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "pl-9 [&::-webkit-search-cancel-button]:appearance-none",
          clearable && value ? "pr-9" : "",
          className
        )}
        {...props}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&_svg]:size-3.5"
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
