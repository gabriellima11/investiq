"use client";
/**
 * Ícone "ⓘ" que explica um indicador ao passar o mouse ou focar com o Tab.
 * É um <button> de verdade: recebe foco pelo teclado e o leitor de tela lê
 * o texto pelo aria-label, mesmo sem abrir o balão.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`O que é ${label}?`}
            className="-m-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          />
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-left leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}
