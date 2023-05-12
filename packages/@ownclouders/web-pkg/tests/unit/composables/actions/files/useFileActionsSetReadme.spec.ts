import { useFileActionsSetReadme } from 'web-pkg/src/composables/actions/files/useFileActionsSetReadme'
import { buildSpace, SpaceResource } from 'web-client/src/helpers'
import { mock, mockDeep } from 'jest-mock-extended'
import { OwnCloudSdk } from 'web-client/src/types'
import {
  createStore,
  defaultStoreMockOptions,
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper,
  mockAxiosResolve
} from 'web-test-helpers'
import { nextTick, unref } from 'vue'

describe('setReadme', () => {
  describe('isEnabled property', () => {
    it('should be false when no resource given', () => {
      const { wrapper } = getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ space: null, resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when mimeType is not text', () => {
      const space = buildSpace({
        id: '1',
        root: { permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }] },
        special: [{ specialFolder: { name: 'readme' } }]
      })
      const { wrapper } = getWrapper({
        resolveGetFileContents: true,
        space,
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'image/png' }] as SpaceResource[]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true when the mimeType is "text/plain"', () => {
      const space = buildSpace({
        id: '1',
        root: { permissions: [{ roles: ['viewer'], grantedToIdentities: [{ user: { id: 1 } }] }] },
        special: [{ specialFolder: { name: 'readme' } }]
      })
      const { wrapper } = getWrapper({
        resolveGetFileContents: true,
        space,
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'text/plain' }] as SpaceResource[]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true when the mimeType is text', () => {
      const space = buildSpace({
        id: '1',
        root: { permissions: [{ roles: ['viewer'], grantedToIdentities: [{ user: { id: 1 } }] }] },
        special: [{ specialFolder: { name: 'readme' } }]
      })
      const { wrapper } = getWrapper({
        resolveGetFileContents: true,
        space,
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'text' }] as SpaceResource[]
            })
          ).toBe(false)
        }
      })
    })
  })
  describe('handler', () => {
    it('should show message on success', async () => {
      const space = mock<SpaceResource>({ id: '1' })
      const { wrapper } = getWrapper({
        resolveGetFileContents: true,
        space,
        setup: async ({ actions }, { storeOptions }) => {
          unref(actions)[0].handler({
            space,
            resources: [
              {
                webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/subfolder',
                name: 'readme.md'
              }
            ] as SpaceResource[]
          })

          await nextTick()
          await nextTick()
          await nextTick()
          await nextTick()
          await nextTick()
          expect(storeOptions.actions.showMessage).toHaveBeenCalledWith(
            expect.anything(),
            expect.not.objectContaining({ status: 'danger' })
          )
        }
      })
    })

    it('should show message on error', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)

      const space = mock<SpaceResource>({ id: '1' })
      const { wrapper } = getWrapper({
        resolveGetFileContents: false,
        space,
        setup: async ({ actions }, { storeOptions }) => {
          unref(actions)[0].handler({
            space,
            resources: [
              {
                webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/subfolder',
                name: 'readme.md'
              }
            ] as SpaceResource[]
          })

          await nextTick()
          expect(storeOptions.actions.showMessage).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ status: 'danger' })
          )
        }
      })
    })
  })
})

function getWrapper({
  resolveGetFileContents = true,
  space = undefined,
  setup
}: {
  resolveGetFileContents?: boolean
  space?: SpaceResource
  setup: (
    instance: ReturnType<typeof useFileActionsSetReadme>,
    options: { storeOptions: typeof defaultStoreMockOptions }
  ) => void
}) {
  const clientMock = mockDeep<OwnCloudSdk>()

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    }),
    space
  }
  mocks.$clientService.owncloudSdk.files.getFileContents.mockImplementation(() => {
    if (resolveGetFileContents) {
      return Promise.resolve('readme')
    }
    return Promise.reject(new Error(''))
  })

  mocks.$clientService.owncloudSdk.files.putFileContents.mockImplementation(() =>
    Promise.resolve({ ETag: '60c7243c2e7f1' })
  )

  mocks.$clientService.webdav.getFileInfo.mockImplementation(() =>
    Promise.resolve({ id: '1', path: '/space.readme.md' })
  )

  mocks.$clientService.graphAuthenticated.drives.updateDrive.mockImplementation(() =>
    mockAxiosResolve({
      id: '1',
      name: 'space',
      special: [
        {
          eTag: '6721ccbd5754e8b46ddccebad12fa23f',
          file: {
            mimeType: 'text/markdown'
          },
          id: '1',
          name: 'readme.md',
          specialFolder: {
            name: 'readme'
          }
        }
      ]
    })
  )

  const storeOptions = {
    ...defaultStoreMockOptions
  }

  const store = createStore(storeOptions)
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsSetReadme({ store })
        setup(instance, { storeOptions })
      },
      {
        store,
        mocks
      }
    )
  }
}
