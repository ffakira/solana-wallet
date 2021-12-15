import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

const Nav = (): JSX.Element => {
  return(
    <nav className="nav">
      <div className="nav-header">
        <a href="/" className="nav-logo">Only1</a>
        <a href="/staking" className="nav-link">Staking Pool</a>
      </div>
      <WalletMultiButton />
    </nav>
  )
}

export default Nav
