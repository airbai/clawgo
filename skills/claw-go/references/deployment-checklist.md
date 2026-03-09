# Deployment Checklist

## 1. Pre-Deploy

- Confirm `SKILL.md` frontmatter has valid `name` and `description`
- Confirm `agents/openai.yaml` reflects current display name and prompt
- Configure backend endpoints and secrets
- Enable timezone-aware scheduler
- Run local script sanity checks
- Install skill into OpenClaw skills directory:
  - `bash skills/claw-go/scripts/install_skill_local.sh ~/.openclaw/skills`

## 2. Required Environment Variables

- `CLAWGO_API_BASE`
- `CLAWGO_API_KEY`
- `CLAWGO_DEFAULT_TZ`
- `CLAWGO_FREE_DAILY_LIMIT`
- `CLAWGO_PRO_DAILY_LIMIT`

Use template in [assets/config-template.env](../assets/config-template.env).

## 3. Smoke Tests

1. Free user gets 1 proactive update/day
2. Pro user gets up to 3 proactive updates/day
3. Free user requesting premium feature receives fallback response
4. `/clawgo status` returns current stats
5. `/clawgo send` respects quota and returns deterministic payload shape
6. Entitlement API outage triggers free fallback without crash
7. `openclaw --dev skills list --json` shows `claw-go`

## 4. Launch Gates

- Error rate under 1% for command handler
- Scheduler duplicate send rate under 0.1%
- Premium gate false-positive deny under 0.5%
- Telemetry events present for send/upgrade/fallback

## 5. Post-Deploy

- Monitor D1/D7 retention by tier
- Monitor conversion from quota-hit moments
- Tune destination weights weekly from user interactions
