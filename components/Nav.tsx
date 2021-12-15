import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

export const Nav = (): JSX.Element => {
  return(
    <nav>
      <WalletMultiButton />
    </nav>
  )
}

export default Nav
