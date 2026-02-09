import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { authService } from '../services/auth.service'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Reset password</h1>
        <div className="space-y-3">
          <Input placeholder="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={async()=>{ setLoading(true); try { const res = await authService.resetPassword({ token, password }); setMessage(res.message) } finally { setLoading(false) } }} disabled={!token || password.length < 8 || loading}>{loading?'Updating...':'Update password'}</Button>
        </div>
        {message && <div className="mt-4 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2">{message}</div>}
      </Card>
    </div>
  )
}


