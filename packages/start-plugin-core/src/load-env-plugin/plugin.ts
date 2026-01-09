import { loadEnv } from 'vite'
import type { Plugin } from 'vite'

// Track keys loaded from .env files across server restarts
const loadedEnvKeys = new Set<string>()

export function loadEnvPlugin(): Plugin {
  return {
    name: 'tanstack-start-core:load-env',
    enforce: 'pre',
    config(config, { mode }) {
      // Workaround for Vite issue #17689: loadEnv() won't override existing process.env keys.
      // When Vite restarts the dev server on .env file changes, the old env values
      // are still in process.env, preventing loadEnv() from returning fresh values.
      // We clear previously loaded keys before loading fresh values.
      // This runs in the config hook (before configResolved) to ensure env vars
      // are cleared before Vite populates config.env.
      for (const key of loadedEnvKeys) {
        delete process.env[key]
      }
      loadedEnvKeys.clear()

      const root = config.root || process.cwd()
      const env = loadEnv(mode, root, '')
      for (const key of Object.keys(env)) {
        loadedEnvKeys.add(key)
      }
      Object.assign(process.env, env)

      // Return empty config - we're just updating process.env
      return {}
    },
  }
}
