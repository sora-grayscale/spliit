import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getGroup } from '@/lib/api'
import { GroupFormValues, groupFormSchema } from '@/lib/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, Trash2, Lock, AlertTriangle, Eye, EyeOff, Trash, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PasswordCrypto } from '@/lib/e2ee-crypto'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Textarea } from './ui/textarea'

export type Props = {
  group?: NonNullable<Awaited<ReturnType<typeof getGroup>>>
  onSubmit: (
    groupFormValues: GroupFormValues,
    participantId?: string,
  ) => Promise<void>
  onDelete?: (groupId: string) => Promise<void>
  protectedParticipantIds?: string[]
}

export function GroupForm({
  group,
  onSubmit,
  onDelete,
  protectedParticipantIds = [],
}: Props) {
  const t = useTranslations('GroupForm')
  const tValidation = useTranslations('Validation')
  const tDeletion = useTranslations('GroupDeletion')
  const tVerification = useTranslations('PasswordVerification')
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          information: group.information ?? '',
          currency: group.currency,
          isEncrypted: group.isEncrypted ?? false,
          password: '', // Never populate existing password
          passwordConfirm: '', // Never populate existing password
          participants: group.participants,
        }
      : {
          name: '',
          information: '',
          currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY_SYMBOL || '',
          isEncrypted: false,
          password: '',
          passwordConfirm: '',
          participants: [
            { name: 'John' },
            { name: 'Jane' },
            { name: 'Jack' },
          ],
        },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'participants',
    keyName: 'key',
  })

  // Watch isEncrypted field to show/hide password field
  const isEncrypted = useWatch({
    control: form.control,
    name: 'isEncrypted',
  })

  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState<boolean | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  useEffect(() => {
    if (activeUser === null) {
      const storedActiveUser = localStorage.getItem(`${group?.id}-activeUser`)
      let currentActiveUser: string
      
      if (storedActiveUser === 'None' || !storedActiveUser) {
        currentActiveUser = t('Settings.ActiveUserField.none')
      } else {
        // Try to find participant by ID first, then by name
        const participantById = fields.find((f) => f.id === storedActiveUser)
        if (participantById) {
          currentActiveUser = participantById.name
        } else {
          const participantByName = fields.find((f) => f.name === storedActiveUser)
          currentActiveUser = participantByName?.name || t('Settings.ActiveUserField.none')
        }
      }
      
      setActiveUser(currentActiveUser)
    }
  }, [t, activeUser, fields, group?.id])

  const verifyPassword = async () => {
    const password = form.getValues('password')
    if (!password || !group?.encryptionSalt || !group?.testEncryptedData || !group?.testIv) {
      setPasswordVerified(false)
      return
    }

    setIsVerifyingPassword(true)
    try {
      const isValid = await PasswordCrypto.verifyPassword(
        group.testEncryptedData,
        group.testIv,
        password,
        group.encryptionSalt
      )
      setPasswordVerified(isValid)
    } catch (error) {
      setPasswordVerified(false)
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  const updateActiveUser = () => {
    if (!activeUser) return
    
    // If activeUser is the "None" option, store 'None' as a special value
    if (activeUser === t('Settings.ActiveUserField.none')) {
      if (group?.id) {
        localStorage.setItem(`${group.id}-activeUser`, 'None')
      } else {
        localStorage.setItem('newGroup-activeUser', 'None')
      }
      return
    }
    
    if (group?.id) {
      const participant = group.participants.find((p) => p.name === activeUser)
      if (participant?.id) {
        localStorage.setItem(`${group.id}-activeUser`, participant.id)
      } else {
        localStorage.setItem(`${group.id}-activeUser`, activeUser)
      }
    } else {
      localStorage.setItem('newGroup-activeUser', activeUser)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          // Only pass participantId if activeUser is not the "None" option
          const participantId = activeUser && activeUser !== t('Settings.ActiveUserField.none') 
            ? group?.participants.find((p) => p.name === activeUser)?.id
            : undefined
          await onSubmit(values, participantId)
        })}
      >
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('NameField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('NameField.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('NameField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('CurrencyField.label')}</FormLabel>
                  <FormControl>
                    <Input
                      className="text-base"
                      placeholder={t('CurrencyField.placeholder')}
                      max={5}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('CurrencyField.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-2">
              <FormField
                control={form.control}
                name="information"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        className="text-base"
                        {...field}
                        placeholder="Optional group description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* E2EE Section */}
            <div className="col-span-2 border-t pt-4">
              <FormField
                control={form.control}
                name="isEncrypted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={group ? undefined : field.onChange}
                        disabled={!!group}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={`flex items-center gap-2 ${group ? 'opacity-60' : ''}`}>
                        <Lock className="w-4 h-4" />
                        Enable Password Protection
                        {group && <span className="text-xs text-muted-foreground ml-2">{tVerification('cannotChangeAfterCreation')}</span>}
                      </FormLabel>
                      <FormDescription className={group ? 'opacity-60' : ''}>
                        Encrypt expense data so only group members with the password can view details
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {isEncrypted && group?.isEncrypted && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Password Verification
                      </p>
                      <p className="text-sm text-blue-700">
                        Enter your group password to verify access to encrypted data.
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verify Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              className="text-base pr-20"
                              placeholder="Enter your group password"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                setPasswordVerified(null)
                              }}
                            />
                            <div className="absolute right-0 top-0 h-full flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="px-2 py-1 hover:bg-transparent"
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
                        </FormControl>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={verifyPassword}
                            disabled={isVerifyingPassword || !field.value}
                          >
                            {isVerifyingPassword ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              tVerification('verifyButton')
                            )}
                          </Button>
                          {passwordVerified === true && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="h-4 w-4" />
                              <span className="text-sm">{tVerification('passwordVerified')}</span>
                            </div>
                          )}
                          {passwordVerified === false && (
                            <div className="flex items-center gap-1 text-red-600">
                              <X className="h-4 w-4" />
                              <span className="text-sm">{tVerification('incorrectPassword')}</span>
                            </div>
                          )}
                        </div>
                        <FormDescription>
                          Required to access encrypted group data
                        </FormDescription>
                        <FormMessage>
                          {form.formState.errors.password?.message === 'passwordRequired' && tValidation('passwordRequired')}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {isEncrypted && !group?.isEncrypted && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Important Security Information
                      </p>
                      <p className="text-sm text-amber-700">
                        Choose a strong password. If lost, encrypted data cannot be recovered.
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              className="text-base pr-10"
                              placeholder="Enter a secure password (min 6 characters)"
                              {...field}
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
                        </FormControl>
                        <FormDescription>
                          Share this password securely with group members
                        </FormDescription>
                        <FormMessage>
                          {form.formState.errors.password?.message === 'passwordRequired' && tValidation('passwordRequired')}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPasswordConfirm ? 'text' : 'password'}
                              className="text-base pr-10"
                              placeholder="Confirm your password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            >
                              {showPasswordConfirm ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter the same password to confirm
                        </FormDescription>
                        <FormMessage>
                          {form.formState.errors.passwordConfirm?.message === 'passwordConfirmMismatch' && tValidation('passwordConfirmMismatch')}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('Participants.title')}</CardTitle>
            <CardDescription>{t('Participants.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {fields.map((item, index) => (
                <li key={item.key}>
                  <FormField
                    control={form.control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">
                          Participant #{index + 1}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              className="text-base"
                              {...field}
                              placeholder={t('Participants.new')}
                            />
                            {item.id &&
                            protectedParticipantIds.includes(item.id) ? (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Button
                                    variant="ghost"
                                    className="text-destructive-"
                                    type="button"
                                    size="icon"
                                    disabled
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive opacity-50" />
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  align="end"
                                  className="text-sm"
                                >
                                  {t('Participants.protectedParticipant')}
                                </HoverCardContent>
                              </HoverCard>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => remove(index)}
                                type="button"
                                size="icon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => {
                append({ name: '' })
              }}
              type="button"
            >
              {t('Participants.add')}
            </Button>
          </CardFooter>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('Settings.title')}</CardTitle>
            <CardDescription>{t('Settings.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {activeUser !== null && (
                <FormItem>
                  <FormLabel>{t('Settings.ActiveUserField.label')}</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        setActiveUser(value)
                      }}
                      defaultValue={activeUser}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            'Settings.ActiveUserField.placeholder',
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { name: t('Settings.ActiveUserField.none') },
                          ...form.watch('participants'),
                        ]
                          .filter((item) => item.name.length > 0)
                          .map(({ name }) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    {t('Settings.ActiveUserField.description')}
                  </FormDescription>
                </FormItem>
              )}
            </div>
          </CardContent>
        </Card>

        {group && onDelete && (
          <Card className="mb-4 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {tDeletion('dangerZoneTitle')}
              </CardTitle>
              <CardDescription>
                {tDeletion('dangerZoneDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash className="w-4 h-4 mr-2" />
                    {tDeletion('deleteButtonText')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tDeletion('confirmTitle')}</DialogTitle>
                    <DialogDescription>
                      {tDeletion('confirmDescription').replace('{groupName}', group.name)}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">{tDeletion('cancelButton')}</Button>
                    <Button
                      onClick={async () => {
                        setIsDeletingGroup(true)
                        try {
                          await onDelete(group.id)
                        } finally {
                          setIsDeletingGroup(false)
                        }
                      }}
                      variant="destructive"
                      disabled={isDeletingGroup}
                    >
                      {isDeletingGroup ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Deleting...
                        </div>
                      ) : (
                        tDeletion('confirmButton')
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        <div className="flex mt-4 gap-2">
          <SubmitButton
            loadingContent={t(group ? 'Settings.saving' : 'Settings.creating')}
            onClick={updateActiveUser}
            disabled={
              (group?.isEncrypted && passwordVerified === false) ||
              isDeletingGroup
            }
          >
            <Save className="w-4 h-4 mr-2" />{' '}
            {t(group ? 'Settings.save' : 'Settings.create')}
          </SubmitButton>
          {!group && (
            <Button variant="ghost" asChild>
              <Link href="/groups">{t('Settings.cancel')}</Link>
            </Button>
          )}
          {group && (
            <Button variant="ghost" asChild>
              <Link href={`/groups/${group.id}`}>{t('Settings.cancel')}</Link>
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
