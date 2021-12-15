import * as borsh from "borsh"
import * as web3 from "@solana/web3.js"
import * as spl from "@solana/spl-token"

export const toBuffer = (value: any[]): (Uint8Array | Buffer)[] => {
  return value.map((val) => {
    if (typeof val === "string") return Buffer.from(val)
    else if (val instanceof web3.PublicKey) return Buffer.from(val.toBytes())
    else if (val instanceof Uint8Array || val instanceof Buffer) return val
    else throw new Error(`toBuffer: unknown data type: ${typeof val}`)
  })
}

export async function deployProgram(
  connection: web3.Connection,
  payer: web3.Signer,
  program: web3.Signer,
  programId: web3.PublicKey,
  data: Buffer | Uint8Array | number[]
): Promise<boolean> {
  {
    const balanceNeeded = await connection.getMinimumBalanceForRentExemption(
      data.length
    )
    const programInfo = await connection.getAccountInfo(
      program.publicKey,
      "confirmed"
    )

    let transaction = null

    if (programInfo !== null) {
      if (programInfo.executable) {
        console.error("Program load failed, account is already executable")
        return false
      }

      if (programInfo.data.length !== data.length) {
        transaction = transaction || new web3.Transaction()
        transaction.add(
          web3.SystemProgram.allocate({
            accountPubkey: program.publicKey,
            space: data.length
          })
        )
      }

      if (!programInfo.owner.equals(programId)) {
        transaction = transaction || new web3.Transaction()
        transaction.add(
          web3.SystemProgram.assign({
            accountPubkey: program.publicKey,
            programId
          })
        )
      }

      if (programInfo.lamports < balanceNeeded) {
        transaction = transaction || new web3.Transaction()
        transaction.add(
          web3.SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: program.publicKey,
            lamports: balanceNeeded - programInfo.lamports
          })
        )
      }
    } else {
      transaction = new web3.Transaction().add(
        web3.SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: program.publicKey,
          lamports: balanceNeeded > 0 ? balanceNeeded : 1,
          space: data.length,
          programId
        })
      )
    }

    if (transaction !== null) {
      await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, program],
        {
          commitment: "confirmed"
        }
      )
    }
  }

  const chunkSize = web3.Loader.chunkSize
  const transactions = []

  let array = data

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const bytes = array.slice(0, chunkSize)
    array = array.slice(chunkSize)

    const header = new Uint8Array(16)
    const headerView = new DataView(header.buffer)

    headerView.setUint32(0, 0, true) // Instruction opcode (Write).
    headerView.setUint32(4, offset, true) // Program buffer offset.
    headerView.setBigUint64(8, BigInt(bytes.length), true) // Program chunk length.

    const transaction = new web3.Transaction().add({
      keys: [
        {
          pubkey: program.publicKey,
          isSigner: true,
          isWritable: true
        }
      ],
      programId,
      data: Buffer.concat([header, Uint8Array.from(bytes)])
    })

    transactions.push(
      web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, program],
        {
          commitment: "confirmed"
        }
      )
    )

    // Delay between sends in an attempt to reduce rate limit errors

    const REQUESTS_PER_SECOND = 2
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 / REQUESTS_PER_SECOND)
    )
  }

  await Promise.all(transactions) // Finalize the account loaded with program data for execution

  {
    const data = new Uint8Array(4)
    const dataView = new DataView(data.buffer)

    dataView.setUint32(0, 1, true) // Instruction opcode (Finalize).

    const transaction = new web3.Transaction().add({
      keys: [
        {
          pubkey: program.publicKey,
          isSigner: true,
          isWritable: true
        },
        {
          pubkey: web3.SYSVAR_RENT_PUBKEY,
          isSigner: false,
          isWritable: false
        }
      ],
      programId,
      data: Buffer.from(data)
    })

    await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, program],
      {
        commitment: "confirmed"
      }
    )
  }

  return true
}

export class InitInstruction {
  stateSeed: number
  likeTokenMintKey: Uint8Array
  genesisNftProgramKey: Uint8Array

  constructor(props: InitInstruction) {
    this.stateSeed = props.stateSeed
    this.likeTokenMintKey = props.likeTokenMintKey
    this.genesisNftProgramKey = props.genesisNftProgramKey
  }
}

export class InitPoolInstruction {
  stateSeed: number
  poolStateSeed: number
  nftSignatureSeed: number
  poolEscrowSeed: number
  genesisNftMintKey: Uint8Array
  numFollowers: spl.u64

  constructor(props: InitPoolInstruction) {
    this.stateSeed = props.stateSeed
    this.poolStateSeed = props.poolStateSeed
    this.nftSignatureSeed = props.nftSignatureSeed
    this.poolEscrowSeed = props.poolEscrowSeed
    this.genesisNftMintKey = props.genesisNftMintKey
    this.numFollowers = props.numFollowers
  }
}

