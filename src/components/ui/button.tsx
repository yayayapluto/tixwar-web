import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold tracking-wide transition-[transform,background-color,border-color,border-width,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-brand-gradient text-white shadow-lg shadow-orange-500/25 btn-shine border-b-4 border-b-orange-800 hover:brightness-110 active:translate-y-0.5 active:border-b-2',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 border-b-4 border-b-red-900/80 active:translate-y-0.5 active:border-b-2',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground border-b-4 border-b-black/10 dark:border-b-white/10 active:translate-y-0.5 active:border-b-2',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border-b-4 border-b-black/10 dark:border-b-white/10 active:translate-y-0.5 active:border-b-2',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-10 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
