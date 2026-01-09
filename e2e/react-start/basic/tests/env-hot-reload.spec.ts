import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { test } from '@tanstack/router-e2e-utils'
import { isDevMode } from './utils/isDevMode'

test.skip(!isDevMode, 'env hot reload tests only run in dev mode')

// Whitelist errors that can occur during server restarts
test.use({
  whitelistErrors: [
    /Failed to load resource: net::ERR_CONNECTION_REFUSED/,
    /Failed to fetch dynamically imported module/,
    /TypeError: Failed to fetch/,
  ],
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const envFilePath = path.join(projectRoot, '.env')

test.describe('env hot reload', () => {
  test.beforeEach(async () => {
    if (fs.existsSync(envFilePath)) {
      await fs.promises.unlink(envFilePath)
    }
  })

  test.afterEach(async () => {
    if (fs.existsSync(envFilePath)) {
      await fs.promises.unlink(envFilePath)
    }
  })

  test('should update env value when .env file changes', async ({ page }) => {
    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=initial-value\n')

    await page.waitForTimeout(500)

    await page.goto('/env-test')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: initial-value',
    )

    const reloadPromise = page.waitForEvent('load', { timeout: 10000 })

    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=updated-value\n')

    await reloadPromise

    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: updated-value',
    )
  })

  test('should handle .env file creation', async ({ page }) => {
    // Start without any .env file
    // Wait a bit for any previous cleanup to settle
    await page.waitForTimeout(1000)

    // Navigate to the env test page with retry in case server is restarting
    await page.goto('/env-test', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: not set',
    )

    const reloadPromise = page.waitForEvent('load', { timeout: 10000 })

    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=newly-created\n')

    await reloadPromise

    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: newly-created',
    )
  })

  test('should handle .env file deletion', async ({ page }) => {
    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=to-be-deleted\n')

    // Wait a moment for Vite to pick up the file
    await page.waitForTimeout(500)

    await page.goto('/env-test')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: to-be-deleted',
    )

    const reloadPromise = page.waitForEvent('load', { timeout: 10000 })

    await fs.promises.unlink(envFilePath)

    await reloadPromise

    await page.waitForLoadState('networkidle')

    // Note: The env var will still be in process.env after deletion
    // because Node.js doesn't support unsetting env vars that were set
    // This test verifies the hot reload mechanism works on file deletion
    // The actual env value behavior depends on Vite's loadEnv implementation
  })

  test('should debounce rapid .env changes', async ({ page }) => {
    // Create initial .env file
    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=start\n')

    await page.waitForTimeout(500)

    await page.goto('/env-test')
    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: start',
    )

    const reloadPromise = page.waitForEvent('load', { timeout: 10000 })

    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=change1\n')
    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=change2\n')
    await fs.promises.writeFile(envFilePath, 'VITE_TEST_VAR=final\n')

    await reloadPromise

    await page.waitForLoadState('networkidle')

    await expect(page.getByTestId('env-test-value')).toContainText(
      'VITE_TEST_VAR: final',
    )
  })
})
