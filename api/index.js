const internalPathParameter = '__api_path'
let requestHandlerPromise

class InvalidApiPathError extends Error {}

function sendJson(response, statusCode, payload) {
  if (response.headersSent) {
    response.end()
    return
  }

  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

function decodeApiPath(rawPath) {
  if (!rawPath) return '/api'

  const segments = rawPath.split('/').filter(Boolean)
  const safeSegments = segments.map((segment) => {
    let decodedSegment

    try {
      decodedSegment = decodeURIComponent(segment)
    } catch {
      throw new InvalidApiPathError('Path API tidak memiliki encoding URL yang valid.')
    }

    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      !/^[A-Za-z0-9._~-]+$/.test(decodedSegment)
    ) {
      throw new InvalidApiPathError('Path API tidak valid.')
    }

    return encodeURIComponent(decodedSegment)
  })

  return safeSegments.length > 0 ? `/api/${safeSegments.join('/')}` : '/api'
}

function buildApiRequestUrl(request) {
  const incomingUrl = new URL(request.url || '/api', 'http://vercel.local')
  const directApiPath = incomingUrl.pathname.startsWith('/api/')
    ? incomingUrl.pathname.slice('/api/'.length)
    : ''
  const rewrittenApiPath = incomingUrl.searchParams.get(internalPathParameter) || ''
  const apiPath = decodeApiPath(rewrittenApiPath || directApiPath)

  incomingUrl.searchParams.delete(internalPathParameter)
  return `${apiPath}${incomingUrl.search}`
}

export default async function handler(request, response) {
  try {
    request.url = buildApiRequestUrl(request)
    requestHandlerPromise ||= import('../server/index.mjs')
      .then(({ handleRequest }) => handleRequest)
      .catch((error) => {
        requestHandlerPromise = undefined
        throw error
      })
    const handleRequest = await requestHandlerPromise
    return await handleRequest(request, response)
  } catch (error) {
    if (error instanceof InvalidApiPathError) {
      return sendJson(response, 400, { ok: false, message: error.message })
    }

    console.error('Vercel API handler failed:', error)
    return sendJson(response, 500, {
      ok: false,
      message: 'Layanan API sedang mengalami gangguan. Silakan coba lagi.',
    })
  }
}
