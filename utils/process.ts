const catchable = async <T, TError = any>(
  reflected: (...p: any) => Promise<T>,
  onError?: (error: TError) => void,
  handleIsLoading?: (isLoading: boolean) => void
): Promise<T | undefined> => {
  handleIsLoading?.(true)
  let result: T | undefined

  try {
    result = await reflected()
  } catch (error: Error | any) {
    console.error(error)

    onError?.(error)
  } finally {
    handleIsLoading?.(false)
  }

  return result
}

export { catchable }
