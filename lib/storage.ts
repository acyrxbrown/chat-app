import { supabase } from './supabase'

export async function uploadFile(
  file: File,
  chatId: string,
  userId: string
): Promise<{ url: string; path: string } | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `chats/${chatId}/${fileName}`

    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    return null
  }
}

export async function deleteFile(filePath: string) {
  try {
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

export function getFileType(fileName: string): 'image' | 'file' {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext && imageExtensions.includes(ext) ? 'image' : 'file'
}
