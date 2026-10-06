import type { ReactNode, RefObject } from 'react'

interface MessageScreenProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  title: string
  children: ReactNode
}

/** Pantalla genèrica de missatge (errors, no trobat, avisos). */
export function MessageScreen({ headingRef, title, children }: MessageScreenProps) {
  return (
    <section aria-labelledby="message-title" className="message-screen">
      <h1 id="message-title" ref={headingRef} tabIndex={-1} className="screen-title">
        {title}
      </h1>
      {children}
    </section>
  )
}
