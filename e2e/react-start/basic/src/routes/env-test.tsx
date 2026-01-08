import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/env-test')({
  component: EnvTestPage,
})

function EnvTestPage() {
  return (
    <div className="p-2">
      <h3 data-testid="env-test-heading">Environment Variable Test</h3>
      <p data-testid="env-test-value">
        VITE_TEST_VAR: {import.meta.env.VITE_TEST_VAR || 'not set'}
      </p>
    </div>
  )
}
