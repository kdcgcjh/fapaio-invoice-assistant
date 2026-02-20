import { dialog, shell } from 'electron'

export const handleFile = {
  selectImage: async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '选择发票图片',
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'pdf'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  },

  openImage: async (path: string): Promise<void> => {
    await shell.openPath(path)
  }
}