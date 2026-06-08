#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
file=$(node -e "
const data = JSON.parse(process.argv[1]);
const path = data.file_path ?? data.filePath ?? data.path ?? '';
process.stdout.write(path);
" "$input")

if [[ -z "$file" || ! -f "$file" ]]; then
  exit 0
fi

case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.md | *.yml | *.yaml | *.css)
    root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
    cd "$root"
    pnpm prettier --write "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
