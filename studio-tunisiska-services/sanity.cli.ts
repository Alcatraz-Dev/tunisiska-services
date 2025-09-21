import {defineCliConfig} from 'sanity/cli'
import {notificationActions} from '../actions/sendNotification'

export default defineCliConfig({
  api: {
    projectId: 'ci4uj541',
    dataset: 'production',
  },
  deployment: {
    autoUpdates: true,
  },
  
})
