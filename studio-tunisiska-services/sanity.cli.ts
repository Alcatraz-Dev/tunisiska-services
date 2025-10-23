import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'ci4uj541',
    dataset: 'production'
  },
  deployment: {
     appId: 'zwsc5gyzjs5fqnq2hdmjnll9',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/cli#auto-updates
     */
    autoUpdates: false,
  }
})
