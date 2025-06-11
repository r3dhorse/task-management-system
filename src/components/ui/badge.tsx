import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { TaskStatus } from "@/features/tasks/types"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        [TaskStatus.BACKLOG]:
          "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm ring-1 ring-gray-200/50",
        [TaskStatus.TODO]:
          "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 shadow-sm ring-1 ring-blue-200/50",
        [TaskStatus.IN_PROGRESS]:
          "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 shadow-sm ring-1 ring-amber-200/50",
        [TaskStatus.IN_REVIEW]:
          "border-purple-300 bg-purple-100 text-purple-800 hover:bg-purple-200 shadow-sm ring-1 ring-purple-200/50",
        [TaskStatus.DONE]:
          "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-sm ring-1 ring-emerald-200/50",
        [TaskStatus.ARCHIVED]:
          "border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 shadow-sm ring-1 ring-gray-200/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
