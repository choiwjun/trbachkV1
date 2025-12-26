
import { corsHeaders } from './cors.ts'

export interface AppError {
  code: string;
  message: string; // User facing
  devMessage?: string; // Developer facing
}

export const createErrorResponse = (error: AppError, status = 400) => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        dev: error.devMessage
      }
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

export const createSuccessResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify({
      ok: true,
      data
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}
