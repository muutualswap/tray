import { Box, Flex, Grid, Spinner, Text } from '@chakra-ui/react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Scatter, ComposedChart } from 'recharts'
import { CategoricalChartProps } from 'recharts/types/chart/generateCategoricalChart'
import { colors } from '@/theme/cssVariables/colors'
import { formatCurrency } from '@/utils/numberish/formatter'

export interface Point {
  x: number
  y: number
  current?: number
}

export const CurveLineChart = ({
  data,
  current,
  margin,
  xKey = 'x',
  yKey = 'y',
  height,
  isLoading = false
}: {
  data: Point[]
  current?: number
  margin?: CategoricalChartProps['margin']
  xKey?: string
  yKey?: string
  height?: string
  isLoading?: boolean
}) => {
  return (
    <Box width="100%" height={height} overflow="hidden">
      {!isLoading ? (
        <Box background={colors.backgroundDark}>
          <ResponsiveContainer minWidth="330px" minHeight="175px">
            <ComposedChart data={data} margin={margin} style={{ padding: 0 }}>
              <CartesianGrid stroke={colors.lightPurple} opacity={0.1} />
              <YAxis yAxisId="left" dataKey={yKey} tickMargin={8} domain={['auto', 'auto']} stroke="#BFD2FF80" tick={false} />
              <ReferenceLine y={0} yAxisId="left" strokeWidth={2} stroke={colors.lightPurple} opacity={0.2} />
              <XAxis type="number" dataKey={xKey} domain={['dataMin', 'dataMax']} stroke="#BFD2FF80" tickMargin={8} tick={false} />
              <Scatter yAxisId="left" name="red" fill="red" data={data.filter((d) => !!d.current)} shape={<CustomLabel />} />
              <Line
                yAxisId="left"
                data={data}
                dataKey={yKey}
                dot={false}
                strokeWidth={2}
                stroke="#8C6EEF"
                strokeDasharray="5 5"
                activeDot={{
                  r: 6,
                  fill: '#22D1F8',
                  stroke: 'transparent',
                  strokeWidth: 0
                }}
                type="monotone"
                // label={<CustomLabel current={current} />}
              />
              <Tooltip
                content={(props) => <CustomTooltip {...props} current={current} total={data[data.length - 1].x} />}
                cursor={{
                  stroke: colors.textSecondary,
                  opacity: 0.5,
                  strokeDasharray: '4'
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Grid
          gridTemplateAreas={`"stack"`}
          minWidth="328px"
          minHeight="180px"
          sx={{
            '> *': {
              gridArea: 'stack'
            },
            '&:before, &:after': {
              gridArea: 'stack'
            }
          }}
          userSelect="none"
          pointerEvents="initial"
          height="100%"
        >
          <Grid gridTemplateColumns="minmax(0,1fr)" minHeight="100%" placeItems="center">
            <Spinner thickness="4px" speed="0.65s" color={colors.textSecondary} size="xl" />
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

const CustomTooltip = ({ active, payload, current, total }: { active?: boolean; payload?: any[]; current?: number; total?: number }) => {
  if (active && payload?.length) {
    const data = payload[0]?.payload
    if (!data) return null
    return (
      <Flex direction="column" px={3} py={2} background={colors.tooltipBg} fontSize="xs" color={colors.textSecondary}>
        {current === data.y ? <Text>Current</Text> : null}
        <Text>Price: {formatCurrency(data.y, { maximumDecimalTrailingZeroes: 4 })} SOL</Text>
        <Text>Tokens Remaining: {formatCurrency(total ? total - data.x : data.x, { decimalPlaces: 2, abbreviated: true })}</Text>
      </Flex>
    )
  }
  return null
}

const CustomLabel = ({ x, y }: any) => {
  return (
    <g>
      <circle cx={x + 3} cy={y + 5} r="6" fill="transparent" stroke="#22D1F8" strokeWidth="1" />
      <circle cx={x + 3} cy={y + 5} r="3" fill="#FFCC33" />
    </g>
  )
}
