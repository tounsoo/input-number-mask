#!/bin/sh
# Copies pstack-claude into .claude/skills and .claude/agents, and its
# session-start routing text into .claude, at one pinned commit. Threads and
# cloud sessions use this checked-in copy and download nothing; only this
# script and the weekly pstack-update workflow reach upstream.
# Usage: sh .claude/update-pstack.sh [commit]   copy pstack at a full SHA, the pin by default
#        sh .claude/update-pstack.sh --check    compare the pin with upstream and write nothing
# --check exits 0 when no upstream commit since the pin touches the copied
# files, 10 when one does, and 11 when the pin is ahead of upstream's default
# branch, off it, or gone. 2 is a usage error; any other status is an error.
set -eu

repo=https://github.com/michael-denyer/pstack-claude
# The commit the checked-in copy came from. An update run rewrites this line.
pin=49b68501b075ec1eb2755dd0d22fbf2492d67e97
# CLAUDE.md and the session's GitHub tools already drive PRs, CI and
# conflicts; .claude/models.md is the model sheet setup-pstack would write.
skip='babysit fix-ci fix-merge-conflicts get-pr-comments setup-pstack'
# What gets copied, under plugins/pstack: every skill directory, *.md in each
# agent directory, and the hook text. The copy and --check both read these.
agent_dirs='agents effort-agents'
hook=hooks/session-start-context.md

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' HUP INT TERM

git -C "$tmp" init -q

check() {
  latest=$(git ls-remote "$repo" HEAD | awk '$2 == "HEAD" { print $1 }')
  [ -n "$latest" ] || { echo "could not read upstream's HEAD" >&2; exit 1; }
  # Without blobs the fetch has the history and trees but no file contents.
  git -C "$tmp" fetch -q --filter=blob:none "$repo" "$latest"
  upstream=$(git -C "$tmp" log -1 --format='%H %cs %s' "$latest")
  echo "pinned:   $pin"
  echo "upstream: $upstream"
  if [ "$latest" = "$pin" ]; then
    echo "up to date"
    exit 0
  fi
  if ! git -C "$tmp" fetch -q --filter=blob:none "$repo" "$pin" 2>"$tmp/err"; then
    case $(cat "$tmp/err") in
      *"not our ref"* | *"couldn't find remote ref"*)
        echo "diverged: upstream no longer has the pinned commit"
        exit 11 ;;
    esac
    cat "$tmp/err" >&2
    exit 1
  fi
  behind=$(git -C "$tmp" rev-list --count "$pin..$latest")
  ahead=$(git -C "$tmp" rev-list --count "$latest..$pin")
  if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
    echo "diverged: the pin is not on upstream's default branch"
    exit 11
  elif [ "$ahead" -gt 0 ]; then
    echo "diverged: the pin is ahead of upstream's default branch"
    exit 11
  fi
  set -- ":(glob)plugins/pstack/skills/*/**" "plugins/pstack/$hook"
  for dir in $agent_dirs; do
    set -- "$@" ":(glob)plugins/pstack/$dir/*.md"
  done
  for name in $skip; do
    set -- "$@" ":(exclude)plugins/pstack/skills/$name"
  done
  touched=$(git -C "$tmp" rev-list --count "$pin..$latest" -- "$@")
  echo "behind by $behind commits, $touched in the copied files"
  echo "latest: $latest"
  [ "$touched" -gt 0 ] || exit 0
  git -C "$tmp" log --format='  %H %cs %s' "$pin..$latest" -- "$@"
  exit 10
}

case ${1:-} in
  --check) check ;;
  -*) echo "usage: sh .claude/update-pstack.sh [commit | --check]" >&2; exit 2 ;;
esac

root=$(git rev-parse --show-toplevel)

git -C "$tmp" fetch -q --depth 1 "$repo" "${1:-$pin}"
git -C "$tmp" checkout -q FETCH_HEAD
src="$tmp/plugins/pstack"

# The manifest lists what the last run copied, so a skill or agent that
# upstream drops is removed too.
manifest="$root/.claude/pstack-files.txt"
touch "$manifest"
# A skill or agent this repository owns, such as the verify skill, is never
# in the manifest. Stop rather than overwrite it with an upstream one.
for dir in "$src"/skills/*/; do
  name=$(basename "$dir")
  case " $skip " in *" $name "*) continue ;; esac
  [ ! -e "$root/.claude/skills/$name" ] || grep -qx ".claude/skills/$name" "$manifest" ||
    { echo "upstream skill $name would replace the repository's own .claude/skills/$name" >&2; exit 1; }
done
for dir in $agent_dirs; do
  for file in "$src/$dir"/*.md; do
    name=$(basename "$file")
    [ ! -e "$root/.claude/agents/$name" ] || grep -qx ".claude/agents/$name" "$manifest" ||
      { echo "upstream agent $name would replace the repository's own .claude/agents/$name" >&2; exit 1; }
  done
done
while IFS= read -r path; do
  # Only remove entries this script writes, so a hand-edited line can't
  # reach outside .claude.
  case "$path" in
    *..* | */ | .claude/skills/ | .claude/agents/) continue ;;
    .claude/skills/*/* | .claude/agents/*/*) continue ;;
    .claude/skills/* | .claude/agents/*.md) rm -rf "${root:?}/$path" ;;
  esac
done < "$manifest"
: > "$manifest"

mkdir -p "$root/.claude/skills" "$root/.claude/agents"
for dir in "$src"/skills/*/; do
  name=$(basename "$dir")
  case " $skip " in *" $name "*) continue ;; esac
  cp -R "$dir" "$root/.claude/skills/$name"
  echo ".claude/skills/$name" >> "$manifest"
done
for dir in $agent_dirs; do
  for file in "$src/$dir"/*.md; do
    cp "$file" "$root/.claude/agents/"
    echo ".claude/agents/$(basename "$file")" >> "$manifest"
  done
done
# Fable never runs here, so no skill or agent default may name it, even when
# a line in .claude/models.md is missing.
for file in "$root"/.claude/skills/*/SKILL.md "$root"/.claude/agents/*.md; do
  sed -i.bak 's/`fable\([^`]*\)`/`opus\1`/g' "$file" && rm "$file.bak"
done
# Any other mention could be a default the rewrite missed, so list it to check.
grep -rnio '.\{0,30\}fable.\{0,30\}' "$root/.claude/skills" "$root/.claude/agents" |
  sed "s|^$root/|check for a Fable default: |" || true
# A local session's SessionStart hook in .claude/settings.json prints this.
cp "$src/$hook" "$root/.claude/pstack-session-start.md"
commit=$(git -C "$tmp" rev-parse HEAD)
self="$root/.claude/update-pstack.sh"
sed -i.bak "s/^pin=.*/pin=$commit/" "$self"
rm "$self.bak"
grep -qx "pin=$commit" "$self" || { echo "could not record pin=$commit in $self" >&2; exit 1; }
echo "pstack-claude $commit"
