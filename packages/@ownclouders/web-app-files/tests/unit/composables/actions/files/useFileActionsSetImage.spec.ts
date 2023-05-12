import { useFileActionsSetImage } from 'web-app-files/src/composables/actions/files/useFileActionsSetImage'
import { buildSpace, Resource, SpaceResource } from 'web-client/src/helpers'
import { mock, mockDeep } from 'jest-mock-extended'
import {
  createStore,
  defaultStoreMockOptions,
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper,
  mockAxiosResolve
} from 'web-test-helpers'
import { unref } from 'vue'
import { Drive } from 'web-client/src/generated'

describe('setImage', () => {
  describe('isEnabled property', () => {
    it('should be false when no resource given', () => {
      const space = buildSpace({
        id: '1',
        quota: {},
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }]
        },
        special: [{ specialFolder: { name: 'image' }, file: { mimeType: 'image/png' } }]
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isEnabled({ space, resources: [] as Resource[] })).toBe(false)
        }
      })
    })
    it('should be false when mimeType is not image', () => {
      const space = buildSpace({
        id: '1',
        quota: {},
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }]
        },
        special: [{ specialFolder: { name: 'image' }, file: { mimeType: 'image/png' } }]
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'text/plain' }] as Resource[]
            })
          ).toBe(false)
        },
        isMimetypeSupported: false
      })
    })
    it('should be true when the mimeType is image', () => {
      const space = buildSpace({
        id: '1',
        quota: {},
        root: {
          permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }]
        },
        special: [{ specialFolder: { name: 'image' }, file: { mimeType: 'image/png' } }]
      })
      getWrapper({
        setup: async ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'image/png' }] as Resource[]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when the current user is a viewer', () => {
      const space = buildSpace({
        id: '1',
        quota: {},
        root: {
          permissions: [{ roles: ['viewer'], grantedToIdentities: [{ user: { id: 1 } }] }]
        },
        special: [{ specialFolder: { name: 'image' }, file: { mimeType: 'image/png' } }]
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isEnabled({
              space,
              resources: [{ id: 1, mimeType: 'image/png' }] as Resource[]
            })
          ).toBe(false)
        }
      })
    })
  })

  describe('handler', () => {
    it('should show message on success', () => {
      const driveMock = mock<Drive>({ special: [{ specialFolder: { name: 'image' } }] })

      const space = mock<SpaceResource>({ id: 1 })
      getWrapper({
        setup: async ({ actions }, { storeOptions, clientService }) => {
          clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
            mockAxiosResolve(driveMock)
          )
          await unref(actions)[0].handler({
            space,
            resources: [
              {
                webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/subfolder/image.png',
                name: 'image.png'
              }
            ] as Resource[]
          })
          expect(storeOptions.actions.showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })

    it('should show message on error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      const space = mock<SpaceResource>({ id: 1 })
      getWrapper({
        setup: async ({ actions }, { storeOptions }) => {
          await unref(actions)[0].handler({
            space,
            resources: [
              {
                webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/subfolder/image.png',
                name: 'image.png'
              }
            ] as Resource[]
          })
          expect(storeOptions.actions.showMessage).toHaveBeenCalledTimes(1)
        }
      })
    })

    /* FIXME: Reintroduce with latest copyMove bugfix
      it('should not copy the image if source and destination path are the same', async () => {
        mockAxios.request.mockImplementationOnce(() => {
          return Promise.resolve({ data: { special: [{ specialFolder: { name: 'image' } }] } })
        })
        getWrapper()
        await wrapper.vm.$_setSpaceImage_trigger({
          resources: [
            {
              webDavPath: '/spaces/1fe58d8b-aa69-4c22-baf7-97dd57479f22/.space/image.png',
              name: 'image.png'
            }
          ]
        })
        expect(wrapper.vm.$client.files.copy).toBeCalledTimes(0)
      }) */
  })
})

function getWrapper({
  setup,
  isMimetypeSupported = true
}: {
  setup: (
    instance: ReturnType<typeof useFileActionsSetImage>,
    options: {
      storeOptions: typeof defaultStoreMockOptions
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
  isMimetypeSupported?: boolean
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }
  mocks.$previewService.isMimetypeSupported.mockReturnValue(isMimetypeSupported)
  mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mockDeep<Resource>())

  const storeOptions = {
    ...defaultStoreMockOptions
  }
  storeOptions.getters.user.mockImplementation(() => ({ id: 'alice', uuid: 1 }))

  const store = createStore(storeOptions)
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsSetImage({ store })
        setup(instance, { storeOptions, clientService: mocks.$clientService })
      },
      {
        store,
        mocks
      }
    )
  }
}
