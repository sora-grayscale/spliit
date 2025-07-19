'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'

interface PasswordUnlockDialogProps {
  isOpen: boolean
  onClose: () => void
  onUnlock: (password: string) => void
  groupName: string
  groupId: string
  encryptionSalt: string
  // Test encrypted data to verify password
  testEncryptedData?: string
  testIv?: string
}

export function PasswordUnlockDialog({
  isOpen,
  onClose,
  onUnlock,
  groupName,
  groupId,
  encryptionSalt,
  testEncryptedData,
  testIv,
}: PasswordUnlockDialogProps) {
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      setError('Please enter the group password')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      // If we have test data, verify the password
      if (testEncryptedData && testIv) {
        const isValid = await PasswordCrypto.verifyPassword(
          testEncryptedData,
          testIv,
          password,
          encryptionSalt,
          groupId,
        )

        if (!isValid) {
          setError('Incorrect password. Please try again.')
          setIsVerifying(false)
          return
        }
      }

      // Store password in session (async for enhanced security)
      await PasswordSession.setPassword(groupId, password)
      onUnlock(password)
      setPassword('')
      onClose()
    } catch (err) {
      // Enhanced error handling with security consideration
      if (process.env.NODE_ENV === 'development') {
        console.error('Password verification failed:', err)
      } else {
        console.error('Password verification failed - check server logs')
      }

      // Provide user-friendly error message
      if (err instanceof Error && err.message.includes('verification')) {
        setError(
          'Password verification failed. Please check your password and try again.',
        )
      } else if (err instanceof Error && err.message.includes('rate limit')) {
        setError('Too many attempts. Please wait a moment before trying again.')
      } else {
        setError('Failed to verify password. Please try again.')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password Required
          </DialogTitle>
          <DialogDescription>
            This group is password-protected. Enter the password to view expense
            details for &ldquo;{groupName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Group Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the group password"
                className="pr-10"
                disabled={isVerifying}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isVerifying || !password}>
              {isVerifying ? 'Verifying...' : 'Unlock'}
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded-lg">
          <p className="font-medium mb-1">Security Note:</p>
          <p>
            Your password is only used locally to decrypt data. It is never sent
            to the server.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
