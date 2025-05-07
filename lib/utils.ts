import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
type UniqueByKey<T> = (array: T[], key: keyof T) => T[]

export const removeDuplicatesByKey: UniqueByKey<any> = (array, key) => {
  return array.filter((obj1, i, arr) => arr.findIndex(obj2 => obj2[key] === obj1[key]) === i)
}
