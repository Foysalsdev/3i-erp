// supabase/functions/delete-from-drive/index.ts
// Deletes a file from Google Drive by Drive file ID

const SA_EMAIL        = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
const SA_PRIVATE_KEY  = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')!

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

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const signingInput = `${enc(header)}.${enc(payload)}`

  const pemBody = SA_PRIVATE_KEY
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .replace(/\s/g, '')

  const keyData  = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${signingInput}.${sigB64}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  const data = await tokenRes.json()
  return data.access_token
}

Deno.serve(async (req: Request) => {
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
    const { drive_id } = await req.json() as { drive_id: string }

    if (!drive_id) {
      return new Response(JSON.stringify({ error: 'Missing drive_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = await getServiceAccountToken()

    const deleteRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${drive_id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    )

    if (!deleteRes.ok && deleteRes.status !== 404) {
      throw new Error(`Drive delete failed: ${deleteRes.status}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[delete-from-drive]', err)
    return new Response(
      JSON.stringify({ error: 'Delete failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
