import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ children}: {children: React.ReactNode}) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground block',
      )}
    >
      {children}
    </p>
  )
}
