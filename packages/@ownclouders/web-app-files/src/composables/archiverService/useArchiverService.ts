import { useService } from 'web-pkg/src/composables/service'
import { ArchiverService } from '../../services'

export const useArchiverService = (): ArchiverService => {
  return useService('$archiverService')
}
