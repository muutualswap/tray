import { SvgIcon } from '../type'

export default function ChevronRightCircleIcon(props: SvgIcon) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="chakra-icon" {...props} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="#22D1F8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16L16 12L12 8" stroke="#22D1F8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12H16" stroke="#22D1F8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
