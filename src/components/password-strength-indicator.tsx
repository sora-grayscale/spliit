'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  analyzePasswordStrength, 
  getPasswordStrengthLabel, 
  getPasswordStrengthColor,
  type PasswordStrength 
} from '@/lib/password-security'
import { SECURITY_CONSTANTS } from '@/lib/security-constants'
import { AlertCircle, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { generateSecurePassword } from '@/lib/password-security'

interface PasswordStrengthIndicatorProps {
  password: string
  showDetails?: boolean
  showGenerator?: boolean
  onPasswordGenerate?: (password: string) => void
}

export function PasswordStrengthIndicator({ 
  password, 
  showDetails = true, 
  showGenerator = false,
  onPasswordGenerate 
}: PasswordStrengthIndicatorProps) {
  const [showEntropy, setShowEntropy] = useState(false)
  
  const strength = useMemo(() => analyzePasswordStrength(password), [password])
  
  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(16)
    onPasswordGenerate?.(newPassword)
  }
  
  if (!password) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Password strength</span>
          <span>{SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH}-{SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH} characters</span>
        </div>
        <Progress value={0} className="h-2" />
        {showGenerator && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeneratePassword}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Secure Password
          </Button>
        )}
      </div>
    )
  }
  
  const progressValue = (strength.score / 4) * 100
  const strengthColor = getPasswordStrengthColor(strength.score)
  const strengthLabel = getPasswordStrengthLabel(strength.score)
  
  return (
    <div className="space-y-3">
      {/* Main strength indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Password strength:</span>
            <Badge 
              variant={strength.score >= 3 ? "default" : "destructive"}
              style={{ backgroundColor: strengthColor, borderColor: strengthColor }}
            >
              {strengthLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{strength.length}/{SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH}</span>
            {showDetails && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEntropy(!showEntropy)}
                className="h-auto p-1"
              >
                {showEntropy ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            )}
          </div>
        </div>
        
        <Progress 
          value={progressValue} 
          className="h-2"
          style={{
            '--progress-background': strengthColor,
          } as React.CSSProperties}
        />
      </div>
      
      {/* Detailed breakdown */}
      {showDetails && (
        <div className="space-y-2">
          {/* Character requirements */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center gap-1 ${strength.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${strength.hasLowercase ? 'bg-green-500' : 'bg-gray-300'}`} />
              Lowercase
            </div>
            <div className={`flex items-center gap-1 ${strength.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${strength.hasUppercase ? 'bg-green-500' : 'bg-gray-300'}`} />
              Uppercase
            </div>
            <div className={`flex items-center gap-1 ${strength.hasNumbers ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${strength.hasNumbers ? 'bg-green-500' : 'bg-gray-300'}`} />
              Numbers
            </div>
            <div className={`flex items-center gap-1 ${strength.hasSymbols ? 'text-green-600' : 'text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${strength.hasSymbols ? 'bg-green-500' : 'bg-gray-300'}`} />
              Symbols
            </div>
          </div>
          
          {/* Entropy display */}
          {showEntropy && (
            <div className="p-2 bg-muted rounded text-xs">
              <div className="flex items-center justify-between">
                <span>Entropy: {strength.entropy.toFixed(1)} bits</span>
                <span className={strength.entropy >= 50 ? 'text-green-600' : strength.entropy >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                  {strength.entropy >= 50 ? 'High' : strength.entropy >= 30 ? 'Medium' : 'Low'}
                </span>
              </div>
              <div className="text-muted-foreground mt-1">
                Higher entropy means more unpredictable passwords
              </div>
            </div>
          )}
          
          {/* Feedback */}
          {strength.feedback.length > 0 && (
            <div className="space-y-1">
              {strength.feedback.map((feedback, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-amber-600">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{feedback}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Security status */}
          {strength.isSecure && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <Shield className="w-3 h-3" />
              <span>This password meets security requirements</span>
            </div>
          )}
        </div>
      )}
      
      {/* Password generator */}
      {showGenerator && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeneratePassword}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Secure Password
        </Button>
      )}
    </div>
  )
}