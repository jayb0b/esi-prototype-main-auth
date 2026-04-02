export interface Pageable<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
