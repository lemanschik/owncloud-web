import translations from '../l10n/translations.json'
import General from './views/General.vue'
import Users from './views/Users.vue'
import Groups from './views/Groups.vue'
import Spaces from './views/Spaces.vue'
import { Ability } from 'web-pkg'
import { AppNavigationItem } from 'web-pkg/src/apps'

// just a dummy function to trick gettext tools
function $gettext(msg) {
  return msg
}

const appInfo = {
  name: $gettext('Administration Settings'),
  id: 'admin-settings',
  icon: 'settings-4',
  isFileEditor: false
}

const routes = ({ $ability }: { $ability: Ability }) => [
  {
    path: '/',
    redirect: () => {
      if ($ability.can('read-all', 'Setting')) {
        return { name: 'admin-settings-general' }
      }
      if ($ability.can('read-all', 'Account')) {
        return { name: 'admin-settings-users' }
      }
      if ($ability.can('read-all', 'Group')) {
        return { name: 'admin-settings-groups' }
      }
      if ($ability.can('read-all', 'Space')) {
        return { name: 'admin-settings-spaces' }
      }
      throw Error('Insufficient permissions')
    }
  },
  {
    path: '/general',
    name: 'admin-settings-general',
    component: General,
    beforeEnter: (to, from, next) => {
      if (!$ability.can('read-all', 'Setting')) {
        next({ path: '/' })
      }
      next()
    },
    meta: {
      authContext: 'user',
      title: $gettext('General')
    }
  },
  {
    path: '/users',
    name: 'admin-settings-users',
    component: Users,
    beforeEnter: (to, from, next) => {
      if (!$ability.can('read-all', 'Account')) {
        next({ path: '/' })
      }
      next()
    },
    meta: {
      authContext: 'user',
      title: $gettext('Users')
    }
  },
  {
    path: '/groups',
    name: 'admin-settings-groups',
    component: Groups,
    beforeEnter: (to, from, next) => {
      if (!$ability.can('read-all', 'Group')) {
        next({ path: '/' })
      }
      next()
    },
    meta: {
      authContext: 'user',
      title: $gettext('Groups')
    }
  },
  {
    path: '/spaces',
    name: 'admin-settings-spaces',
    component: Spaces,
    beforeEnter: (to, from, next) => {
      if (!$ability.can('read-all', 'Space')) {
        next({ path: '/' })
      }
      next()
    },
    meta: {
      authContext: 'user',
      title: $gettext('Spaces')
    }
  }
]

const navItems = ({ $ability }: { $ability: Ability }): AppNavigationItem[] => [
  {
    name: $gettext('General'),
    icon: 'settings-4',
    route: {
      path: `/${appInfo.id}/general?`
    },
    enabled: () => {
      return $ability.can('read-all', 'Setting')
    }
  },
  {
    name: $gettext('Users'),
    icon: 'user',
    route: {
      path: `/${appInfo.id}/users?`
    },
    enabled: () => {
      return $ability.can('read-all', 'Account')
    }
  },
  {
    name: $gettext('Groups'),
    icon: 'group-2',
    route: {
      path: `/${appInfo.id}/groups?`
    },
    enabled: () => {
      return $ability.can('read-all', 'Group')
    }
  },
  {
    name: $gettext('Spaces'),
    icon: 'layout-grid',
    route: {
      path: `/${appInfo.id}/spaces?`
    },
    enabled: () => {
      return $ability.can('read-all', 'Space')
    }
  }
]

export default {
  appInfo,
  routes,
  translations,
  navItems
}
