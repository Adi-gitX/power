<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<incremental_verification>
Run the ladder after every meaningful change. A meaningful change is one that
could plausibly break something: a new module, a changed function signature, a
new dependency, a schema change, a wiring change. Not every keystroke, and not
once at the end.

**The ladder, in order, cheapest first:**

1. **Build / compile.** Does it produce artifacts? Catches syntax errors,
   unresolved imports, misconfigured paths.
2. **Typecheck.** Often folded into the build; run it explicitly if the project
   has a separate command. Catches the largest class of real defects for the
   least effort.
3. **Lint / format.** Catches unused variables — which are frequently a symptom
   of an incomplete edit — plus the project's own rules. If the project has a
   formatter, run it; a diff full of reformatting noise makes the real change
   invisible to the reviewer.
4. **Tests.** Run the affected suite while iterating; run the full suite before
   you report.
5. **Exercise the behaviour.** The rung nobody runs, and the one that finds the
   defects the others cannot. Call the endpoint. Run the command. Load the page.

**Use the project's own commands.** Read the manifest and use what is defined
there. Typical shapes:

```bash
# Node, from the manifest's scripts block
pnpm build && pnpm typecheck && pnpm lint && pnpm test

# Python
ruff check . && mypy src && pytest -q

# Go
go build ./... && go vet ./... && go test ./...

# Rust
cargo build && cargo clippy -- -D warnings && cargo test
```

If the project defines a single aggregate target, prefer it — it is what CI
runs, and matching CI is the entire point of running these locally.

**Reading failures properly.** Read the whole error, not the first line. Compiler
and test output is written for someone who reads it in full: the useful part is
usually the "caused by" chain, the expected-versus-actual diff, or the file and
line at the bottom of the stack. Skimming the first line and pattern-matching a
fix from it is how you end up fixing a symptom in the wrong file.

When errors cascade, fix the first one and re-run before you look at the rest.
In a typed language, one bad type at the top of a chain frequently generates
dozens of downstream errors that vanish when the first is corrected. Fixing them
individually means editing correct code.

**Long-running commands.** Anything that does not exit on its own — a dev
server, a watcher, a queue worker — runs in the background with its output going
to a log file you then read. Never run one in the foreground. If a build or test
command genuinely takes minutes, run it in the background and poll its log
rather than blocking.

**When a check was already green and is now red, look at what you just changed
first.** The overwhelmingly likely cause is your last edit, not a pre-existing
condition, not a flaky test, and not the toolchain.

**Pre-existing failures.** If the suite was already failing when you arrived,
record that in your first verification pass — capture the failure count before
you change anything. Otherwise you will spend the run trying to fix someone
else's broken test and reporting your own work as blocked. Say plainly in your
report: "N tests were failing before my changes; they still fail; here is which."
</incremental_verification>
