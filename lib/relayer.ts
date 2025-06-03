import axios from 'axios'

const relayer = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_RELAYER_API!}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

relayer.interceptors.request.use(
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

export default relayer
