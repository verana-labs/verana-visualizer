'use client'

import { Fragment } from 'react'
import {
  binaryLinks,
  binaryVersion,
  formatDecimal,
  formatProposalStatus,
  type GovernanceProposal,
  metadataLinks,
  parsePlanInfo,
  proposalColor,
  type Tally,
  type TallyState,
  tallyShares,
  upgradeExecution,
  type VotesState,
} from '@/domain/governance'
import type { NetworkModel } from '@/domain/network-model'
import { ExternalLink, Fact, Kicker, Mono, Section } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import { ENTITY_SPECS, GROUP_PROPOSAL_SPEC } from '@/features/inspector/spec-links'
import type { QueryInfo } from '@/lib/api/query-info'
import { useObservatory } from '@/store/observatory-store'
import { Chip } from '@/ui/chip'

interface ProposalDetailsProps {
  model: NetworkModel
  proposal: GovernanceProposal
  votes: VotesState
  query: QueryInfo | null
  blockHeight: number | null
  onRetryVotes?: () => void
}

const TALLY = [
  { key: 'yes', label: 'Yes', color: '#29C68C' },
  { key: 'no', label: 'No', color: '#ff8a8a' },
  { key: 'abstain', label: 'Abstain', color: '#94a3b8' },
  { key: 'veto', label: 'Veto', color: '#f97316' },
] as const satisfies readonly { key: keyof Tally; label: string; color: string }[]

const UNSCHEDULED = '0001-01-01T00:00:00Z'

export const formatTime = (iso: string | null) => (iso ? `${iso.slice(0, 16).replace('T', ' ')} UTC` : 'unknown')
const voteOption = (option: string) =>
  option
    .replace(/^VOTE_OPTION_/, '')
    .toLowerCase()
    .replace(/_/g, ' ')

