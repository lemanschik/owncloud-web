import SpaceContextActions from '../../../../src/components/Spaces/SpaceContextActions.vue'
import { buildSpace } from 'web-client/src/helpers'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  mount,
  defaultStoreMockOptions,
  RouteLocation
} from 'web-test-helpers'
import { mock } from 'jest-mock-extended'

const spaceMock = {
  id: '1',
  root: { permissions: [{ roles: ['manager'], grantedToIdentities: [{ user: { id: 1 } }] }] }
}

describe('SpaceContextActions', () => {
  describe('action handlers', () => {
    it('renders actions that are always available: "Members", "Edit Quota", "Details"', () => {
      const { wrapper } = getWrapper(buildSpace(spaceMock))
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
})

function getWrapper(space) {
  const mocks = defaultComponentMocks({ currentRoute: mock<RouteLocation>({ path: '/files' }) })
  mocks.$previewService.getSupportedMimeTypes.mockReturnValue([])
  const store = createStore(defaultStoreMockOptions)
  return {
    wrapper: mount(SpaceContextActions, {
      props: {
        actionOptions: {
          resources: [space]
        }
      },
      global: {
        mocks,
        plugins: [
          ...defaultPlugins({
            abilities: [{ action: 'set-quota-all', subject: 'Space' }]
          }),
          store
        ]
      }
    })
  }
}
