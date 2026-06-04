import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const { showToast } = useAppStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password)
      if (result.error) {
        if (result.error.toLowerCase().includes('invalid')) {
          setError('password', { message: 'Invalid email or password' })
        } else {
          showToast(result.error, 'error')
        }
        return
      }
      showToast('Welcome back!', 'success')
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-sap-bg flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sap-shell flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sap-blue rounded-sap flex items-center justify-center">
            <span className="text-white font-bold text-lg">3i</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">3i Logistics</p>
            <p className="text-white/50 text-sm">ERP System v3.0</p>
          </div>
        </div>

        {/* Main Copy */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Smart Warehouse.<br />
            <span className="text-sap-blue">Zero Limits.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-md">
            Complete ERP + WMS for 3i Logistics — managing Whirlpool, Robi, and Godrej operations from a single platform.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2">
            {['Multi-Client', 'SAP-Compatible', 'Real-time Stock', 'PWA Ready', '100% Free Tier'].map(f => (
              <span key={f} className="px-3 py-1.5 bg-white/10 text-white/80 rounded-full text-sm border border-white/10">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-white/30 text-sm">
          © 2026 3i Logistics Pvt. Ltd. — Confidential
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-sap-blue rounded-sap flex items-center justify-center">
              <span className="text-white font-bold">3i</span>
            </div>
            <span className="text-sap-text font-bold text-lg">3i Logistics ERP</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-sap-lg shadow-sap-modal p-8">
            <div className="mb-8">
              <h2 className="text-sap-h1 font-bold text-sap-text">Sign in</h2>
              <p className="text-sap-textSecondary text-sap-md mt-1">
                Enter your credentials to access the system
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sap-sm font-medium text-sap-text">
                  Email Address <span className="text-sap-error">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@3ilogistics.com"
                  {...register('email')}
                  className={`
                    w-full rounded-sap-sm border px-3 py-2.5
                    text-sap-md text-sap-text bg-white
                    focus:outline-none focus:shadow-sap-focus transition-all
                    placeholder:text-sap-textDisabled
                    ${errors.email
                      ? 'border-sap-error focus:border-sap-error'
                      : 'border-sap-border focus:border-sap-blue'}
                  `}
                />
                {errors.email && (
                  <p className="text-sap-xs text-sap-error">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sap-sm font-medium text-sap-text">
                  Password <span className="text-sap-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`
                      w-full rounded-sap-sm border px-3 py-2.5 pr-10
                      text-sap-md text-sap-text bg-white
                      focus:outline-none focus:shadow-sap-focus transition-all
                      placeholder:text-sap-textDisabled
                      ${errors.password
                        ? 'border-sap-error focus:border-sap-error'
                        : 'border-sap-border focus:border-sap-blue'}
                    `}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sap-textSecondary hover:text-sap-text transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sap-xs text-sap-error">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="
                  w-full flex items-center justify-center gap-2
                  bg-sap-blue text-white
                  rounded-sap-sm px-4 py-3
                  text-sap-md font-medium
                  hover:bg-sap-blueDark transition-colors
                  focus:outline-none focus:shadow-sap-focus
                  disabled:opacity-60 disabled:cursor-not-allowed
                  mt-2
                "
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign in</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Setup Hint */}
          <p className="text-center text-sap-xs text-sap-textSecondary mt-6">
            First time? Create a Super Admin account in Supabase Auth, then assign the Super Admin role via SQL.
            See <code className="bg-sap-overlay px-1 rounded text-sap-text">SETUP.md</code> for instructions.
          </p>
        </div>
      </div>
    </div>
  )
}
