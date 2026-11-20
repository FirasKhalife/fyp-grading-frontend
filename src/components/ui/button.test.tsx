import { describe, expect, it } from 'vitest'
import { buttonVariants } from './button'

// Tailwind's spacing scale: 11 = 44 px, 12 = 48 px. The Assay rule is 44 px minimum for every target.
const TARGET = /\b(min-h-1[1-9]|size-1[1-9]|min-h-\[(4[4-9]|[5-9]\d)px\])\b/

describe('Button sizes', () => {
  it.each(['sm', 'md', 'lg', 'icon'] as const)('%s is at least 44 px tall', (size) => {
    expect(buttonVariants({ size })).toMatch(TARGET)
  })
})
