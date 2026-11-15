import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useTeamOps, useTeams } from '@/api/queries'
import { cn, initials } from '@/lib/cn'
import { Icon } from '@/components/assay/Icon'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { EmptyState, ErrorState } from '@/components/assay/States'
import { StatusChip } from '@/components/assay/StatusChip'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/card'
import { ReviewersCard } from '../team-detail/TeamDetailPage'

const field = 'min-h-11 w-full rounded-ctl border border-line2 bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted'

/** P8 (not designed): team list with create, rename, delete; students; reviewers with the composition rules inline. */
export function TeamsPage() {
  useTitle('Teams')
  const q = useTeams()
  const [params, setParams] = useSearchParams()
  const creating = params.get('create') === '1'
  const setCreating = (v: boolean) => setParams(v ? { create: '1' } : {}, { replace: true })

  return (
    <Main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <PageTitle>Teams and people</PageTitle>
          <p className="m-0 text-ink2">Create teams, add students, and assign reviewers. Each team needs 1 to 5 reviewers, with at least 1 jury member and 1 advisor.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Create a team
          </Button>
        )}
      </div>
      {creating && <CreateTeam onDone={() => setCreating(false)} />}
      {q.isPending && (
        <div aria-busy="true" aria-label="Loading teams" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col gap-3 p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24" />
            </Card>
          ))}
        </div>
      )}
      {q.isError && (
        <ErrorState title="We couldn't load the teams." actions={<Button onClick={() => void q.refetch()}>Try again</Button>}>
          The server didn't respond. Your demo data is safe. Try again in a moment.
        </ErrorState>
      )}
      {q.isSuccess && q.data.teams.length === 0 && !creating && (
        <EmptyState
          title="No teams in this session yet"
          actions={
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" />
              Create a team
            </Button>
          }
        >
          Create the first team, add its students, and assign at least one advisor and one jury member.
        </EmptyState>
      )}
      {q.isSuccess && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] items-start gap-4">
          {q.data.teams.map((t) => (
            <TeamCard key={t.team.id} t={t} />
          ))}
        </div>
      )}
    </Main>
  )
}

type TeamRow = NonNullable<ReturnType<typeof useTeams>['data']>['teams'][number]

function TeamCard({ t }: { t: TeamRow }) {
  const ops = useTeamOps()
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  async function rename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      await ops.mutateAsync({ op: 'update', teamId: t.team.id, patch: { name: String(f.get('name')), projectTitle: String(f.get('title')) } })
      setRenaming(false)
      toast.success('Team saved.')
    } catch (x) {
      toast.error(x instanceof Error ? x.message : 'Could not save.')
    }
  }
  return (
    <Card as="article" aria-labelledby={`t-${t.team.id}`} className="flex flex-col">
      <div className="flex flex-col gap-2 border-b border-line p-5">
        {renaming ? (
          <form onSubmit={(e) => void rename(e)} className="flex flex-col gap-2" aria-label={`Rename Team ${t.team.name}`}>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Team name
              <input name="name" defaultValue={t.team.name} required className={field} autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Project title
              <input name="title" defaultValue={t.team.projectTitle} className={field} />
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 id={`t-${t.team.id}`} className="m-0 text-[20px] font-semibold leading-7">
                <Link to={`/teams/${t.team.id}`} className="text-ink no-underline hover:underline">
                  Team {t.team.name}
                </Link>
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setRenaming(true)} aria-label={`Rename Team ${t.team.name}`}>
                  <Icon name="pencil" size={14} />
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={`Delete Team ${t.team.name}`}
                  disabled={!t.canDelete}
                  title={t.canDelete ? undefined : 'This team has evaluations, so it can’t be deleted.'}
                >
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            </div>
            <p className="m-0 text-ink2">{t.team.projectTitle || <span className="text-muted">No project title yet</span>}</p>
            {!t.canDelete && <p className="m-0 text-[13px] text-muted">Has evaluations, so it can't be deleted.</p>}
          </>
        )}
        {confirmDelete && (
          <div role="alertdialog" aria-label={`Delete Team ${t.team.name}?`} className="flex flex-col gap-2.5 rounded-[12px] border-2 border-sel bg-pri-soft p-3.5">
            <p className="m-0 text-[14px]">
              <strong>Delete Team {t.team.name}?</strong> Its students are removed too. This can't be undone in this copy (Reset my demo restores it).
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                autoFocus
                onClick={() =>
                  void ops.mutateAsync({ op: 'delete', teamId: t.team.id }).then(
                    () => toast.success(`Team ${t.team.name} deleted.`),
                    (x: unknown) => toast.error(x instanceof Error ? x.message : 'Could not delete.'),
                  )
                }
              >
                Delete team
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-5 pt-4">
        <h3 className="m-0 text-[15px] font-semibold">
          Students <span className="mono font-medium text-muted">{t.students.length}</span>
        </h3>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 py-1.5">
          {t.students.map((s) => (
            <li key={s.id}>
              <StatusChip kind="plain" icon={null} className="gap-2">
                <span aria-hidden="true" className="text-[11px] font-semibold text-muted">
                  {initials(`${s.firstName} ${s.lastName}`)}
                </span>
                {s.firstName} {s.lastName}
              </StatusChip>
            </li>
          ))}
          {t.students.length === 0 && <li className="text-[14px] text-muted">No students yet.</li>}
        </ul>
        <Link to={`/teams/${t.team.id}`} className="inline-flex min-h-11 items-center self-start text-[14px] font-semibold">
          Manage students and grades
        </Link>
      </div>
      <div className={cn('[&>section]:rounded-none [&>section]:border-0 [&>section]:border-t [&>section]:border-line')}>
        <ReviewersCard v={{ team: t.team, reviewers: t.reviewers.map((r) => ({ ...r, canRemove: true })), composition: t.composition }} />
      </div>
    </Card>
  )
}

function CreateTeam({ onDone }: { onDone: () => void }) {
  const ops = useTeamOps()
  const [err, setErr] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      await ops.mutateAsync({ op: 'create', name: String(f.get('name')), projectTitle: String(f.get('title')) })
      toast.success('Team created. Now add students and assign reviewers.')
      onDone()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not create the team.')
    }
  }
  return (
    <Card as="section" aria-labelledby="new-h" className="flex max-w-[640px] flex-col gap-3 p-5">
      <h2 id="new-h" className="m-0 text-[18px] font-semibold">
        New team
      </h2>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Team name
          <input name="name" required className={field} placeholder="e.g. Eta" autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Project title
          <input name="title" className={field} placeholder="What the team is building" />
        </label>
        {err && (
          <p role="alert" className="m-0 text-[14px] text-amber">
            {err}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={ops.isPending}>
            Create team
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
