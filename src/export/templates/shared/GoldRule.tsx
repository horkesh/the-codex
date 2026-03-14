interface GoldRuleProps {
  thick?: boolean
}

export function GoldRule({ thick = false }: GoldRuleProps) {
  return (
    <div style={{
      width: '100%',
      height: thick ? '2px' : '1px',
      background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.6), transparent)',
    }} />
  )
}