function TallyView({ state }: { state: TallyState }) {
  if (state.status === 'none') return <p className="my-1.5 text-[12px] text-scene-mut">Tally available after voting</p>
  if (state.status === 'unavailable') return <p className="my-1.5 text-[12px] text-[#ff8a8a]">Tally unavailable</p>
  const { tally, live } = state
  const shares = tallyShares(tally)
  return (
    <div data-testid="tally">
      {live && <Kicker>live tally</Kicker>}
      {shares && (
        <div className="my-2 flex h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
          {TALLY.map(({ key, color }) =>
            shares[key] > 0 ? <span key={key} style={{ width: `${shares[key]}%`, background: color }} /> : null
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        {TALLY.map(({ key, label, color }) => (
          <span key={key} className="tabular-nums">
            <span style={{ color }}>●</span> {`${label} ${formatDecimal(tally[key])}`}
          </span>
        ))}
      </div>
    </div>
  )
}

function Upgrade({ proposal, blockHeight }: { proposal: GovernanceProposal; blockHeight: number | null }) {
  const plan = proposal.upgrade
  if (!plan) return null
  const version = binaryVersion(plan, proposal.title)
  const binaries = binaryLinks(parsePlanInfo(plan.info))
  const execution = upgradeExecution(proposal.status, plan.height, blockHeight)
  return (
    <Section title="Software upgrade">
      <Fact label="Plan">{plan.name || 'unnamed'}</Fact>
      <Fact label="Target height">{plan.height || 'none'}</Fact>
      {version && version !== plan.name && <Fact label="Binary version">{version}</Fact>}
      <Fact label="Scheduled time">
        {plan.time && plan.time !== UNSCHEDULED ? formatTime(plan.time) : 'height based'}
      </Fact>
      {plan.authority && <Fact label="Authority">{plan.authority}</Fact>}
      <p className="mt-1.5 text-[11.5px] text-scene-mut">{execution.message}</p>
      {binaries.map(({ platform, onChain, corrected }) => (
        <Fragment key={platform}>
          <ExternalLink variant="row" href={onChain}>
            <span className="truncate">{corrected ? `${platform} (on chain) ↗` : `${platform} ↗`}</span>
          </ExternalLink>
          {corrected && (
            <ExternalLink variant="row" href={corrected}>
              <span className="truncate">{`${platform} (corrected file name) ↗`}</span>
            </ExternalLink>
          )}
        </Fragment>
      ))}
    </Section>
  )
}

function Votes({ votes, onRetry }: { votes: VotesState; onRetry?: () => void }) {
  return (
    <Section title="votes">
      {(votes.status === 'idle' || votes.status === 'loading') && (
        <p className="text-[12px] text-scene-mut">Reading votes…</p>
      )}
      {votes.status === 'error' && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] text-[#ff8a8a]">{`Votes unavailable: ${votes.message}`}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 cursor-pointer rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {votes.status === 'ready' && (
        <>
          {votes.votes.length === 0 && <p className="text-[12px] text-scene-mut">No votes yet</p>}
          {votes.votes.map((vote) => (
            <div
              key={vote.id}
              className="flex items-center justify-between gap-3 border-b border-scene-line py-[6px] last:border-b-0"
            >
              <span className="truncate font-mono text-[10.5px] text-scene-mut">{vote.voter}</span>
              <b className="shrink-0 text-[12px] font-medium">{voteOption(vote.option)}</b>
            </div>
          ))}
          <ShowQuery query={votes.query} />
        </>
      )}
    </Section>
  )
}

export function ProposalDetails({ model, proposal, votes, query, blockHeight, onRetryVotes }: ProposalDetailsProps) {
  const corporation =
    proposal.corporationId === null ? undefined : model.entities.get(`corporation:${proposal.corporationId}`)
  const links = metadataLinks(proposal.metadata)
  const color = proposalColor(proposal)
  return (
    <>
      <Kicker spec={proposal.source === 'group' ? GROUP_PROPOSAL_SPEC : ENTITY_SPECS.proposal}>
        {proposal.source === 'group'
          ? `corporation proposal #${proposal.number}`
          : `chain proposal #${proposal.number}`}
      </Kicker>
      <h2
        className="mt-1 mb-0.5 line-clamp-3 break-words text-lg font-semibold tracking-[-.01em]"
        title={proposal.title}
      >
        {proposal.title}
      </h2>
      <div className="my-2 flex flex-wrap gap-1.5">
        <Chip style={{ background: `${color}22`, color }}>{formatProposalStatus(proposal.status)}</Chip>
        {proposal.executorResult && (
          <Chip className="bg-white/5 text-scene-mut">{`execution ${proposal.executorResult.toLowerCase()}`}</Chip>
        )}
      </div>
      {proposal.summary && <p className="mb-1.5 whitespace-pre-wrap break-words text-[12.5px]">{proposal.summary}</p>}
      <TallyView state={proposal.tally} />
      <div className="mt-1.5">
        {corporation && (
          <Fact label="Corporation">
            <button
              type="button"
              onClick={() => useObservatory.getState().select(corporation.id)}
              className="cursor-pointer hover:text-white"
            >
              {corporation.name}
            </button>
          </Fact>
        )}
        <Fact label="Submitted">{formatTime(proposal.submitTime)}</Fact>
        {proposal.votingStart && <Fact label="Voting starts">{formatTime(proposal.votingStart)}</Fact>}
        <Fact label="Voting ends">{formatTime(proposal.votingEnd)}</Fact>
      </div>
      {proposal.proposers.length > 0 && (
        <Section title={proposal.proposers.length === 1 ? 'proposer' : 'proposers'}>
          {proposal.proposers.map((address) => (
            <Mono key={address}>{address}</Mono>
          ))}
        </Section>
      )}
      {proposal.messageTypes.length > 0 && (
        <Section title="messages">
          {[...new Set(proposal.messageTypes)].map((type) => (
            <Mono key={type}>{type}</Mono>
          ))}
        </Section>
      )}
      <Upgrade proposal={proposal} blockHeight={blockHeight} />
      {proposal.metadata.raw && (
        <Section title="metadata">
          <pre
            data-testid="metadata"
            className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-scene-line bg-black/30 p-2 font-mono text-[10.5px]"
          >
            {proposal.metadata.raw}
          </pre>
          {links.map(({ key, url, host }) => (
            <ExternalLink key={key} variant="row" href={url}>
              <span className="truncate">{key}</span>
              <b className="shrink-0 font-mono text-[10.5px] font-medium text-scene-mut">{`${host} ↗`}</b>
            </ExternalLink>
          ))}
        </Section>
      )}
      {proposal.source === 'group' && <Votes votes={votes} onRetry={onRetryVotes} />}
      {query && <ShowQuery query={query} />}
    </>
  )
}
