import path from 'pathe'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

export function envHotReloadPlugin(): Plugin {
  let resolvedConfig: ResolvedConfig
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const triggerReload = (server: ViteDevServer) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      try {
        console.info('[tanstack-start] .env file changed, reloading...')

        // Invalidate all modules so import.meta.env gets re-transformed
        server.moduleGraph.invalidateAll()

        // Trigger full page reload
        // Note: Vite's built-in .env watcher will restart the server,
        // which triggers loadEnvPlugin to reload fresh env values.
        // We just need to ensure the client reloads after that.
        server.hot.send({ type: 'full-reload', path: '*' })
      } catch (error) {
        console.error('[tanstack-start] Error reloading .env:', error)
      }
      debounceTimer = null
    }, 100)
  }

  return {
    name: 'tanstack-start-core:env-hot-reload',

    configResolved(config) {
      resolvedConfig = config
    },

    configureServer(server) {
      const mode = resolvedConfig.mode
      const envFiles = [
        '.env',
        '.env.local',
        `.env.${mode}`,
        `.env.${mode}.local`,
      ]

      // Watch .env files
      for (const file of envFiles) {
        server.watcher.add(path.join(resolvedConfig.root, file))
      }

      const handleEnvChange = (filePath: string) => {
        const fileName = path.basename(filePath)
        if (envFiles.includes(fileName)) {
          triggerReload(server)
        }
      }

      server.watcher.on('change', handleEnvChange)
      server.watcher.on('add', handleEnvChange)
      server.watcher.on('unlink', handleEnvChange)
    },
  }
}
