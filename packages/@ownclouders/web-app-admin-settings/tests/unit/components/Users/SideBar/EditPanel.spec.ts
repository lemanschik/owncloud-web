import EditPanel from '../../../../../src/components/Users/SideBar/EditPanel.vue'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  defaultStoreMockOptions,
  mockAxiosReject,
  shallowMount
} from 'web-test-helpers'
import { mock } from 'jest-mock-extended'
import { Group } from 'web-client/src/generated'
import { AxiosResponse } from 'axios'

const availableGroupOptions = [
  mock<Group>({ id: '1', displayName: 'group1', groupTypes: [] }),
  mock<Group>({ id: '2', displayName: 'group2', groupTypes: [] })
]
const selectors = {
  groupSelectStub: 'group-select-stub'
}

describe('EditPanel', () => {
  it('renders all available inputs', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('filters selected groups when passing the options to the GroupSelect component', () => {
    const { wrapper } = getWrapper({ selectedGroups: [availableGroupOptions[0]] })
    const selectedGroups = wrapper
      .findComponent<any>(selectors.groupSelectStub)
      .props('selectedGroups')
    const groupOptions = wrapper.findComponent<any>(selectors.groupSelectStub).props('groupOptions')
    expect(selectedGroups.length).toBe(1)
    expect(selectedGroups[0].id).toEqual(availableGroupOptions[0].id)
    expect(groupOptions.length).toBe(1)
    expect(groupOptions[0].id).toEqual(availableGroupOptions[1].id)
  })

  describe('method "isInputFieldReadOnly"', () => {
    it('should be true if included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper({ readOnlyUserAttributes: ['user.displayName'] })
      expect(wrapper.vm.isInputFieldReadOnly('user.displayName')).toBeTruthy()
    })
    it('should be false if not included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.vm.isInputFieldReadOnly('user.displayName')).toBeFalsy()
    })
  })

  describe('method "revertChanges"', () => {
    it('should revert changes on property editUser', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.displayName = 'jana'
      wrapper.vm.editUser.mail = 'jana@owncloud.com'
      wrapper.vm.revertChanges()
      expect(wrapper.vm.editUser.displayName).toEqual('jan')
      expect(wrapper.vm.editUser.mail).toEqual('jan@owncloud.com')
    })
    it('should revert changes on property formData', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.formData.displayName.valid = false
      wrapper.vm.formData.displayName.errorMessage = 'error'
      wrapper.vm.revertChanges()
      expect(wrapper.vm.formData.displayName.valid).toBeTruthy()
      expect(wrapper.vm.formData.displayName.errorMessage).toEqual('')
    })
  })

  describe('method "validateUserName"', () => {
    it('should be false when userName is empty', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.onPremisesSamAccountName = ''
      expect(await wrapper.vm.validateUserName()).toBeFalsy()
    })
    it('should be false if userName is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.onPremisesSamAccountName = 'n'.repeat(256)
      expect(await wrapper.vm.validateUserName()).toBeFalsy()
    })
    it('should be false when userName contains white spaces', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.onPremisesSamAccountName = 'jan owncCloud'
      expect(await wrapper.vm.validateUserName()).toBeFalsy()
    })
    it('should be false when userName starts with a numeric value', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.onPremisesSamAccountName = '1moretry'
      expect(await wrapper.vm.validateUserName()).toBeFalsy()
    })
    it('should be false when userName is already existing', async () => {
      const { wrapper, mocks } = getWrapper()
      const graphMock = mocks.$clientService.graphAuthenticated
      const getUserStub = graphMock.users.getUser.mockResolvedValue(
        mock<AxiosResponse>({ data: { onPremisesSamAccountName: 'jan' } })
      )
      wrapper.vm.editUser.onPremisesSamAccountName = 'jan'
      expect(await wrapper.vm.validateUserName()).toBeFalsy()
      expect(getUserStub).toHaveBeenCalled()
    })
    it('should be true when userName is valid', async () => {
      const { wrapper, mocks } = getWrapper()
      const graphMock = mocks.$clientService.graphAuthenticated
      const getUserStub = graphMock.users.getUser.mockRejectedValue(() => mockAxiosReject())
      wrapper.vm.editUser.onPremisesSamAccountName = 'jana'
      expect(await wrapper.vm.validateUserName()).toBeTruthy()
      expect(getUserStub).toHaveBeenCalled()
    })
  })

  describe('method "validateDisplayName"', () => {
    it('should return true if displayName is valid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.displayName = 'jan'
      expect(wrapper.vm.validateDisplayName()).toBeTruthy()
      expect(wrapper.vm.formData.displayName.valid).toBeTruthy()
    })
    it('should be false if displayName is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.displayName = 'n'.repeat(256)
      expect(await wrapper.vm.validateDisplayName()).toBeFalsy()
    })
    it('should return false if displayName is not valid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.displayName = ''
      expect(wrapper.vm.validateDisplayName()).toBeFalsy()
      expect(wrapper.vm.formData.displayName.valid).toBeFalsy()
    })
  })

  describe('method "validateEmail"', () => {
    it('should return true if email is valid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.mail = 'jan@owncloud.com'
      expect(wrapper.vm.validateEmail()).toBeTruthy()
      expect(wrapper.vm.formData.email.valid).toBeTruthy()
    })
    it('should return false if email is not valid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.editUser.mail = ''
      expect(wrapper.vm.validateEmail()).toBeFalsy()
      expect(wrapper.vm.formData.email.valid).toBeFalsy()
    })
  })

  describe('computed method "invalidFormData"', () => {
    it('should be false if formData is invalid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.formData.displayName.valid = true
      expect(wrapper.vm.invalidFormData).toBeFalsy()
    })
    it('should be true if formData is valid', () => {
      const { wrapper } = getWrapper()
      wrapper.vm.formData.displayName.valid = false
      expect(wrapper.vm.invalidFormData).toBeTruthy()
    })
  })

  describe('group select', () => {
    it('takes all available groups', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.findComponent<any>('group-select-stub').props('groupOptions').length).toBe(
        availableGroupOptions.length
      )
    })
    it('filters out read-only groups', () => {
      const { wrapper } = getWrapper({
        groups: [mock<Group>({ id: '1', displayName: 'group1', groupTypes: ['ReadOnly'] })]
      })
      expect(wrapper.findComponent<any>('group-select-stub').props('groupOptions').length).toBe(0)
    })
  })
})

function getWrapper({
  readOnlyUserAttributes = [],
  selectedGroups = [],
  groups = availableGroupOptions
} = {}) {
  const mocks = defaultComponentMocks()
  const storeOptions = defaultStoreMockOptions
  storeOptions.getters.capabilities.mockReturnValue({
    graph: {
      read_only_user_attributes: readOnlyUserAttributes
    }
  })
  const store = createStore(storeOptions)
  return {
    mocks,
    wrapper: shallowMount(EditPanel, {
      props: {
        user: {
          id: '1',
          displayName: 'jan',
          mail: 'jan@owncloud.com',
          passwordProfile: { password: '' },
          drive: { quota: {} },
          memberOf: selectedGroups
        },
        roles: [{ id: '1', displayName: 'admin' }],
        groups
      },
      global: {
        mocks,
        plugins: [...defaultPlugins(), store]
      }
    })
  }
}
