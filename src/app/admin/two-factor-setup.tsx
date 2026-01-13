'use client'

/**
 * Two-Factor Authentication Setup Component (Issue #4)
 *
 * Allows admins to enable/disable 2FA with TOTP
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { useState } from 'react'

interface TwoFactorSetupProps {
  is2FAEnabled: boolean
  onStatusChange?: () => void
}

interface SetupData {
  qrCodeDataUrl: string
  secret: string
  backupCodes: string[]
}

export function TwoFactorSetup({
  is2FAEnabled,
  onStatusChange,
}: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(is2FAEnabled)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false)

  // Disable 2FA state
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [isDisabling, setIsDisabling] = useState(false)

  const handleEnableClick = async () => {
    setIsLoading(true)
    setError(null)
    setSetupData(null)

    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to initialize 2FA setup')
      }

      const data = (await response.json()) as SetupData
      setSetupData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to verify 2FA code')
      }

      setIsEnabled(true)
      setSetupData(null)
      setVerificationCode('')
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify 2FA')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDisabling(true)
    setError(null)

    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      setIsEnabled(false)
      setShowDisableForm(false)
      setDisablePassword('')
      setDisableCode('')
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
    } finally {
      setIsDisabling(false)
    }
  }

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
      setCopiedBackupCodes(true)
      setTimeout(() => setCopiedBackupCodes(false), 2000)
    }
  }

  const cancelSetup = () => {
    setSetupData(null)
    setVerificationCode('')
    setError(null)
  }

  // Already enabled - show disable option
  if (isEnabled && !showDisableForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Your account is protected with 2FA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">2FA is enabled</span>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDisableForm(true)}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Disable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show disable form
  if (isEnabled && showDisableForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Disable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Enter your password and current 2FA code to disable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Disabling 2FA will make your account less secure. Make sure you
              understand the risks.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleDisable2FA} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-code">2FA Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDisableForm(false)
                  setDisablePassword('')
                  setDisableCode('')
                  setError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDisabling}
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Setup in progress - show QR code and verification
  if (setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Setup Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border bg-white p-4">
              <img
                src={setupData.qrCodeDataUrl}
                alt="2FA QR Code"
                className="h-48 w-48"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code with Google Authenticator, Authy, or another
              TOTP app
            </p>
          </div>

          {/* Manual Entry Secret */}
          <div className="space-y-2">
            <Label>Manual Entry Secret</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={setupData.secret}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copySecret}>
                {copiedSecret ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If you cannot scan the QR code, enter this secret manually in your
              authenticator app
            </p>
          </div>

          {/* Backup Codes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Backup Codes</Label>
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                {copiedBackupCodes ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-4">
              {setupData.backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="font-mono text-sm text-center py-1"
                >
                  {code}
                </code>
              ))}
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Save these codes</AlertTitle>
              <AlertDescription>
                Store these backup codes in a safe place. Each code can only be
                used once if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifySetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit code from your app"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={cancelSetup}>
                Cancel
              </Button>
              <Button type="submit" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Initial state - show enable button
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              2FA is currently disabled
            </p>
            <p className="text-xs text-muted-foreground">
              Use an authenticator app like Google Authenticator or Authy
            </p>
          </div>
          <Button onClick={handleEnableClick} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Enable 2FA
              </>
            )}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
