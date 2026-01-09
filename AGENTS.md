# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Branching Workflow (MANDATORY)

**ALL work MUST be done on feature branches**, never directly on master. Each issue gets its own branch.

### Standard Workflow for Every Task

1. **Find and claim work**
   ```bash
   bd ready                                    # Find available tasks
   bd show <issue-id>                          # Review task details
   bd update <issue-id> --status=in_progress  # Claim the task
   ```

2. **Create and switch to feature branch**
   ```bash
   git checkout master                         # Start from master
   git pull                                    # Get latest changes
   git checkout -b <issue-id>                  # Create branch (e.g., tanks-13h)
   ```

3. **Do the work**
   - Implement the feature/fix
   - Write clean, modular code
   - Follow project structure conventions
   - Add/update tests for your changes

4. **Verify changes work**
   ```bash
   npm run build                               # Verify TypeScript compiles
   npm run lint                                # Check code quality
   npm test                                    # Run test suite
   npm run dev                                 # Manual verification
   ```
   **CRITICAL**: Do NOT proceed if any checks fail. Fix issues first.

5. **Commit to feature branch**
   ```bash
   git add <files>
   git commit -m "Descriptive message

   More details about changes.

   Closes <issue-id>

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

6. **Push feature branch to remote**
   ```bash
   git push -u origin <issue-id>              # Push branch to remote
   ```

7. **Merge to master**
   ```bash
   git checkout master                         # Switch to master
   git pull                                    # Get latest master
   git merge <issue-id>                        # Merge your branch
   git push                                    # Push to remote master
   ```

8. **Clean up and close**
   ```bash
   git branch -d <issue-id>                    # Delete local branch
   git push origin --delete <issue-id>         # Delete remote branch
   bd close <issue-id>                         # Close the issue
   bd sync                                     # Sync beads with git
   ```

9. **Verify completion**
   ```bash
   git status                                  # Should be "up to date with origin/master"
   ```

### Workflow Example

```bash
# 1. Find work
bd ready
bd update tanks-13h --status=in_progress

# 2. Create branch
git checkout master && git pull
git checkout -b tanks-13h

# 3. Do the work
# ... make changes ...

# 4. Verify
npm run build && npm run lint && npm test

# 5. Commit
git add src/
git commit -m "Set up project folder structure

- Created components/, engine/, utils/ directories
- Added README files for each directory
- Established module organization conventions

Closes tanks-13h

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 6. Push branch
git push -u origin tanks-13h

# 7. Merge to master
git checkout master
git pull
git merge tanks-13h
git push

# 8. Clean up
git branch -d tanks-13h
git push origin --delete tanks-13h
bd close tanks-13h
bd sync

# 9. Verify
git status  # Must show "up to date with origin/master"
```

## Code Quality Requirements

### Modularity
- **Design for parallel work**: Each module should be independently testable
- **Minimize cross-module dependencies**: Use clear interfaces between modules
- **One responsibility per file**: Keep files focused and small
- **Avoid tight coupling**: Changes in one module shouldn't break others

### Clean Code Standards
- **TypeScript strict mode**: No `any` types, proper type definitions
- **Consistent naming**: Use clear, descriptive names
- **DRY principle**: Don't repeat yourself - extract common logic
- **Comments**: Only when necessary - code should be self-documenting
- **Error handling**: Handle edge cases gracefully

### Testing Requirements

**CRITICAL**: Every feature MUST have tests. Tests are NOT optional.

```bash
npm test                    # Run all tests
npm test -- --watch        # Run tests in watch mode
npm test -- --coverage     # Check code coverage
```

**Testing Guidelines:**
- Write tests BEFORE or ALONGSIDE implementation
- Aim for high coverage (>80%) on critical code
- Test edge cases and error conditions
- Unit tests for pure functions and utilities
- Integration tests for component interactions
- Keep tests fast and independent

**Test Organization:**
```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── engine/
│   ├── physics.ts
│   └── physics.test.ts
└── utils/
    ├── math.ts
    └── math.test.ts
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps:

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** - Tests, linters, builds (ALL must pass)
3. **Complete branch workflow** - Push branch, merge to master, push master, clean up
4. **Close issues** - `bd close <id>` after pushing to master
5. **Sync beads** - `bd sync` to update tracking
6. **Verify** - `git status` shows "up to date with origin/master"
7. **Hand off** - Provide context for next session

## Critical Rules

⚠️ **NEVER work directly on master** - Always use feature branches
⚠️ **NEVER commit without tests** - Add/update tests for every change
⚠️ **NEVER skip verification** - Always run build/lint/test before committing
⚠️ **NEVER leave branches unpushed** - Push branch, merge to master, push master
⚠️ **NEVER close issues before pushing** - Code must be in remote master first
⚠️ **NEVER say "ready to push when you are"** - YOU must complete the push
⚠️ **NEVER break existing tests** - If tests fail, fix them before committing

