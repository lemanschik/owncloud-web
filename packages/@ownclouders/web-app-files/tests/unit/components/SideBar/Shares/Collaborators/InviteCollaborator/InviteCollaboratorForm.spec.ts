import { mock } from 'jest-mock-extended'
import InviteCollaboratorForm from 'web-app-files/src/components/SideBar/Shares/Collaborators/InviteCollaborator/InviteCollaboratorForm.vue'
import { ShareTypes } from 'web-client/src/helpers/share'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  RouteLocation,
  shallowMount
} from 'web-test-helpers'

const folderMock = {
  type: 'folder',
  isFolder: true,
  ownerId: 'alice',
  ownerDisplayName: 'alice',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740',
  isMounted: jest.fn(() => true),
  name: 'lorem.txt',
  privateLink: 'some-link',
  canShare: jest.fn(() => true),
  path: '/documents',
  canDeny: () => false
}

const spaceMock = {
  id: 1,
  type: 'space'
}

describe('InviteCollaboratorForm', () => {
  describe('renders correctly', () => {
    it.todo('renders a select field for share receivers')
    it.todo('renders an inviteDescriptionMessage')
    it.todo('renders a role selector component')
    it.todo('renders an expiration datepicker component')
    it.todo('renders an invite-sharees button')
    it.todo('renders an hidden-announcer')
  })
  describe('behaves correctly', () => {
    it.todo('upon mount fetches recipients')
    it('clicking the invite-sharees button calls the "share"-action', async () => {
      const selectedCollaborators = [
        { shareWith: 'marie', value: { shareType: ShareTypes.user.value }, label: 'label' }
      ]
      const { wrapper } = getWrapper({ selectedCollaborators })
      const spyTriggerUpload = jest.spyOn(wrapper.vm as any, 'share')
      const shareBtn = wrapper.find('#new-collaborators-form-create-button')
      expect(shareBtn.exists()).toBeTruthy()

      await shareBtn.trigger('click')
      expect(spyTriggerUpload).toHaveBeenCalledTimes(0)
    })
    it.each([
      { storageId: undefined, resource: folderMock, addMethod: 'addShare' },
      { storageId: undefined, resource: spaceMock, addMethod: 'addSpaceMember' },
      { storageId: 1, resource: folderMock, addMethod: 'addShare' }
    ])('calls the "addShare" action', async (dataSet) => {
      const selectedCollaborators = [
        { shareWith: 'marie', value: { shareType: ShareTypes.user.value }, label: 'label' }
      ]
      const { wrapper } = getWrapper({
        selectedCollaborators,
        storageId: dataSet.storageId,
        resource: dataSet.resource as any
      })
      const addShareSpy = jest.spyOn(wrapper.vm as any, dataSet.addMethod)
      await (wrapper.vm as any).share()
      expect(addShareSpy).toHaveBeenCalled()
    })
    it.todo('resets focus upon selecting an invitee')
  })
})

function getWrapper({
  selectedCollaborators = [],
  storageId = 'fake-storage-id',
  resource = folderMock
} = {}) {
  const storeOptions = defaultStoreMockOptions
  storeOptions.getters.capabilities.mockImplementation(() => ({
    files_sharing: { federation: { incoming: true, outgoing: true } }
  }))
  const store = createStore(storeOptions)
  return {
    wrapper: shallowMount(InviteCollaboratorForm, {
      data() {
        return {
          selectedCollaborators
        }
      },
      global: {
        plugins: [...defaultPlugins(), store],
        provide: { resource },
        mocks: defaultComponentMocks({
          currentRoute: mock<RouteLocation>({ params: { storageId } })
        })
      }
    })
  }
}
