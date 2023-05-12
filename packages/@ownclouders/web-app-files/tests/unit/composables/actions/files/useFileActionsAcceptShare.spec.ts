import { mock } from 'jest-mock-extended'
import { unref } from 'vue'
import { useFileActionsAcceptShare } from 'web-app-files/src/composables/actions/files/useFileActionsAcceptShare'
import { Resource } from 'web-client'
import { ShareStatus } from 'web-client/src/helpers/share'
import { useStore } from 'web-pkg/src/composables'
import { defaultComponentMocks, getComposableWrapper, RouteLocation } from 'web-test-helpers'

const sharesWithMeLocation = 'files-shares-with-me'
const sharesWithOthersLocation = 'files-shares-with-others'

describe('acceptShare', () => {
  describe('computed property "actions"', () => {
    describe('isEnabled property of returned element', () => {
      it.each([
        { resources: [{ status: ShareStatus.pending }] as Resource[], expectedStatus: true },
        { resources: [{ status: ShareStatus.declined }] as Resource[], expectedStatus: true },
        { resources: [{ status: ShareStatus.accepted }] as Resource[], expectedStatus: false }
      ])(
        `should be set according to the resource share status if the route name is "${sharesWithMeLocation}"`,
        (inputData) => {
          const { wrapper } = getWrapper({
            setup: () => {
              const store = useStore()
              const { actions } = useFileActionsAcceptShare({ store })

              const resources = inputData.resources
              expect(unref(actions)[0].isEnabled({ space: null, resources })).toBe(
                inputData.expectedStatus
              )
            }
          })
        }
      )
      it.each([
        { status: ShareStatus.pending } as Resource,
        { status: ShareStatus.declined } as Resource,
        { status: ShareStatus.accepted } as Resource
      ])(
        `should be set as false if the route name is other than "${sharesWithMeLocation}"`,
        (resource) => {
          const { wrapper } = getWrapper({
            routeName: sharesWithOthersLocation,
            setup: () => {
              const store = useStore()
              const { actions } = useFileActionsAcceptShare({ store })

              expect(
                unref(actions)[0].isEnabled({ space: null, resources: [resource] })
              ).toBeFalsy()
            }
          })
        }
      )
    })
  })
})

function getWrapper({ setup, routeName = sharesWithMeLocation }) {
  return {
    wrapper: getComposableWrapper(setup, {
      mocks: defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) })
    })
  }
}
