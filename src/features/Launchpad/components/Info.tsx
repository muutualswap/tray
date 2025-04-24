import { useCallback, useEffect, useState } from 'react'
import { Box, Divider, Flex, Grid, Text, Link, Tooltip, useColorMode, useClipboard, Image } from '@chakra-ui/react'
import StarIcon from '@/icons/misc/StarIcon'
import TelegrameIcon from '@/icons/misc/TelegrameIcon'
import TwitterIcon from '@/icons/misc/TwitterIcon'
import WebIcon from '@/icons/misc/WebIcon'
import { colors } from '@/theme/cssVariables/colors'
import NextLink from 'next/link'
import ThreeStageProgress from './ThreeStageProgress'
import { MintInfo } from '../type'
import Decimal from 'decimal.js'
import { formatCurrency } from '@/utils/numberish/formatter'
import { useDialogsStore } from '@/store'
import { DialogTypes } from '@/constants/dialogs'
import { getMintWatchList, setMintWatchList } from '../utils'
import { useEvent } from '@/hooks/useEvent'
import { HelpCircle } from 'react-feather'
import CircleCheck from '@/icons/misc/CircleCheck'
import CopyLaunchpadIcon from '@/icons/misc/CopyLaunchpadIcon'
import { encodeStr } from '@/utils/common'
import { addPoolListener, removePoolListener } from '@/components/TradingView/streaming'
import { Curve, LaunchpadPoolInfo } from '@raydium-io/raydium-sdk-v2'
import dayjs from 'dayjs'
import { CurveLineChart, Point } from './Charts/CurveLineChart'
import { wSolToSolString } from '@/utils/token'
import QuestionCircleIcon from '@/icons/misc/QuestionCircleIcon'
import TokenAvatar from '@/components/TokenAvatar'
import { getDurationUText } from '@/utils/time'
import { getImgProxyUrl } from '@/utils/url'

