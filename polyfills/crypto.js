import { pbkdf2 } from '@noble/hashes/pbkdf2'
import { sha512 } from '@noble/hashes/sha512'
import { v4 as randomUUID } from 'uuid'

export const pbkdf2Sync = (password, salt, c, dkLen) => {
  return Buffer.from(pbkdf2(sha512, password, salt, { c, dkLen }))
}

export default {
  randomUUID
}
