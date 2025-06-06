import React, { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Flex, Grid, GridItem, HStack, Tag, Text, Skeleton, useDisclosure } from '@chakra-ui/react'
import Link from 'next/link'
import { PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'
import Button from '@/components/Button'
import TokenAvatar from '@/components/TokenAvatar'
import TokenAvatarPair from '@/components/TokenAvatarPair'
import AddressChip from '@/components/AddressChip'
import Tooltip from '@/components/Tooltip'
import { colors } from '@/theme/cssVariables'
import { PositionWithUpdateFn } from '@/hooks/portfolio/useAllPositionInfo'
import { FormattedPoolInfoConcentratedItem } from '@/hooks/pool/type'
import useSubscribeClmmInfo, { RpcPoolData } from '@/hooks/pool/clmm/useSubscribeClmmInfo'
import SwapHorizontalIcon from '@/icons/misc/SwapHorizontalIcon'
import ChevronDoubleDownIcon from '@/icons/misc/ChevronDoubleDownIcon'
import { panelCard } from '@/theme/cssBlocks'
import { useAppStore } from '@/store'
import ClmmPositionAccountItem from './ClmmPositionAccountItem'
import toPercentString from '@/utils/numberish/toPercentString'
import { formatCurrency, formatToRawLocaleStr } from '@/utils/numberish/formatter'
import { QuestionToolTip } from '@/components/QuestionToolTip'
import { ClmmLockInfo } from '@/hooks/portfolio/clmm/useClmmBalance'

const LIST_THRESHOLD = 10

export function ClmmPositionItemsCard({
  poolInfo,
  isLoading,
  initRpcPoolData,
  lockInfo,
  setNoRewardClmmPos,
  ...props
}: {
  poolId: string | PublicKey
  isLoading: boolean
  positions: PositionWithUpdateFn[]
  lockInfo?: ClmmLockInfo['']
  poolInfo?: FormattedPoolInfoConcentratedItem
  initRpcPoolData?: RpcPoolData
  setNoRewardClmmPos: (val: string, isDelete?: boolean) => void
}) {
  const { t } = useTranslation()
  const isMobile = useAppStore((s) => s.isMobile)
  const { isOpen: baseIn, onToggle } = useDisclosure({ defaultIsOpen: true })
  const { isOpen: isSubscribe, onOpen: onSubscribe } = useDisclosure()
  const data = useSubscribeClmmInfo({ poolInfo, subscribe: isSubscribe || false })
  const { positions: totalPositions } = props
  const [positions, setPositions] = useState<PositionWithUpdateFn[]>([])
  const [pageCurrent, setPageCurrent] = useState(2)
  const pageTotal = Math.ceil(totalPositions.length / LIST_THRESHOLD)

  const rpcData = initRpcPoolData || data

  useEffect(() => {
    const currentIndex = pageCurrent * LIST_THRESHOLD
    const positions = totalPositions.length > currentIndex ? totalPositions.slice(0, currentIndex) : totalPositions
    setPositions(positions)
  }, [totalPositions, pageCurrent])

  const loadMore = useCallback(() => setPageCurrent((s) => (s < pageTotal ? s + 1 : s)), [])
  if (poolInfo && rpcData.currentPrice) poolInfo.price = rpcData.currentPrice
  if (!poolInfo) return isLoading ? <Skeleton w="full" height="140px" rounded="lg" /> : null

  const hasLockedLiquidity = !!lockInfo
  const lockedPositions = hasLockedLiquidity ? positions.filter((p) => !!lockInfo[p.nftMint.toBase58()]) : []

  return (
    <Grid
      {...panelCard}
      gridTemplate={[
        `
        "face " auto
        "price " auto
        "items " auto
        "action" auto / 1fr
      `,
        `
        "face price action " auto
        "items items items  " auto / 3fr 3fr 1fr
      `
      ]}
      py={[4, 5]}
      px={[3, 8]}
      bg={colors.backgroundLight}
      gap={[2, 4]}
      borderRadius="xl"
      alignItems={'center'}
    >
      <GridItem area="face" justifySelf={['stretch', 'left']}>
        <Flex gap={2} justify="space-between" alignItems="center">
          <Tooltip
            label={
              <Box py={0.5}>
                <AddressChip address={poolInfo.id} renderLabel={`${t('common.pool_id')}:`} mb="2" textProps={{ fontSize: 'xs' }} />
                <AddressChip
                  address={poolInfo.mintA.address}
                  renderLabel={<TokenAvatar token={poolInfo.mintA} size="xs" />}
                  textProps={{ fontSize: 'xs' }}
                />
                <AddressChip
                  address={poolInfo.mintB.address}
                  renderLabel={<TokenAvatar token={poolInfo.mintB} size="xs" />}
                  textProps={{ fontSize: 'xs' }}
                />
              </Box>
            }
          >
            <HStack>
              <TokenAvatarPair size={['smi', 'md']} token1={poolInfo.mintA} token2={poolInfo.mintB} />
              <Text fontSize={['md', '20px']} fontWeight="500">
                {poolInfo.poolName.replace(' - ', '/')}
              </Text>
              <Tag size={['sm', 'md']} variant="rounded">
                {formatToRawLocaleStr(toPercentString(poolInfo.feeRate * 100))}
              </Tag>
            </HStack>
          </Tooltip>
          {isMobile && (
            <Link href={`/clmm/create-position?pool_id=${poolInfo.id}`}>
              <Button fontSize="xs" height="1.5rem" minHeight="1.5rem" minWidth="4rem" px={2} color={colors.buttonSolidText}>
                {t('button.create')}
              </Button>
            </Link>
          )}
        </Flex>
      </GridItem>

      <GridItem area="price" justifySelf={['stretch', 'left']}>
        <Flex gap={2} justify={['start', 'space-between']} alignItems="center">
          <Text color={colors.lightPurple} fontSize={isMobile ? 'xs' : 'md'}>
            {t('field.current_price')}:{' '}
            <Text as="span" color={colors.textPrimary}>
              {baseIn
                ? formatCurrency(poolInfo.price, {
                    decimalPlaces: poolInfo.recommendDecimal(poolInfo.price)
                  })
                : formatCurrency(new Decimal(1).div(poolInfo.price).toString(), {
                    decimalPlaces: poolInfo.recommendDecimal(new Decimal(1).div(poolInfo.price).toString())
                  })}
            </Text>{' '}
            {t('common.per_unit', {
              subA: poolInfo[baseIn ? 'mintB' : 'mintA'].symbol,
              subB: poolInfo[baseIn ? 'mintA' : 'mintB'].symbol
            })}
          </Text>
          {/* switch button */}
          {isMobile ? (
            <SwapHorizontalIcon onClick={onToggle} color={colors.secondary} />
          ) : (
            <Box alignSelf="center" ml={[0, 2]}>
              <Tooltip label={t('portfolio.section_positions_clmm_switch_direction_tooltip')}>
                <Box
                  onClick={onToggle}
                  px={['12px', '12px']}
                  py={['5px', '6px']}
                  color={colors.secondary}
                  border="1px solid currentColor"
                  rounded={['8px', '8px']}
                  cursor="pointer"
                  display={'flex'}
                  alignItems={'center'}
                >
                  <SwapHorizontalIcon height={18} width={18} />
                </Box>
              </Tooltip>
            </Box>
          )}
        </Flex>
      </GridItem>

      <GridItem area={'action'} justifySelf={['center', 'right']}>
        {isMobile ? null : (
          <Link href={`/clmm/create-position?pool_id=${poolInfo.id}`}>
            <Button size="sm" variant="outline">
              {t('clmm.create_new_position')}
            </Button>
          </Link>
        )}
      </GridItem>

      <GridItem area={'items'}>
        <Flex flexDir="column" mt={[1, 0]} gap={3}>
          {positions.map((position) =>
            hasLockedLiquidity && lockInfo[position.nftMint.toBase58()] ? null : (
              <ClmmPositionAccountItem
                key={position.nftMint.toBase58()}
                poolInfo={poolInfo!}
                position={position}
                baseIn={baseIn}
                initRpcPoolData={initRpcPoolData}
                setNoRewardClmmPos={setNoRewardClmmPos}
                onSubscribe={onSubscribe}
              />
            )
          )}
        </Flex>
        {hasLockedLiquidity && (
          <Flex flexDir="column" mt={[0, 3]} gap={3}>
            <HStack gap={1}>
              <Text fontSize={['sm', 'md']} fontWeight="medium" color={colors.lightPurple} pl={1}>
                {t('liquidity.locked_positions')}
              </Text>
              <QuestionToolTip
                label={
                  <Text as="span" fontSize="sm">
                    {t('liquidity.locked_positions_tip_info')}
                  </Text>
                }
                iconType="info"
                iconProps={{
                  width: 14,
                  height: 14,
                  fill: colors.lightPurple
                }}
              />
            </HStack>
            {lockedPositions.map((position) => (
              <ClmmPositionAccountItem
                key={position.nftMint.toBase58()}
                poolInfo={poolInfo!}
                position={position}
                baseIn={baseIn}
                initRpcPoolData={initRpcPoolData}
                setNoRewardClmmPos={setNoRewardClmmPos}
                lockData={lockInfo[position.nftMint.toBase58()]}
                onSubscribe={onSubscribe}
              />
            ))}
          </Flex>
        )}
        <Flex
          align="center"
          justifyContent="center"
          fontSize="sm"
          color={colors.textSeptenary}
          gap={1}
          mt="5"
          onClick={() => loadMore()}
          display={pageCurrent < pageTotal ? 'flex' : 'none'}
        >
          <Text cursor={'pointer'}>{t('portfolio.load_more')}</Text>
          <ChevronDoubleDownIcon cursor={'pointer'} width={16} height={16} color={colors.textSeptenary} />
        </Flex>
      </GridItem>
    </Grid>
  )
}