export default function Info({
  poolInfo,
  mintInfo,
  marketCap,
  refreshMintInfo
}: {
  poolInfo?: LaunchpadPoolInfo
  mintInfo?: MintInfo
  marketCap?: {
    currentMarketCap: Decimal
    marketCapRange: Decimal[]
  }
  refreshMintInfo?: () => void
}) {
  const openDialog = useDialogsStore((s) => s.openDialog)
  const [finishRate, setFinishRate] = useState(mintInfo?.finishingRate ?? 0)
  const [watchList, setWatchList] = useState(getMintWatchList())
  const { colorMode } = useColorMode()
  const isLight = colorMode === 'light'
  const { onCopy: copy, hasCopied } = useClipboard(mintInfo ? mintInfo.mint : '')
  const [points, setPoints] = useState<Point[]>([])

  const onUpdateWatchList = useEvent((mint: string, isAdd: boolean) => {
    const newWatchSet = new Set(Array.from(watchList))
    if (isAdd) {
      newWatchSet.add(mint)
    } else newWatchSet.delete(mint)

    setWatchList(newWatchSet)
    setMintWatchList(Array.from(newWatchSet.values()))
  })

  const hasMintInfo = !!mintInfo
  useEffect(() => {
    if (!hasMintInfo) return
    setFinishRate((rate) => rate || mintInfo.finishingRate)
  }, [hasMintInfo])

  const generatePoints = useCallback(({ poolInfo, mintInfo }: { poolInfo: LaunchpadPoolInfo; mintInfo: MintInfo }) => {
    try {
      const price = Curve.getPrice({
        poolInfo,
        curveType: mintInfo.configInfo.curveType,
        decimalA: Number(mintInfo.decimals),
        decimalB: mintInfo.mintB.decimals
      })
      const points: Point[] = Curve.getPoolCurvePointByPoolInfo({
        curveType: mintInfo.configInfo.curveType,
        pointCount: 40,
        poolInfo
      }).map((p) => ({
        x: p.totalSellSupply,
        y: p.price.toDecimalPlaces(12).toNumber()
      }))

      const priceNum = price.toDecimalPlaces(12).toNumber()
      const idx = points.findIndex((p) => price.toDecimalPlaces(12).lte(p.y))
      if (idx !== -1 && points[idx - 1]?.y !== priceNum && points[idx]?.y !== priceNum)
        points.splice(idx, 0, {
          x: points[idx].x,
          y: priceNum,
          current: priceNum
        })
      else if (idx !== -1 && points[idx]?.y === priceNum) points[idx].current = priceNum

      setPoints(points)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    if (!mintInfo?.poolId) return
    const cbk = async (poolInfo: LaunchpadPoolInfo) => {
      const poolPrice = Curve.getPrice({
        poolInfo,
        curveType: mintInfo.configInfo.curveType,
        decimalA: poolInfo.mintDecimalsA,
        decimalB: poolInfo.mintDecimalsB
      }).toNumber()
      const endPrice = Curve.getPoolEndPriceReal({
        poolInfo,
        curveType: mintInfo.configInfo.curveType,
        decimalA: poolInfo.mintDecimalsA,
        decimalB: poolInfo.mintDecimalsB
      }).toNumber()
      const initPrice = Number(
        mintInfo.initPrice ||
          Curve.getPoolInitPriceByPool({
            poolInfo,
            decimalA: poolInfo.mintDecimalsA,
            decimalB: poolInfo.mintDecimalsB,
            curveType: mintInfo.configInfo.curveType
          }).toNumber()
      )
      const _n = poolPrice - initPrice
      const _d = endPrice - initPrice
      const finishingRate = Math.min(_d === 0 ? 0 : _n / _d, 1)
      setFinishRate(new Decimal(finishingRate * 100).toDecimalPlaces(2).toNumber())
      generatePoints({ poolInfo, mintInfo })
    }
    addPoolListener(mintInfo.poolId, cbk)
    return () => removePoolListener(mintInfo.poolId, cbk)
  }, [mintInfo?.poolId])

  useEffect(() => {
    if (!poolInfo || !mintInfo) return
    generatePoints({ poolInfo, mintInfo })
  }, [poolInfo, mintInfo])

  const needRefresh = (finishRate > 66.6 && !mintInfo?.priceStageTime2) || (finishRate >= 100 && !mintInfo?.priceFinalTime)
  useEffect(() => {
    if (!needRefresh) return
    const timeId = window.setTimeout(() => {
      refreshMintInfo?.()
    }, 1500)
    return () => clearTimeout(timeId)
  }, [needRefresh, refreshMintInfo])

  if (!mintInfo) return null

  const vestingDuration = getDurationUText(Number(mintInfo.unlockPeriod))
  const cliffPeriod = getDurationUText(Number(mintInfo.cliffPeriod))

  return (
    <Box pb={['86px', '20px']}>
      <Box
        background={isLight ? '#F5F8FF' : '#ABC4FF14'}
        px={4}
        py={5}
        borderRadius="4px"
        sx={
          isLight
            ? {
                border: '1px solid #BFD2FF80'
              }
            : {}
        }
      >
        <Grid templateColumns="auto 1fr auto" gap={4} alignItems="center">
          <Image
            src={mintInfo ? getImgProxyUrl(mintInfo.imgUrl, 50) : undefined}
            fallbackSrc={mintInfo?.imgUrl}
            borderRadius="50%"
            width="50px"
            height="50px"
          />
          <Flex direction="column">
            <Flex alignItems="center" gap={1}>
              <Text color={colors.lightPurple} fontWeight="medium" noOfLines={1}>
                {mintInfo.symbol}
              </Text>
            </Flex>
            <Text color={colors.lightPurple} opacity={0.6} fontWeight="medium" noOfLines={1}>
              ({mintInfo.name})
            </Text>
          </Flex>
          <Flex color={colors.textLaunchpadLink} height="100%">
            {mintInfo.twitter ? (
              <Link as={NextLink} href={mintInfo.twitter} isExternal onClick={(e) => e.stopPropagation()}>
                <TwitterIcon color={colors.textLaunchpadLink} />
              </Link>
            ) : null}
            {mintInfo.website ? (
              <Box
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  openDialog(DialogTypes.ThirdPartyWarning({ url: mintInfo.website! }))
                }}
              >
                <WebIcon color={colors.textLaunchpadLink} />
              </Box>
            ) : null}
            {mintInfo.telegram ? (
              <Link as={NextLink} href={mintInfo.telegram} isExternal onClick={(e) => e.stopPropagation()}>
                <TelegrameIcon color={colors.textLaunchpadLink} />
              </Link>
            ) : null}
            <Box
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation()
                onUpdateWatchList(mintInfo.mint, !watchList.has(mintInfo.mint))
              }}
            >
              <StarIcon selected={watchList.has(mintInfo.mint)} />
            </Box>
          </Flex>
        </Grid>
        <Text color={colors.textSecondary} fontSize="sm" mt={3}>
          {mintInfo.description}
        </Text>
        <Divider my={4} borderColor="#ABC4FF1F" />
        <CurveLineChart
          data={points}
          current={
            poolInfo
              ? Curve.getPrice({
                  poolInfo,
                  curveType: mintInfo.configInfo.curveType,
                  decimalA: Number(mintInfo.decimals),
                  decimalB: mintInfo.mintB.decimals
                })
                  .toDecimalPlaces(12)
                  .toNumber()
              : undefined
          }
          margin={{ left: -40, right: 20, bottom: -10, top: 20 }}
        />
        <Flex justifyContent="space-between" mt="2">
          <Text color={colors.textSecondary} fontSize="sm">
            Migration Level:
          </Text>
          <Text color={colors.textSecondary} fontSize="sm">
            {new Decimal(poolInfo?.totalFundRaisingB.toString() ?? 0).div(10 ** mintInfo.mintB.decimals).toString()}{' '}
            {wSolToSolString(mintInfo.mintB.symbol)}
          </Text>
        </Flex>

        <Flex direction="column" gap={3}>
          <Text color={colors.textSecondary} fontSize="sm">
            Bonding curve progress: {finishRate}%
          </Text>
          <Box>
            <ThreeStageProgress percent={finishRate} />
            <Box position="relative" mt={2}>
              <Flex justify="space-between" fontSize="2xs" mb={2}>
                {/* first */}
                <Flex justifyContent="flex-end" width="33%" pr={2}>
                  {finishRate >= 33.3 ? (
                    <Text maxWidth="5rem" textAlign="right" color={colors.textSecondary}>
                      This token is heating up! 🔥
                    </Text>
                  ) : (
                    <Box>
                      <Text color={colors.textSecondary} textAlign="right">
                        Heating Up at
                      </Text>
                      <Flex justifyContent="flex-end" alignItems="center" gap={1}>
                        <Text>{marketCap ? formatCurrency(marketCap?.marketCapRange[1], { symbol: '$', decimalPlaces: 2 }) : '--'}</Text>
                        <Tooltip
                          hasArrow
                          placement="top"
                          label={`When market cap is above ${
                            marketCap ? formatCurrency(marketCap?.marketCapRange[1], { symbol: '$', decimalPlaces: 2 }) : '--'
                          }, this token will be highlighted when appearing on the main feed.`}
                        >
                          <HelpCircle size={10} color={colors.lightPurple} />
                        </Tooltip>
                      </Flex>
                    </Box>
                  )}
                </Flex>
                {/* middle */}
                <Flex justifyContent="flex-end" width="33%" pr={2}>
                  {finishRate >= 66.6 && mintInfo.priceStageTime2 ? (
                    <Box>
                      <Text maxWidth="5rem" textAlign="right" color={colors.textSecondary}>
                        Caught fire at
                      </Text>
                      <Text>{dayjs(mintInfo.priceStageTime2 * 1000).format('MM/DD HH:mm')}</Text>
                    </Box>
                  ) : (
                    <Box>
                      <Text color={colors.textSecondary} textAlign="right">
                        On Fire! at
                      </Text>
                      <Flex justifyContent="flex-end" alignItems="center" gap={1}>
                        <Text>{marketCap ? formatCurrency(marketCap?.marketCapRange[2], { symbol: '$', decimalPlaces: 2 }) : '--'}</Text>
                        <Tooltip
                          hasArrow
                          placement="top"
                          label={`When market cap reaches ${
                            marketCap ? formatCurrency(marketCap?.marketCapRange[2], { symbol: '$', decimalPlaces: 2 }) : '--'
                          }, this token will be pinned to the top of the main feed until extinguished by another token.`}
                        >
                          <HelpCircle size={10} color={colors.lightPurple} />
                        </Tooltip>
                      </Flex>
                    </Box>
                  )}
                </Flex>

                {/* final */}
                <Flex justifyContent="flex-end" width="33%" pr={2}>
                  {finishRate >= 100 && mintInfo.priceFinalTime ? (
                    <Box>
                      <Text color={colors.textSecondary}>Graduated at</Text>
                      <Flex justifyContent="flex-end" alignItems="center" gap={1}>
                        <Text>{dayjs(mintInfo.priceFinalTime * 1000).format('MM/DD HH:mm')}</Text>
                      </Flex>
                    </Box>
                  ) : (
                    <Box>
                      <Text color={colors.textSecondary}>Graduates at</Text>
                      <Flex justifyContent="flex-end" alignItems="center" gap={1}>
                        <Text>{marketCap ? formatCurrency(marketCap?.marketCapRange[3], { symbol: '$', decimalPlaces: 2 }) : '--'}</Text>
                        <Tooltip
                          hasArrow
                          placement="top"
                          label={`When market cap reaches ${
                            marketCap ? formatCurrency(marketCap?.marketCapRange[3], { symbol: '$', decimalPlaces: 2 }) : '--'
                          }, bonding curve liquidity will migrate to an AMM pool where LP tokens will be burned and trading will continue.`}
                        >
                          <HelpCircle size={10} color={colors.lightPurple} />
                        </Tooltip>
                      </Flex>
                    </Box>
                  )}
                </Flex>
              </Flex>
              {[33.33, 66.66].map((threshold, index) => (
                <Box
                  key={`divider-${index}`}
                  position="absolute"
                  top={0}
                  left={`${threshold}%`}
                  height="2.25rem"
                  transform="translateX(-50%)"
                  borderLeft={`0.5px dashed ${colors.lightPurple} `}
                  _after={{
                    content: '""',
                    position: 'absolute',
                    bottom: '0',
                    left: '-1.25px',
                    width: '2px',
                    height: '2px',
                    borderRadius: '50%',
                    backgroundColor: colors.lightPurple
                  }}
                />
              ))}
              <Box
                position="absolute"
                top={0}
                right="0"
                height="2.25rem"
                borderLeft={`0.5px dashed ${colors.lightPurple} `}
                _after={{
                  content: '""',
                  position: 'absolute',
                  bottom: '0',
                  left: '-1.25px',
                  width: '2px',
                  height: '2px',
                  borderRadius: '50%',
                  backgroundColor: colors.lightPurple
                }}
              />
            </Box>
          </Box>
        </Flex>
        <Divider my={4} borderColor="#ABC4FF1F" />
        <Flex direction="column" color={colors.textSecondary} fontSize="sm" gap={1}>
          <Flex alignItems="center" gap={1}>
            Contract address:
            <Text color={colors.textLaunchpadLink} decoration="underline">
              {encodeStr(mintInfo.mint, 5, 3)}
            </Text>
            <Flex alignItems="center">
              <Box
                alignSelf="flex-end"
                cursor={hasCopied ? 'default' : 'pointer'}
                onClick={(e) => {
                  e.stopPropagation()
                  copy()
                }}
              >
                {hasCopied ? <CircleCheck color={colors.textLaunchpadLink} /> : <CopyLaunchpadIcon color={colors.textLaunchpadLink} />}
              </Box>
            </Flex>
          </Flex>
          <Flex alignItems="center" justifyContent="space-between" gap={1}>
            Curve Type:
            <Text>
              {mintInfo.configInfo.curveType === 0
                ? 'Constant Product Curve'
                : mintInfo.configInfo.curveType === 1
                ? 'Fixed Product Curve'
                : mintInfo.configInfo.curveType === 2
                ? 'Linear Product Curve'
                : 'Constant Product Curve'}
            </Text>
          </Flex>
          <Flex alignItems="center" justifyContent="space-between" gap={1}>
            Fee:
            <Flex alignItems="center" gap="1">
              {(Number(mintInfo.configInfo.tradeFeeRate) + Number(mintInfo.platformInfo.feeRate)) / 10000}%
              <Tooltip
                hasArrow
                placement="top"
                label={`Program(${Number(mintInfo.configInfo.tradeFeeRate) / 10000}%) + Platform(${
                  Number(mintInfo.platformInfo.feeRate) / 10000
                }%) `}
              >
                <QuestionCircleIcon color={colors.lightPurple} />
              </Tooltip>
            </Flex>
          </Flex>
          <Flex alignItems="center" justifyContent="space-between" gap={1}>
            Platform:
            <Flex alignItems="center" gap="1">
              <Image width="16px" src={mintInfo.platformInfo.img} /> {mintInfo.platformInfo.name}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <Box
        background={isLight ? '#F5F8FF' : '#ABC4FF14'}
        px={4}
        py={5}
        borderRadius="4px"
        sx={
          isLight
            ? {
                border: '1px solid #BFD2FF80'
              }
            : {}
        }
      >
        <Flex alignItems="center" justifyContent="space-between" color={colors.textSecondary} gap={1}>
          Quote Token:
          <Flex alignItems="center" gap="1">
            <TokenAvatar size="sm" token={mintInfo.mintB} />
            {wSolToSolString(mintInfo.mintB.symbol)}
            <Text color={colors.textTertiary} fontSize="xs">
              ({encodeStr(mintInfo.mintB.address, 4, 3)})
            </Text>
          </Flex>
        </Flex>
        <Flex alignItems="center" justifyContent="space-between" color={colors.textSecondary} gap={1}>
          Vesting Duration:
          <Flex alignItems="center" gap="1">
            {vestingDuration.text || '--'}
          </Flex>
        </Flex>
        <Flex alignItems="center" justifyContent="space-between" color={colors.textSecondary} gap={1}>
          Cliff:
          <Flex alignItems="center" gap="1">
            {cliffPeriod.text || '--'}
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
