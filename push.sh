#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# push.sh — sempre commita/pusha como madnessinvestor
# Uso: ./push.sh "mensagem de commit"
# ─────────────────────────────────────────────────────────────────────────────
NAME="madnessinvestor"
EMAIL="madness.investor@gmail.com"

# 1. Forçar identidade via env vars (maior prioridade que git config)
export GIT_AUTHOR_NAME="$NAME"
export GIT_AUTHOR_EMAIL="$EMAIL"
export GIT_COMMITTER_NAME="$NAME"
export GIT_COMMITTER_EMAIL="$EMAIL"

# 2. Garantir git config local também
git config user.name  "$NAME"
git config user.email "$EMAIL"

# 3. Adicionar e commitar (se houver alterações)
git add .
git commit -m "${1:-update}" 2>/dev/null || echo "ℹ Nada novo para commitar."

# 4. Reescrever o autor de TODOS os commits ainda não enviados ao origin
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
if [ "$AHEAD" -gt 0 ]; then
  echo "✏ Reescrevendo autor em $AHEAD commit(s) antes do push…"
  git rebase origin/main \
    --exec "git commit --amend --no-edit --reset-author" \
    --no-stat -q
fi

# 5. Push
git push origin main
echo "✅ Push concluído como $NAME <$EMAIL>"
