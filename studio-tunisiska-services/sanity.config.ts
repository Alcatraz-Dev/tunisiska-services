import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {Structure} from './Structure'
import {colorInput} from '@sanity/color-input'
export default defineConfig({
  name: 'default',
  title: 'Tunisiska Services',

  projectId: 'ci4uj541',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: Structure,
    }),
    visionTool(), colorInput()
  ],

  schema: {
    types: schemaTypes,
  },
})
