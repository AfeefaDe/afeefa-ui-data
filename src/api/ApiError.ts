import IResponse from '../resource/IResponse'

export default class ApiError extends Error {
  public response: any

  constructor (response) {
    super()

    this.name = 'ApiError'
    this.message = getErrorDescription(response)

    this.response = response
  }
}

function getErrorDescription (response: IResponse): string {
  let description = ''
  if (response.body && response.body.errors) {
    for (const error of response.body.errors) {
      description += (error.detail || error) + '\n'
    }
  } else if (response.body && response.body.exception) {
    description = response.body.exception
  } else if (response.body && response.body.error) {
    description = response.body.error
  } else {
    description = response.statusText || response + ''
  }
  return description
}
