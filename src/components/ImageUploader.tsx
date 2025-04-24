import { ChangeEvent, DragEvent, useState, useCallback, useRef, useEffect } from 'react'
import { Button, Flex, Text, Image } from '@chakra-ui/react'
import { colors } from '@/theme/cssVariables'
import UploadIcon from '@/icons/misc/UploadIcon'

const ImageUploader = ({
  onImageUpload,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif'],
  maxFileSizeInMB = 5,
  maxFiles = 1,
  isDisabled
}: {
  onImageUpload: (file: File) => void
  acceptedFileTypes?: string[]
  maxFileSizeInMB?: number
  maxFiles?: number
  isDisabled?: boolean
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!acceptedFileTypes.includes(file.type)) {
        console.log(`Please upload a valid file type: ${acceptedFileTypes.join(', ')}`)
        return false
      }

      const fileSizeInMB = file.size / (1024 * 1024)
      if (fileSizeInMB > maxFileSizeInMB) {
        console.log(`File size should be less than ${maxFileSizeInMB}MB`)
        return false
      }

      return true
    },
    [acceptedFileTypes, maxFileSizeInMB]
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      if (files.length > maxFiles) {
        console.log(`You can upload a maximum of ${maxFiles} file(s)`)
        return
      }

      const file = files[0]

      if (validateFile(file)) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        onImageUpload(file)
      }
    },
    [maxFiles, onImageUpload, validateFile]
  )

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDragging) {
        setIsDragging(true)
      }
    },
    [isDragging]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      handleFiles(files)
    },
    [handleFiles]
  )

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      handleFiles(files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles]
  )

  const handleSelectClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <Flex
      direction="column"
      py={4}
      bg={colors.backgroundDark}
      borderRadius="12px"
      alignItems="center"
      justifyContent="center"
      transition="all 0.2s"
      cursor="pointer"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleSelectClick}
    >
      <Flex alignItems="center" gap={2} mb={3}>
        {previewUrl ? (
          <Image src={previewUrl} alt="Preview" maxH="200px" maxW="200px" objectFit="contain" borderRadius="8px" />
        ) : (
          <>
            <UploadIcon />
            <Text fontSize="xl" fontWeight="medium" color={colors.lightPurple} opacity={0.5}>
              Drag and drop an image or GIF
            </Text>
          </>
        )}
      </Flex>
      <Button
        variant="outline"
        width="11.25rem"
        isDisabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation()
          handleSelectClick()
        }}
      >
        {previewUrl ? 'Select another file' : 'Select a file'}
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        accept={acceptedFileTypes.join(',')}
        multiple={maxFiles > 1}
      />
    </Flex>
  )
}

export default ImageUploader
