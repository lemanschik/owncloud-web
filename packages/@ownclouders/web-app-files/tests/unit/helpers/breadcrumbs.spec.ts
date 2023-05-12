import { RouteLocation } from 'web-test-helpers/src'
import { breadcrumbsFromPath, concatBreadcrumbs } from '../../../src/helpers/breadcrumbs'

describe('builds an array of breadcrumbitems', () => {
  it('from a path', () => {
    const breadCrumbs = breadcrumbsFromPath(
      { path: '/files/spaces/personal/home/test' } as RouteLocation,
      '/test'
    )
    expect(breadCrumbs).toEqual([
      {
        allowContextActions: true,
        text: 'test',
        to: { path: '/files/spaces/personal/home/test', query: {} }
      }
    ])
  })

  it('from an array of breadcrumbitems', () => {
    const initialBreadCrumbs = [{ text: 'Foo' }, { text: 'Bar' }]
    const breadCrumbsFromPath = breadcrumbsFromPath(
      { path: '/app/foo/bar?all=500' } as RouteLocation,
      '/bar'
    )
    const result = concatBreadcrumbs(...initialBreadCrumbs, ...breadCrumbsFromPath)
    expect(result[0]).toMatchObject({ text: 'Foo' })
    expect(result[1]).toMatchObject({ text: 'Bar' })
    expect(JSON.stringify(result[2])).toEqual(
      JSON.stringify({
        allowContextActions: true,
        text: 'bar',
        onClick: () => undefined
      })
    )
  })
})
