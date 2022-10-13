import { ClientService } from 'web-pkg/src/services'
import {
  useAccessToken,
  useCapabilityFilesTusExtension,
  useCapabilityFilesTusSupportHttpMethodOverride,
  useCapabilityFilesTusSupportMaxChunkSize,
  useClientService,
  usePublicLinkContext,
  usePublicLinkPassword,
  useStore
} from 'web-pkg/src/composables'
import { computed, unref, watch } from '@vue/composition-api'
import { UppyService } from '../../services/uppyService'
import * as uuid from 'uuid'
import { SpaceResource } from 'web-client/src/helpers'
import { join } from 'path'

export interface UppyResource {
  id?: string
  source: string
  name: string
  type: string
  data: Blob
  meta: {
    // IMPORTANT: must only contain primitive types, complex types won't be serialized properly!
    // current space & folder
    spaceId: string | number
    spaceName: string
    driveAlias: string
    driveType: string
    currentFolder: string // current folder path during upload initiation
    currentFolderId?: string | number
    fileId?: string | number
    // upload data
    relativeFolder: string
    relativePath: string
    tusEndpoint: string
    uploadId: string
    topLevelFolderId?: string
    // route data
    routeName?: string
    routeDriveAliasAndItem?: string
    routeShareId?: string
  }
}

interface UploadOptions {
  uppyService: UppyService
}

interface UploadResult {
  createDirectoryTree(
    space: SpaceResource,
    currentPath: string,
    files: UppyResource[],
    currentFolderId?: string | number
  ): void
}

export function useUpload(options: UploadOptions): UploadResult {
  const store = useStore()
  const clientService = useClientService()
  const publicLinkPassword = usePublicLinkPassword({ store })
  const isPublicLinkContext = usePublicLinkContext({ store })
  const accessToken = useAccessToken({ store })

  const tusHttpMethodOverride = useCapabilityFilesTusSupportHttpMethodOverride()
  const tusMaxChunkSize = useCapabilityFilesTusSupportMaxChunkSize()
  const tusExtension = useCapabilityFilesTusExtension()

  const headers = computed((): { [key: string]: string } => {
    if (unref(isPublicLinkContext)) {
      const password = unref(publicLinkPassword)
      if (password) {
        return { Authorization: 'Basic ' + Buffer.from('public:' + password).toString('base64') }
      }

      return {}
    }
    return {
      Authorization: 'Bearer ' + unref(accessToken)
    }
  })

  const uppyOptions = computed(() => {
    const isTusSupported = unref(tusMaxChunkSize) > 0

    return {
      isTusSupported,
      onBeforeRequest: (req) => {
        req.setHeader('Authorization', unref(headers).Authorization)
      },
      headers: (file) => ({
        'x-oc-mtime': file.data.lastModified / 1000,
        ...unref(headers)
      }),
      ...(isTusSupported && {
        tusMaxChunkSize: unref(tusMaxChunkSize),
        tusHttpMethodOverride: unref(tusHttpMethodOverride),
        tusExtension: unref(tusExtension)
      })
    }
  })

  watch(
    uppyOptions,
    () => {
      if (unref(uppyOptions).isTusSupported) {
        options.uppyService.useTus(unref(uppyOptions) as any)
        return
      }
      options.uppyService.useXhr(unref(uppyOptions) as any)
    },
    { immediate: true }
  )

  return {
    createDirectoryTree: createDirectoryTree({
      clientService,
      uppyService: options.uppyService
    })
  }
}

const createDirectoryTree = ({
  clientService,
  uppyService
}: {
  clientService: ClientService
  uppyService: UppyService
}) => {
  return async (
    space: SpaceResource,
    currentFolder: string,
    files: UppyResource[],
    currentFolderId?: string | number
  ) => {
    const { webdav } = clientService
    const createdFolders = []
    for (const file of files) {
      const directory = file.meta.relativeFolder

      if (!directory || createdFolders.includes(directory)) {
        continue
      }

      const folders = directory.split('/')
      let createdSubFolders = ''
      for (const subFolder of folders) {
        if (!subFolder) {
          continue
        }

        const folderToCreate = `${createdSubFolders}/${subFolder}`
        if (createdFolders.includes(folderToCreate)) {
          createdSubFolders += `/${subFolder}`
          createdFolders.push(createdSubFolders)
          continue
        }

        const uploadId = createdSubFolders ? uuid.v4() : file.meta.topLevelFolderId
        const uppyResource = {
          id: uuid.v4(),
          name: subFolder,
          isFolder: true,
          type: 'folder',
          meta: {
            // current space & folder
            spaceId: space.id,
            spaceName: space.name,
            driveAlias: space.driveAlias,
            driveType: space.driveType,
            currentFolder,
            currentFolderId,
            // upload data
            relativeFolder: createdSubFolders,
            uploadId,
            // route data
            routeName: file.meta.routeName,
            routeDriveAliasAndItem: file.meta.routeDriveAliasAndItem,
            routeShareId: file.meta.routeShareId
          }
        }

        uppyService.publish('addedForUpload', [uppyResource])

        let folder
        try {
          folder = await webdav.createFolder(space, { path: join(currentFolder, folderToCreate) })
        } catch (error) {
          console.error(error)
        }

        uppyService.publish('uploadSuccess', {
          ...uppyResource,
          meta: { ...uppyResource.meta, fileId: folder?.fileId }
        })

        createdSubFolders += `/${subFolder}`
        createdFolders.push(createdSubFolders)
      }
    }
  }
}
