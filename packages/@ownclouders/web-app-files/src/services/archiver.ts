// Workaround https://github.com/npm/node-semver/issues/381
import major from 'semver/functions/major'
import rcompare from 'semver/functions/rcompare'

import { RuntimeError } from 'web-runtime/src/container/error'
import { ClientService } from 'web-pkg/src/services'
import { urlJoin } from 'web-client/src/utils'
import { configurationManager } from 'web-pkg/src/configuration'
import { triggerDownloadWithFilename } from 'web-pkg/src/helpers'
/**
 * Archiver struct within the capabilities as defined in reva
 * @see https://github.com/cs3org/reva/blob/41d5a6858c2200a61736d2c165e551b9785000d1/internal/http/services/owncloud/ocs/data/capabilities.go#L105
 */
export interface ArchiverCapability {
  enabled: boolean
  version: string // version is just a major version, e.g. `v2`
  formats: string[]
  // eslint-disable-next-line camelcase
  archiver_url: string
}

interface TriggerDownloadOptions {
  dir?: string
  files?: string[]
  fileIds?: string[]
  downloadSecret?: string
  publicToken?: string
  publicLinkPassword?: string
}

export class ArchiverService {
  clientService: ClientService
  serverUrl: string
  capability?: ArchiverCapability

  constructor(
    clientService: ClientService,
    serverUrl: string,
    archiverCapabilities: ArchiverCapability[] = []
  ) {
    this.clientService = clientService
    this.serverUrl = serverUrl
    const archivers = archiverCapabilities
      .filter((a) => a.enabled)
      .sort((a1, a2) => rcompare(a1.version, a2.version))
    this.capability = archivers.length ? archivers[0] : null
  }

  public get available(): boolean {
    return !!this.capability?.version
  }

  public get fileIdsSupported(): boolean {
    return major(this.capability?.version) >= 2
  }

  public async triggerDownload(options: TriggerDownloadOptions): Promise<string> {
    if (!this.available) {
      throw new RuntimeError('no archiver available')
    }

    if ((options.fileIds?.length || 0) + (options.files?.length || 0) === 0) {
      throw new RuntimeError('requested archive with empty list of resources')
    }

    const downloadUrl = this.buildDownloadUrl({ ...options })
    if (!downloadUrl) {
      throw new RuntimeError('download url could not be built')
    }

    const url = options.publicToken
      ? downloadUrl
      : await this.clientService.owncloudSdk.signUrl(downloadUrl)

    try {
      const response = await this.clientService.httpUnAuthenticated.get(url, {
        headers: {
          ...(!!options.publicLinkPassword && {
            Authorization:
              'Basic ' +
              Buffer.from(['public', options.publicLinkPassword].join(':')).toString('base64')
          })
        },
        responseType: 'arraybuffer'
      })

      const blob = new Blob([response.data], { type: 'application/octet-stream' })
      const objectUrl = URL.createObjectURL(blob)
      const fileName = this.getFileNameFromResponseHeaders(response.headers)
      triggerDownloadWithFilename(objectUrl, fileName)
      return url
    } catch (e) {
      throw new RuntimeError('archive could not be fetched')
    }
  }

  private buildDownloadUrl(options: TriggerDownloadOptions): string {
    const queryParams = []
    if (options.publicToken) {
      queryParams.push(`public-token=${options.publicToken}`)
    }

    const majorVersion = major(this.capability.version)
    switch (majorVersion) {
      case 2: {
        queryParams.push(...options.fileIds.map((id) => `id=${id}`))
        return this.url + '?' + queryParams.join('&')
      }
      case 1: {
        // see https://github.com/owncloud/core/blob/e285879a8a79e692497937ebf340bc6b9c925b4f/apps/files/js/files.js#L315 for reference
        // classic ui does a check whether the download started. not implemented here (yet?).
        const downloadStartSecret = Math.random().toString(36).substring(2)
        queryParams.push(
          `dir=${encodeURIComponent(options.dir)}`,
          ...options.files.map((name) => `files[]=${encodeURIComponent(name)}`),
          `downloadStartSecret=${downloadStartSecret}`
        )
        return this.url + '?' + queryParams.join('&')
      }
      default: {
        return undefined
      }
    }
  }

  private get url(): string {
    if (!this.available) {
      throw new RuntimeError('no archiver available')
    }
    if (/^https?:\/\//i.test(this.capability.archiver_url)) {
      return this.capability.archiver_url
    }
    return urlJoin(configurationManager.serverUrl, this.capability.archiver_url)
  }

  private getFileNameFromResponseHeaders(headers) {
    const fileName = headers['content-disposition']?.split('"')[1]
    return decodeURI(fileName)
  }
}
