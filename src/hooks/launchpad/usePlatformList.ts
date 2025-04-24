import { useLaunchpadStore } from '@/store'
import useSWR from 'swr'
import axios from '@/api/axios'

interface Props {
  shouldFetch?: boolean
  refreshInterval?: number
}

export interface PlatformInfo {
  burnScale: string
  creatorScale: string
  feeRate: string
  img: string
  name: string
  platformClaimFeeWallet: string
  platformLockNftWallet: string
  platformScale: string
  pubKey: string
  web: string
}
const fetcher = (
  url: string
): Promise<{
  id: string
  success: boolean
  msg?: string
  data: {
    data: PlatformInfo[]
  }
}> => axios.get(url, { skipError: true })

export default function usePlatformList({ shouldFetch = true, refreshInterval = 2 * 60 * 1000 }: Props) {
  const mintHost = useLaunchpadStore((s) => s.mintHost)

  const { data, ...rest } = useSWR(shouldFetch ? `${mintHost}/main/platforms` : null, fetcher, {
    dedupingInterval: refreshInterval,
    focusThrottleInterval: refreshInterval,
    refreshInterval
  })

  return {
    data: data?.data.data || [],
    ...rest
  }
}
