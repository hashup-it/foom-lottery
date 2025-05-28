import Dexie, { Table } from 'dexie'

// * TODO: Lepiej przechowywać drzewo. (tak jak w indexerze, tylko że bez udziwnień, jako jednolita struktura, bez dodatkowych pól.)
export interface LeafEntry {
  index: number
  leaf: string
  hash: string
  rand: string
  blockNumber?: number
}

// * TODO: Lepiej przechowywać drzewo. (tak jak w indexerze, tylko że bez udziwnień, jako jednolita struktura, bez dodatkowych pól.)
class LeavesDB extends Dexie {
  leaves!: Table<LeafEntry>

  constructor() {
    super('LeavesDB')

    this.version(1).stores({
      leaves: 'index',
    })
  }
}

export const leavesDB = new LeavesDB()
