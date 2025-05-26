import axios from 'axios'

const indexer = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_INDEXER_API!}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

indexer.interceptors.request.use(
  config => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt-appkit')

      if (token) {
        config.headers.authorization = token
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

export default indexer
