import dynamic from 'next/dynamic'
const TokenDetail = dynamic(() => import('@/features/Launchpad/TokenDetail'), { ssr: false })

function CoinDetailPage() {
  return <TokenDetail />
}

export default CoinDetailPage
