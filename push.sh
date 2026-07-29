#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# push.sh — sempre commita/pusha como madnessinvestor
# Uso: ./push.sh "mensagem de commit"
# ─────────────────────────────────────────────────────────────────────────────
NAME="madnessinvestor"
EMAIL="madness.investor@gmail.com"

# 1. Forçar identidade via variáveis de ambiente (maior prioridade que git config)
export GIT_AUTHOR_NAME="$NAME"
export GIT_AUTHOR_EMAIL="$EMAIL"
export GIT_COMMITTER_NAME="$NAME"
export GIT_COMMITTER_EMAIL="$EMAIL"

# 2. Garantir git config local e global
git config user.name  "$NAME"
git config user.email "$EMAIL"
git config --global user.name  "$NAME"
git config --global user.email "$EMAIL"

# 3. Adicionar e commitar (se houver alterações)
git add .
git commit -m "${1:-update}" 2>/dev/null || echo "ℹ Nada novo para commitar."

# 4. Reescrever o autor/committer de TODOS os commits ainda não enviados ao origin
ORIGIN_REF=$(git rev-parse --verify origin/main 2>/dev/null || git rev-parse --verify origin/master 2>/dev/null || echo "")

if [ -n "$ORIGIN_REF" ]; then
  AHEAD=$(git rev-list --count "$ORIGIN_REF"..HEAD 2>/dev/null || echo 0)
else
  AHEAD=$(git rev-list --count HEAD 2>/dev/null || echo 0)
fi

if [ "$AHEAD" -gt 0 ]; then
  echo "✏ Reescrevendo autor em $AHEAD commit(s) antes do push…"
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter "
    export GIT_AUTHOR_NAME='$NAME'
    export GIT_AUTHOR_EMAIL='$EMAIL'
    export GIT_COMMITTER_NAME='$NAME'
    export GIT_COMMITTER_EMAIL='$EMAIL'
  " "${ORIGIN_REF:+$ORIGIN_REF..}HEAD" 2>/dev/null
  echo "✅ Autor reescrito: $NAME <$EMAIL>"
fi

# 5. Push
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
git push origin "$BRANCH"
echo "✅ Push concluído como $NAME <$EMAIL>"
