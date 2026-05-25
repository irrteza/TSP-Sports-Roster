export type SortDirection = 'asc' | 'desc';

/**
 * Sort items by createdOn date.
 * @param items - Array of items with optional createdOn field
 * @param direction - 'asc' for oldest first, 'desc' for newest first
 * Items without a createdOn date are treated as oldest (time = 0).
 */
export function sortByCreatedOn<T extends { createdOn?: string }>(
  items: T[],
  direction: SortDirection = 'asc'
): T[] {
  return items.sort((a, b) => {
    const dateA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
    const dateB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
