import indexer from '@/lib/indexer'

export const fetchProofPath = async (index: number, nextIndex?: number) => {
  const response = await indexer.get('/lottery/proof-path', {
    params: {
      index,
      nextIndex: nextIndex || undefined,
    },
  })

  if (response.status !== 200) {
    throw new Error(`Failed to fetch proof path: ${response.statusText}`)
  }

  return response.data
}
