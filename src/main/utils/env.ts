export const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
export const isProd = process.env.NODE_ENV === 'production'

export const getAppDataPath = (): string => {
  const { app } = require('electron')
  return app.getPath('userData')
}

export const getResourcesPath = (): string => {
  const { app } = require('electron')
  return isProd ? process.resourcesPath : join(process.cwd(), 'resources')
}