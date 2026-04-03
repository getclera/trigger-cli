# @clera/trigger-cli

CLI for the [Trigger.dev Management REST API](https://trigger.dev/docs/management/overview). Covers all 43 endpoints across 9 resource categories.

## Setup

```bash
pnpm install
pnpm build
```

### Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `TRIGGER_SECRET_KEY` | Yes | — |
| `TRIGGER_API_URL` | No | `https://api.trigger.dev` |

Create a `.env` file or export directly:

```bash
export TRIGGER_SECRET_KEY=tr_dev_...
```

## Commands

### Environment Variables (`envvars`, `env`)

```bash
trigger-cli envvars list -p proj_xxx -e dev
trigger-cli envvars get API_KEY -p proj_xxx -e prod
trigger-cli envvars create -p proj_xxx -e dev -n MY_VAR -v my_value
trigger-cli envvars update MY_VAR -p proj_xxx -e dev -v new_value
trigger-cli envvars delete MY_VAR -p proj_xxx -e dev
trigger-cli envvars import -p proj_xxx -e dev --vars KEY1=val1 KEY2=val2 --override
```

### Runs

```bash
trigger-cli runs list --task my-task --status COMPLETED,FAILED --period 7d
trigger-cli runs get run_abc123
trigger-cli runs replay run_abc123
trigger-cli runs cancel run_abc123
trigger-cli runs reschedule run_abc123 -d '2h'
trigger-cli runs tag run_abc123 -t important urgent
trigger-cli runs events run_abc123
trigger-cli runs result run_abc123
trigger-cli runs trace run_abc123
trigger-cli runs update-metadata run_abc123 -m '{"key":"value"}'
```

### Schedules (`schedules`, `sched`)

```bash
trigger-cli schedules list
trigger-cli schedules get sched_xxx
trigger-cli schedules create -t my-task -c '0 * * * *' -k my-dedup-key --timezone America/New_York
trigger-cli schedules update sched_xxx -c '*/5 * * * *'
trigger-cli schedules delete sched_xxx
trigger-cli schedules activate sched_xxx
trigger-cli schedules deactivate sched_xxx
trigger-cli schedules timezones
```

### Tasks

```bash
trigger-cli tasks trigger my-task --payload '{"key":"value"}' --delay 1h --tags prod batch-1
trigger-cli tasks batch-trigger --items '[{"task":"my-task","payload":{"n":1}},{"task":"my-task","payload":{"n":2}}]'
```

### Deployments (`deployments`, `deploy`)

```bash
trigger-cli deployments latest
trigger-cli deployments get dep_xxx
trigger-cli deployments promote v1.2.3
```

### Queues

```bash
trigger-cli queues list
trigger-cli queues get my-queue --type custom
trigger-cli queues pause my-queue --type custom
trigger-cli queues resume my-queue --type custom
trigger-cli queues set-concurrency my-task --type task -l 10
trigger-cli queues reset-concurrency my-task --type task
```

### Batches

```bash
trigger-cli batches create -n 100
trigger-cli batches get batch_xxx
trigger-cli batches results batch_xxx
trigger-cli batches stream-items batch_xxx --items '{"index":0,"task":"my-task","payload":{}}'
```

### Waitpoints (`waitpoints`, `wp`)

```bash
trigger-cli waitpoints create --timeout 1h --tags order-123
trigger-cli waitpoints complete wp_xxx --data '{"approved":true}'
trigger-cli waitpoints list --status WAITING --period 7d
trigger-cli waitpoints get wp_xxx
```

### Query (`query`, `q`)

Execute TRQL (Trigger.dev Query Language) queries against your run and metrics data.

```bash
# Interactive query
trigger-cli query "SELECT run_id, status FROM runs LIMIT 10"

# With time range
trigger-cli query "SELECT count() FROM runs WHERE status = 'Failed'" --period 7d

# Cross-environment
trigger-cli query "SELECT environment, count() FROM runs GROUP BY environment" -s project

# CSV export
trigger-cli query "SELECT run_id, status, triggered_at FROM runs" -f csv --period 30d

# Full TRQL syntax reference
trigger-cli query --help-trql
```

See `trigger-cli query --help-trql` for the complete TRQL reference including all tables, columns, operators, functions, and example queries.

## Global Options

All commands support:
- `--json` — Raw JSON output (for piping/scripting)
- `--force` — Skip confirmation prompts on destructive operations
- `--help` — Command-specific help

## Development

```bash
# Run directly with tsx
pnpm dev -- runs list --period 1d

# Build
pnpm build

# Link globally
npm link
trigger-cli runs list
```
