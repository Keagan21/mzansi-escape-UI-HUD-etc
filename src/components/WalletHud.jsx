// WalletHud.jsx — Persistent store-coin balance during play.

export function WalletHud({ balance = 0 }) {
  return (
    <div className="wallet-hud" aria-live="polite">
      <span className="wallet-hud__label">Wallet</span>
      <span className="wallet-hud__value">R {balance}</span>
    </div>
  )
}
