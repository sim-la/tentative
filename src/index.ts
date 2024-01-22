interface Options {
  attempts?: {
    max: number
    delayInMs?: number
  } | Array<number>
  canRetry?: (error: Error, attemptIndex: number) => boolean
  onRetry?: (attemptIndex: number, attemptDelays: Array<number>) => void
}

interface Settings {
  attemptDelays: Array<number>
  canRetry?: (error: Error, attemptIndex: number) => boolean
  onRetry?: (attemptIndex: number, attemptDelays: Array<number>) => void
}

type Retryable<Arguments, Output> = (...args: Array<Arguments>) => Promise<Output>

const DEFAULT_DELAY_IN_MS = 1000

export default function withRetries<Arguments, Output>(
  fn: Retryable<Arguments, Output>,
  options: Options = {}
): Retryable<Arguments, Output> {
  const { attemptDelays, canRetry, onRetry } = getSettings(options)
  let attemptIndex = 0

  const retry: Retryable<Arguments, Output> = (...args: Array<Arguments>) =>
    fn(...args)
      .catch(async (error) => {
        const delay = attemptDelays.at(attemptIndex)
        if (delay === undefined || canRetry?.(error, attemptIndex) === false) {
          throw error
        }

        if (onRetry !== undefined) {
          onRetry(attemptIndex, attemptDelays)
        }

        await sleep(delay)

        attemptIndex++

        return retry(...args)
      })

  return retry
}

function getSettings(options: Options): Settings {
  let attemptDelays: Array<number>
  if (Array.isArray(options.attempts)) {
    attemptDelays = options.attempts.map((delay) => Math.max(delay, 0))
  } else {
    const attempts = {
      max: options.attempts?.max ?? 0,
      delayInMs: options.attempts?.delayInMs ?? DEFAULT_DELAY_IN_MS
    }
    attemptDelays = Array.from({ length: attempts.max }, () => attempts.delayInMs)
  }

  const canRetry = options.canRetry

  const onRetry = options.onRetry

  return { attemptDelays, canRetry, onRetry }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
