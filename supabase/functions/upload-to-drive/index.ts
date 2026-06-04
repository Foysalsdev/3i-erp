// supabase/functions/upload-to-drive/index.ts
// Handles all user file uploads → Google Drive Service Account
// Credentials stored in Supabase Edge Function Secrets ONLY

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SA_EMAIL             = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
const SA_PRIVATE_KEY       = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')!
const DRIVE_FOLDER_ID      = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!

// ─── Get Service Account OAuth token ──────────────────────
async function getServiceAccountToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header  = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss:   SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }

  // Encode JWT parts
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const signingInput = `${enc(header)}.${enc(payload)}`

  // Import RSA private key
  const pemBody = SA_PRIVATE_KEY
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${signingInput}.${sigB64}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as File
    const module    = formData.get('module') as string
    const recordNo  = formData.get('record_no') as string

    if (!file || !module) {
      return new Response(JSON.stringify({ error: 'Missing file or module' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // File size check: max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 20MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
    ]
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'File type not allowed.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = await getServiceAccountToken()

    // Upload to Google Drive (multipart)
    const fileName = recordNo
      ? `${recordNo}_${file.name}`
      : `${module}_${Date.now()}_${file.name}`

    const metadata = {
      name:    fileName,
      parents: [DRIVE_FOLDER_ID],
    }

    const driveBody = new FormData()
    driveBody.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )
    driveBody.append('file', file)

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name,size',
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    driveBody,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`Drive upload failed: ${err}`)
    }

    const { id, webViewLink, name: uploadedName } = await uploadRes.json()

    // Set file viewable by anyone with link
    await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })

    return new Response(
      JSON.stringify({
        success:   true,
        drive_id:  id,
        view_url:  webViewLink,
        file_name: uploadedName,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[upload-to-drive]', err)
    return new Response(
      JSON.stringify({ error: 'Upload failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
