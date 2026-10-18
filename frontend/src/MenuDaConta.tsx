import { NavLink } from 'react-router-dom'
import { LogOutIcon, SettingsIcon, ShieldCheckIcon, UserIcon, UserRoundIcon } from 'lucide-react'
import { useSessao } from './contextoDaSessao'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Menu da conta no topo das telas autenticadas (DropdownMenu do shadcn/ui).
 * A foto e o papel vem da sessao (`GET /api/auth/me`); a foto e servida pelo
 * Supabase Storage.
 */
export default function MenuDaConta({ onEncerrarSessao }: Props) {
  const { usuario } = useSessao()
  const administrador = usuario?.perfil === 'ADMIN'
  const foto = usuario?.avatarUrl ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-accent text-accent-foreground transition-shadow outline-none hover:ring-2 hover:ring-ring/30 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label="Abrir menu da conta"
      >
        {foto ? <img className="size-full object-cover" src={foto} alt="" /> : <UserRoundIcon className="size-5" aria-hidden="true" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" aria-label="Opções da conta">
        {usuario && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="truncate text-sm font-semibold">{usuario.nome}</span>
              <span className="truncate text-xs text-muted-foreground">{usuario.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <NavLink to="/perfil">
            <UserIcon aria-hidden="true" />
            Meu perfil
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/seguranca">
            <SettingsIcon aria-hidden="true" />
            Segurança e configurações
          </NavLink>
        </DropdownMenuItem>
        {administrador && (
          <DropdownMenuItem asChild>
            <NavLink to="/admin">
              <ShieldCheckIcon aria-hidden="true" />
              Área administrativa
            </NavLink>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onEncerrarSessao()}>
          <LogOutIcon aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
