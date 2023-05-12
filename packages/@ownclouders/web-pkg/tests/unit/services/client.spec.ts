import { HttpClient } from '../../../src/http'
import { ClientService, ConfigurationManager } from 'web-pkg'
import { Language } from 'vue3-gettext'
import { Store } from 'vuex'
import mockAxios from 'jest-mock-axios'
import { client as _client } from 'web-client'

const getters = { 'runtime/auth/accessToken': 'token' }
const language = { current: 'en' }
const serverUrl = 'someUrl'

const getClientServiceMock = () => {
  return new ClientService({
    configurationManager: { serverUrl } as ConfigurationManager,
    language: language as Language,
    store: { getters } as Store<any>
  })
}
const v4uuid = '00000000-0000-0000-0000-000000000000'
jest.mock('uuid', () => ({ v4: () => v4uuid }))
jest.mock('web-client', () => ({ client: jest.fn(() => ({ graph: {}, ocs: {} })) }))

describe('ClientService', () => {
  beforeEach(() => {
    getters['runtime/auth/accessToken'] = 'token'
    language.current = 'en'
  })
  it('initializes a http authenticated client', () => {
    const clientService = getClientServiceMock()
    const client = clientService.httpAuthenticated
    expect(client).toBeInstanceOf(HttpClient)
    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'Accept-Language': language.current,
          Authorization: `Bearer ${getters['runtime/auth/accessToken']}`,
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': v4uuid
        }
      })
    )
    expect(mockAxios.create).toHaveBeenCalledTimes(1)
    // test re-instantiation on token and language change
    clientService.httpAuthenticated
    expect(mockAxios.create).toHaveBeenCalledTimes(1)
    getters['runtime/auth/accessToken'] = 'changedToken'
    clientService.httpAuthenticated
    expect(mockAxios.create).toHaveBeenCalledTimes(2)
    language.current = 'de'
    clientService.httpAuthenticated
    expect(mockAxios.create).toHaveBeenCalledTimes(3)
  })
  it('initializes a http unauthenticated client', () => {
    const clientService = getClientServiceMock()
    const client = clientService.httpUnAuthenticated
    expect(client).toBeInstanceOf(HttpClient)
    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'Accept-Language': language.current,
          'X-Requested-With': 'XMLHttpRequest',
          'X-Request-ID': v4uuid
        }
      })
    )
    expect(mockAxios.create).toHaveBeenCalledTimes(1)
    // test re-instantiation on token and language change
    clientService.httpUnAuthenticated
    expect(mockAxios.create).toHaveBeenCalledTimes(1)
    clientService.httpUnAuthenticated
    language.current = 'de'
    clientService.httpUnAuthenticated
    expect(mockAxios.create).toHaveBeenCalledTimes(2)
  })
  it('initializes an graph client', () => {
    const graphClient = { id: 1 }
    jest.mocked(_client).mockImplementation(() => {
      return { graph: graphClient, ocs: {} } as any
    })
    const clientService = getClientServiceMock()
    const client = clientService.graphAuthenticated
    expect(_client).toHaveBeenCalledWith(serverUrl, expect.anything())
    expect(_client).toHaveBeenCalledTimes(1)
    expect(graphClient).toEqual(client)
    // test re-instantiation on token and language change
    clientService.graphAuthenticated
    expect(_client).toHaveBeenCalledTimes(1)
    getters['runtime/auth/accessToken'] = 'changedToken'
    clientService.graphAuthenticated
    expect(_client).toHaveBeenCalledTimes(2)
    language.current = 'de'
    clientService.graphAuthenticated
    expect(_client).toHaveBeenCalledTimes(3)
  })
  it('initializes an ocs user client', () => {
    const ocsClient = { id: 1 }
    jest.mocked(_client).mockImplementation(() => {
      return { graph: {}, ocs: ocsClient } as any
    })
    const clientService = getClientServiceMock()
    const client = clientService.ocsUserContext
    expect(_client).toHaveBeenCalledWith(serverUrl, expect.anything())
    expect(_client).toHaveBeenCalledTimes(1)
    expect(ocsClient).toEqual(client)
    // test re-instantiation on token and language change
    clientService.ocsUserContext
    expect(_client).toHaveBeenCalledTimes(1)
    getters['runtime/auth/accessToken'] = 'changedToken'
    clientService.ocsUserContext
    expect(_client).toHaveBeenCalledTimes(2)
    language.current = 'de'
    clientService.ocsUserContext
    expect(_client).toHaveBeenCalledTimes(3)
  })
  it('initializes an ocs public link client', () => {
    const ocsClient = { id: 1 }
    jest.mocked(_client).mockImplementation(() => {
      return { graph: {}, ocs: ocsClient } as any
    })
    const clientService = getClientServiceMock()
    const client = clientService.ocsPublicLinkContext()
    expect(_client).toHaveBeenCalledWith(serverUrl, expect.anything())
    expect(_client).toHaveBeenCalledTimes(1)
    expect(ocsClient).toEqual(client)
    // test re-instantiation on token and language change
    clientService.ocsPublicLinkContext()
    expect(_client).toHaveBeenCalledTimes(1)
    getters['runtime/auth/accessToken'] = 'changedToken'
    clientService.ocsPublicLinkContext()
    expect(_client).toHaveBeenCalledTimes(2)
    language.current = 'de'
    clientService.ocsPublicLinkContext()
    expect(_client).toHaveBeenCalledTimes(3)
  })
})
