import NotFoundMessage from '../../../../src/components/FilesList/NotFoundMessage.vue'
import { createLocationPublic, createLocationSpaces } from '../../../../src/router'
import { PublicSpaceResource, SpaceResource, Resource } from 'web-client/src/helpers'
import { MockProxy, mock } from 'jest-mock-extended'
import { join } from 'path'
import { defaultComponentMocks, defaultPlugins, shallowMount } from 'web-test-helpers'

const selectors = {
  homeButton: '#files-list-not-found-button-go-home',
  reloadLinkButton: '#files-list-not-found-button-reload-link'
}

const spacesLocation = createLocationSpaces('files-spaces-generic')
const publicLocation = createLocationPublic('files-public-link')

describe('NotFoundMessage', () => {
  describe('when user on personal route', () => {
    let space: MockProxy<SpaceResource>
    beforeEach(() => {
      space = mock<SpaceResource>({
        driveType: 'personal'
      })
    })

    it('should show home button', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const homeButton = wrapper.find(selectors.homeButton)

      expect(homeButton.exists()).toBeTruthy()
      expect(homeButton.find('span')).toBeTruthy()
      expect(homeButton.find('span').text()).toBe('Go to »Personal« page')
    })

    it('should not show reload public link button', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const reloadLinkButton = wrapper.find(selectors.reloadLinkButton)

      expect(reloadLinkButton.exists()).toBeFalsy()
    })

    it('should have property route to personal space', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const homeButton = wrapper.findComponent<any>(selectors.homeButton)

      expect(homeButton.props().to.name).toBe(spacesLocation.name)
      expect(homeButton.props().to.params.driveAliasAndItem).toBe('personal')
    })
  })

  describe('when user on public link route', () => {
    let space: MockProxy<PublicSpaceResource>
    beforeEach(() => {
      space = mock<PublicSpaceResource>({
        driveType: 'public'
      })
      space.getDriveAliasAndItem.mockImplementation((resource) =>
        join('public/1234', resource.path)
      )
    })

    it('should show reload link button', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const reloadLinkButton = wrapper.find(selectors.reloadLinkButton)

      expect(reloadLinkButton.exists()).toBeTruthy()
      expect(reloadLinkButton.find('span')).toBeTruthy()
      expect(reloadLinkButton.find('span').text()).toBe('Reload public link')
    })

    it('should not show home button', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const homeButton = wrapper.find(selectors.homeButton)

      expect(homeButton.exists()).toBeFalsy()
    })

    it('should have property route to files public list', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const reloadLinkButton = wrapper.findComponent<any>(selectors.reloadLinkButton)

      expect(reloadLinkButton.props().to.name).toBe(publicLocation.name)
      expect(reloadLinkButton.props().to.params.driveAliasAndItem).toBe(
        space.getDriveAliasAndItem({ path: '' } as Resource)
      )
    })
  })
})

function getWrapper(space, route) {
  return {
    wrapper: shallowMount(NotFoundMessage, {
      props: { space },
      global: {
        renderStubDefaultSlot: true,
        mocks: defaultComponentMocks({ currentRoute: route }),
        plugins: [...defaultPlugins()]
      }
    })
  }
}
