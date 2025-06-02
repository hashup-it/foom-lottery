import indexer from '@/lib/indexer'

export const fetchLastLeaf = async (): Promise<
  [bigint | number, bigint | number, bigint | number, bigint | number]
> => {
  const response = await indexer.get('/lottery/last-leaf')

  if (response.status !== 200) {
    throw new Error(`Failed to fetch last leaf: ${response.statusText}`)
  }

  const { data } = response.data
  if (typeof data !== 'object') {
    throw new Error('Invalid response format: expected an array')
  }
  return data
}
