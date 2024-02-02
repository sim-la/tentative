import tente from '../src/index.js'

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

describe('tente', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  const nFail = (n: number) => {
    let count = n

    return () => new Promise((resolve, reject) => {
        if (count > 0) {
          count--
          return reject(new Error(`Failure (${n - count}/${n})`))
        }
        return resolve(`Success (${n})`)
      })
  }

  const advanceTimersByTimeAsync: (milliseconds: Array<number>) => Promise<void> =
    async (milliseconds: Array<number>) => {
      const ms = milliseconds.at(0)

      return ms === undefined ?
        Promise.resolve() :
        jest.advanceTimersByTimeAsync(ms)
          .then(() => advanceTimersByTimeAsync(milliseconds.slice(1)))
    }

  describe('with default options', () => {
    test('succeeds on success', async () => {
      const tries = 0

      const retry = tente(nFail(tries))
      await expect(retry()).resolves.toBe(`Success (${tries})`)
    })

    test('fails on failure', async () => {
      const tries = 1

      const retry = tente(nFail(tries))
      await expect(retry()).rejects.toThrow(`Failure (1/${tries})`)
    })
  })

  describe('with `attempts` option', () => {
    describe('retries the function `max` times', () => {
      describe('when `max` is 0 (no retries)', () => {
        const max = 0

        test('on success', async () => {
          const retry = tente(nFail(max), { attempts: { max } })
          await expect(retry()).resolves.toBe(`Success (${max})`)
        })

        test('on failure', async () => {
          const tries = 1

          const retry = tente(nFail(tries), { attempts: { max } })
          await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
        })
      })

      describe('when `max` is greater than 0', () => {
        const max = 5

        test('on success after several retries', async () => {
          const tries = 3

          const retry = tente(nFail(tries), { attempts: { max } })
          jest.runAllTimersAsync()
          await expect(retry()).resolves.toBe(`Success (${tries})`)
        })

        test('on failure', async () => {
          const tries = 7

          const retry = tente(nFail(tries), { attempts: { max } })
          jest.runAllTimersAsync()
          await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
        })
      })
    })

    describe('retries the function with a fixed delay', () => {
      const max = 5

      describe('when `delay` is 0 (direct retry)', () => {
        const delay = 0

        test('on success', async () => {
          const tries = 0

          const retry = tente(nFail(tries), { attempts: { max, delay } })
          await expect(retry()).resolves.toBe(`Success (${tries})`)
        })

        test('on failure', async () => {
          const tries = 7

          const retry = tente(nFail(tries), { attempts: { max, delay } })
          advanceTimersByTimeAsync(Array(max).fill(1))
          await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
        })
      })

      describe('when `delay` is greater than 0', () => {
        const max = 5
        const delay = 14000

        test('on success after several retries', async () => {
          const tries = 3

          const retry = tente(nFail(tries), { attempts: { max, delay } })
          advanceTimersByTimeAsync(Array(tries).fill(delay))
          await expect(retry()).resolves.toBe(`Success (${tries})`)
        })

        test('on failure', async () => {
          const tries = 7

          const retry = tente(nFail(tries), { attempts: { max, delay } })
          advanceTimersByTimeAsync(Array(max).fill(delay))
          await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
        })
      })

      describe('when `delay` is invalid', () => {
        const max = 5
        const tries = 7

        const tests = {
          'lesser than 0': -14000,
          'NaN': NaN,
          'Infinity': Infinity
        }

        Object.entries(tests).forEach(([name, delay]) => {
          test(name, async () => {
            const retry = tente(nFail(tries), { attempts: { max, delay } })
            advanceTimersByTimeAsync(Array(max).fill(1))
            await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
          })
        })
      })
    })

    describe('retries the function with a function delay', () => {
      const attempts = [1000, 2000, 3000, 4000, 5000]
      const delay = jest.fn((_, i: number) => attempts[i])

      afterEach(() => { delay.mockClear() })

      test('on success', async () => {
        const tries = 3

        const retry = tente(nFail(tries), { attempts: { max: attempts.length, delay } })
        advanceTimersByTimeAsync(attempts)
        await expect(retry()).resolves.toBe(`Success (${tries})`)
        expect(delay).toHaveBeenCalledTimes(tries)
        for (let i = 0; i < tries; i++) {
          expect(delay).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i)
        }
      })

      test('on failure', async () => {
        const tries = 7

        const retry = tente(nFail(tries), { attempts: { max: attempts.length, delay } })
        advanceTimersByTimeAsync(attempts)
        await expect(retry()).rejects.toThrow(`Failure (${attempts.length + 1}/${tries})`)
        expect(delay).toHaveBeenCalledTimes(attempts.length)
        for (let i = 0; i < attempts.length; i++) {
          expect(delay).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i)
        }
      })

      describe('returning invalid delay', () => {
        const max = 5
        const tries = 7

        const tests = {
          'lesser than 0': -14000,
          'NaN': NaN,
          'Infinity': Infinity
        }

        Object.entries(tests).forEach(([name, delay]) => {
          test(name, async () => {
            const retry = tente(nFail(tries), { attempts: { max, delay: () => delay } })
            advanceTimersByTimeAsync(Array(max).fill(1))
            await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
          })
        })
      })
    })
  })

  describe('with `canRetry` option', () => {
    const max = 5

    test('allows retries', async () => {
      const tries = 3

      const canRetry = jest.fn(() => true)
      const retry = tente(nFail(tries), { attempts: { max }, canRetry })
      jest.runAllTimersAsync()
      await expect(retry()).resolves.toBe(`Success (${tries})`)
      expect(canRetry).toHaveBeenCalledTimes(tries)
      for (let i = 0; i < tries; i++) {
        expect(canRetry).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i)
      }
    })

    test('prevents retries', async () => {
      const tries = 3
      const maxAttempts = 2

      const canRetry = jest.fn((_, attemptIndex: number) => attemptIndex < maxAttempts)
      const retry = tente(nFail(tries), { attempts: { max }, canRetry })
      jest.runAllTimersAsync()
      await expect(retry()).rejects.toThrow(`Failure (${maxAttempts + 1}/${tries})`)
      expect(canRetry).toHaveBeenCalledTimes(maxAttempts + 1)
      for (let i = 0; i <= maxAttempts; i++) {
        expect(canRetry).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i)
      }
    })
  })

  describe('with `onRetry` option', () => {
    const max = 5

    describe('calls on retry', () => {
      test('on success', async () => {
        const tries = 3

        const onRetry = jest.fn()
        const retry = tente(nFail(tries), { attempts: { max }, onRetry })
        jest.runAllTimersAsync()
        await expect(retry()).resolves.toBe(`Success (${tries})`)
        expect(onRetry).toHaveBeenCalledTimes(tries)
        for (let i = 0; i < tries; i++) {
          expect(onRetry).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i, 0)
        }
      })

      test('on failure', async () => {
        const tries = 7

        const onRetry = jest.fn()
        const retry = tente(nFail(tries), { attempts: { max }, onRetry })
        jest.runAllTimersAsync()
        await expect(retry()).rejects.toThrow(`Failure (${max + 1}/${tries})`)
        expect(onRetry).toHaveBeenCalledTimes(max)
        for (let i = 0; i < max; i++) {
          expect(onRetry).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i, 0)
        }
      })

      test('with custom attempt delays', async () => {
        const attempts = [1000, 2000, 3000, 4000, 5000]
        const delay = (_: unknown, i: number) => attempts[i]
        const tries = 7

        const onRetry = jest.fn()
        const retry = tente(nFail(tries), { attempts: { max: attempts.length, delay }, onRetry })
        jest.runAllTimersAsync()
        await expect(retry()).rejects.toThrow(`Failure (${attempts.length + 1}/${tries})`)
        expect(onRetry).toHaveBeenCalledTimes(attempts.length)
        for (let i = 0; i < attempts.length; i++) {
          expect(onRetry).toHaveBeenNthCalledWith(i + 1, new Error(`Failure (${i + 1}/${tries})`), i, attempts[i])
        }
      })
    })
  })
})
