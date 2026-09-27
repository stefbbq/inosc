/**
 * Fills a branch template. `{id}` is the lowercased task ID, `{ID}` the raw ID,
 * `{slug}` the optional slug; a missing slug drops itself and one leading separator.
 */
export const renderBranch = (template: string, id: string, slug: string | null): string => {
  const withSlug = slug ? template.replaceAll('{slug}', slug) : template.replace(/[-_/.]?\{slug\}/g, '')
  return withSlug.replaceAll('{id}', id.toLowerCase()).replaceAll('{ID}', id)
}
