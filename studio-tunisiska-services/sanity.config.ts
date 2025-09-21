import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'
import { Structure } from './Structure'
import { notificationActions } from '../actions/sendNotification'

export default defineConfig({
  name: 'default',
  title: 'Tunisiska Services',

  projectId: 'ci4uj541',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: Structure,
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => notificationActions(prev, context),
  },
})