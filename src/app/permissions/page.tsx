'use client'

import { useSearchParams } from 'next/navigation'
import { ReactNode, Suspense, useEffect, useState } from 'react'
import { LayoutWrapper } from '@/components/layout'
import { convertUvnaToVna, fetchPermission } from '@/lib/api'
import { Permission } from '@/types'

const formatDate = (dateString?: string) => {
  if (!dateString || dateString.startsWith('0001-01-01')) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatUvna = (value?: string) => {
  if (!value) return '—'
  return `${convertUvnaToVna(value)} VNA`
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null

  return (
    <div>
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <p className={`text-sm text-gray-900 dark:text-white break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
      {title ? <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h2> : null}
      {children}
    </div>
  )
}

function PermissionsContent() {
  const searchParams = useSearchParams()
  const permissionId = searchParams.get('permission') ?? searchParams.get('id') ?? ''
  const [permission, setPermission] = useState<Permission | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!permissionId) return

    const loadPermission = async () => {
      try {
        setIsLoading(true)
        const response = await fetchPermission(permissionId)
        setPermission(response.permission)
        setError(null)
      } catch (err) {
        setPermission(null)
        setError(err instanceof Error ? err.message : 'Failed to load permission')
      } finally {
        setIsLoading(false)
      }
    }

    loadPermission()
  }, [permissionId])

  const renderBody = () => {
    if (!permissionId) {
      return (
        <Card>
          <p className="text-gray-500 dark:text-gray-400">No permission ID was provided.</p>
        </Card>
      )
    }

    if (isLoading) {
      return (
        <Card>
          <p className="text-gray-500 dark:text-gray-400">Loading permission {permissionId}...</p>
        </Card>
      )
    }

    if (error) {
      return (
        <Card title="Error Loading Permission">
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </Card>
      )
    }

    if (!permission) return null

    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Permission {permission.id}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{permission.type}</p>
        </div>
        <div className="p-6 space-y-6">
          <Section title="Identity">
            <InfoRow label="ID" value={permission.id} mono />
            <InfoRow label="Schema ID" value={permission.schema_id} mono />
            <InfoRow label="DID" value={permission.did} mono />
            <InfoRow label="Grantee" value={permission.grantee} mono />
            <InfoRow label="Validator Permission ID" value={permission.validator_perm_id} mono />
            <InfoRow label="Country" value={permission.country} />
          </Section>

          <Section title="Lifecycle">
            <InfoRow label="Created" value={formatDate(permission.created)} />
            <InfoRow label="Created By" value={permission.created_by} mono />
            <InfoRow label="Modified" value={formatDate(permission.modified)} />
            <InfoRow label="Modified By" value={permission.modified_by} mono />
            <InfoRow label="Extended" value={formatDate(permission.extended)} />
            <InfoRow label="Extended By" value={permission.extended_by} mono />
            <InfoRow label="Effective From" value={formatDate(permission.effective_from)} />
            <InfoRow label="Effective Until" value={formatDate(permission.effective_until)} />
            <InfoRow label="Permission State" value={permission.perm_state} />
          </Section>

          <Section title="Economics">
            <InfoRow label="Deposit" value={formatUvna(permission.deposit)} />
            <InfoRow label="Validation Fees" value={formatUvna(permission.validation_fees)} />
            <InfoRow label="Issuance Fees" value={formatUvna(permission.issuance_fees)} />
            <InfoRow label="Verification Fees" value={formatUvna(permission.verification_fees)} />
            <InfoRow label="Issued Credentials" value={permission.issued} />
            <InfoRow label="Verified Credentials" value={permission.verified} />
          </Section>

          {permission.vp_state ? (
            <Section title="Validation Process">
              <InfoRow label="VP State" value={permission.vp_state} />
              <InfoRow label="VP Last State Change" value={formatDate(permission.vp_last_state_change)} />
              <InfoRow label="VP Expiration" value={formatDate(permission.vp_exp)} />
              <InfoRow label="VP Current Fees" value={formatUvna(permission.vp_current_fees)} />
              <InfoRow label="VP Current Deposit" value={formatUvna(permission.vp_current_deposit)} />
              <InfoRow label="VP Summary Digest" value={permission.vp_summary_digest_sri} mono />
            </Section>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <LayoutWrapper title="Permission" subtitle="Inspect a Verana permission by ID">
      <div className="p-6">{renderBody()}</div>
    </LayoutWrapper>
  )
}

export default function PermissionsPage() {
  return (
    <Suspense fallback={null}>
      <PermissionsContent />
    </Suspense>
  )
}
