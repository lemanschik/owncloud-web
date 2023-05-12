import { ArchiverCapability, ArchiverService } from '../../../src/services'
import { RuntimeError } from 'web-runtime/src/container/error'
import { mock, mockDeep } from 'jest-mock-extended'
import { ClientService } from 'web-pkg'

const serverUrl = 'https://demo.owncloud.com'
const getArchiverServiceInstance = (capabilities: ArchiverCapability[]) => {
  const clientServiceMock = mockDeep<ClientService>()
  clientServiceMock.httpUnAuthenticated.get.mockResolvedValue({
    data: new ArrayBuffer(8),
    headers: { 'content-disposition': 'filename="download.tar"' }
  })
  clientServiceMock.owncloudSdk.signUrl.mockImplementation((url) => url)

  return new ArchiverService(clientServiceMock, serverUrl, capabilities)
}

describe('archiver', () => {
  describe('availability', () => {
    it('is unavailable if no version given via capabilities', () => {
      const capabilities = [mock<ArchiverCapability>({ version: undefined })]
      expect(getArchiverServiceInstance(capabilities).available).toBe(false)
    })
    it('is available if a version is given via capabilities', () => {
      const capabilities = [mock<ArchiverCapability>({ version: '1' })]
      expect(getArchiverServiceInstance(capabilities).available).toBe(true)
    })
  })
  it('does not trigger downloads when unavailable', async () => {
    const capabilities = [mock<ArchiverCapability>({ version: undefined })]
    const archiverService = getArchiverServiceInstance(capabilities)
    await expect(archiverService.triggerDownload({})).rejects.toThrow(
      new RuntimeError('no archiver available')
    )
  })
  describe('with one v2 archiver capability', () => {
    const archiverUrl = [serverUrl, 'archiver'].join('/')
    const capabilities = [
      {
        enabled: true,
        version: 'v2.3.5',
        archiver_url: archiverUrl,
        formats: []
      }
    ]

    it('is announcing itself as supporting fileIds', () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      expect(archiverService.fileIdsSupported).toBe(true)
    })
    it('fails to trigger a download if no files were given', async () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      await expect(archiverService.triggerDownload({})).rejects.toThrow(
        new RuntimeError('requested archive with empty list of resources')
      )
    })
    it('returns a download url for a valid archive download trigger', async () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      window.URL.createObjectURL = jest.fn()

      const fileId = 'asdf'
      const url = await archiverService.triggerDownload({ fileIds: [fileId] })
      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(url.startsWith(archiverUrl)).toBeTruthy()
      expect(url.indexOf(`id=${fileId}`)).toBeGreaterThan(-1)
    })
  })
  describe('with one v1 archiver capability', () => {
    const archiverUrl = [serverUrl, 'archiver'].join('/')
    const capabilities = [
      {
        enabled: true,
        version: 'v1.2.3',
        archiver_url: archiverUrl,
        formats: []
      }
    ]
    it('is announcing itself as not supporting fileIds', () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      expect(archiverService.fileIdsSupported).toBe(false)
    })
    it('fails to trigger a download if no files were given', async () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      await expect(archiverService.triggerDownload({})).rejects.toThrow(
        new RuntimeError('requested archive with empty list of resources')
      )
    })
    it('returns a download url for a valid archive download trigger', async () => {
      const archiverService = getArchiverServiceInstance(capabilities)
      window.URL.createObjectURL = jest.fn()
      const dir = '/some/path'
      const fileName = 'qwer'
      const url = await archiverService.triggerDownload({ dir, files: [fileName] })

      expect(window.URL.createObjectURL).toHaveBeenCalled()
      expect(url.startsWith(archiverUrl)).toBeTruthy()
      expect(url.indexOf(`files[]=${fileName}`)).toBeGreaterThan(-1)
      expect(url.indexOf(`dir=${encodeURIComponent(dir)}`)).toBeGreaterThan(-1)
      expect(url.indexOf('downloadStartSecret=')).toBeGreaterThan(-1)
    })
  })
  describe('with multiple archiver capabilities of different versions', () => {
    const archiverUrl = [serverUrl, 'archiver'].join('/')
    const capabilityV1 = {
      enabled: true,
      version: 'v1.2.3',
      archiver_url: archiverUrl + '/v1',
      formats: []
    }
    const capabilityV2 = {
      enabled: true,
      version: 'v2.3.5',
      archiver_url: archiverUrl + '/v2',
      formats: []
    }
    const capabilityV3 = {
      enabled: false,
      version: 'v3.2.5',
      archiver_url: archiverUrl + '/v3',
      formats: []
    }

    it('uses the highest major version', async () => {
      const capabilities = [capabilityV1, capabilityV2, capabilityV3]
      const archiverService = getArchiverServiceInstance(capabilities)
      const downloadUrl = await archiverService.triggerDownload({ fileIds: ['any'] })
      expect(downloadUrl.startsWith(capabilityV2.archiver_url)).toBeTruthy()
    })
  })
})
