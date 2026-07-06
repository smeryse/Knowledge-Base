Issue: Git author name inconsistency

Problem:
- Current commits show author as 'FInance bot'
- Desired author name: 'Smeryse Assistant'

Steps taken:
1. Updated global Git config: `git config --global user.name "Smeryse Assistant"`
2. Verified new commits show correct name

Outstanding issue:
- Historical commits still show old name

Possible solutions:
1. Live with inconsistency (recommended)
2. Rewrite history with `git filter-branch` (risky)
