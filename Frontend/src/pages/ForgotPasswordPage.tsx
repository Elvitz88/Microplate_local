import { useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { authService } from '../services/auth.service'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Forgot password</h1>
        <div className="space-y-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={async()=>{ setLoading(true); try { const res = await authService.requestPasswordReset({ email }); setMessage(res.message) } finally { setLoading(false) } }} disabled={!email || loading}>{loading?'Sending...':'Send reset link'}</Button>
        </div>
        {message && <div className="mt-4 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-2">{message}</div>}
      </Card>
    </div>
  )
}


