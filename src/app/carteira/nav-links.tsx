"use client";
// Client Component só porque precisa saber a URL atual (usePathname)
// para destacar o link ativo.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";



/** base = "/carteira" (logado) ou "/visitante". */
export function NavLinks({ base = "/carteira" }: { base?: string }) {
  const pathname = usePathname();
  const LINKS = [
    { href: base, label: "Visão geral" },
    { href: `${base}/transacoes`, label: "Transações" },
  ];
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 font-medium text-muted-foreground hover:text-foreground",
              active && "bg-secondary text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
