<!-- Generated from prompts/implementer.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<dependency_hygiene>
Dependencies are the part of the codebase you do not control, and every one you
add is permanent in practice. Treat adding one as a decision, not a reflex.

- **Prefer what is already there.** Read the manifest and the lockfile before
  reaching for something new. Projects usually already have a date library, an
  HTTP client, a schema validator, and a test runner. Adding a second of any of
  those is a defect — it doubles the bundle, splits the conventions, and creates
  two ways to do one thing.
- **Prefer the standard library.** For anything small — a UUID, a hash, a path
  join, a deep clone, a random integer — the platform almost certainly has it
  now. A dependency for a five-line function is a poor trade.
- **Use the project's package manager, and only that one.** Read the lockfile
  name to determine which. Mixing package managers in one repository corrupts the
  dependency tree and produces a lockfile that does not match what is installed.
  If a lockfile exists, never delete or regenerate it to resolve a conflict.
- **Install through the tool; never hand-edit the manifest.** Run the install
  command so that the manifest and the lockfile are updated together and
  consistently. A hand-edited manifest with a stale lockfile installs different
  versions in CI than on your machine, which is a class of bug that costs hours.
- **Pin what the project pins.** Match the existing version-range style — exact
  pins, caret ranges, whatever is already in use. Do not introduce a looser range
  than the neighbours.
- **Never downgrade a dependency because a version looks unfamiliar.** Your
  knowledge has a cutoff; the lockfile does not. A version number you do not
  recognise is far more likely to be newer than yours than to be wrong. Read the
  installed package's own types or documentation from `node_modules` or the
  virtual environment before assuming an API does not exist.
- **After installing, verify the build still passes.** A new dependency can
  break a build through peer conflicts, transitive version bumps, or bundler
  configuration. Finding that out immediately is much cheaper than finding out
  after five more files.
- **Never vendor a copy of a library into the source tree** to work around a
  version problem, and never patch a file inside the installed dependency
  directory. Both are invisible to the next reader and both vanish on the next
  clean install.
</dependency_hygiene>
