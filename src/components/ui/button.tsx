import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** shadcn-style Button, restyled to Assay: 44 px targets, 10 px radius, 3 px focus ring. */
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-ctl border border-transparent font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-pri text-on-pri hover:bg-pri-h hover:text-on-pri aria-disabled:border-line aria-disabled:bg-raised aria-disabled:text-ink2 disabled:border-line disabled:bg-raised disabled:text-ink2',
        ghost: 'border-line2 bg-surface text-ink hover:border-pri hover:text-ink',
        quiet: 'bg-transparent px-2.5 text-pri hover:bg-pri-soft hover:text-pri',
        onBanner: 'border-banner-line bg-transparent text-white hover:border-white hover:text-white',
        bannerSolid: 'bg-white text-[#1B1F24] hover:bg-[#E7E9EC] hover:text-[#1B1F24]',
        bannerLink: 'border-0 bg-transparent px-2.5 text-white underline underline-offset-[3px] hover:text-white',
      },
      size: {
        md: 'min-h-11 px-4 text-[15px]',
        // Smaller text and padding, never a smaller target: every size is at least 44 px (WCAG 2.5.8, the Assay rule).
        sm: 'min-h-11 px-3 text-[14px]',
        lg: 'min-h-12 px-5 text-[16px]',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, asChild, type, ...props }, ref) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...(asChild ? {} : { type: type ?? 'button' })} {...props} />
})
