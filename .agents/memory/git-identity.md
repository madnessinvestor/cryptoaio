---
name: Git Identity
description: Todos os commits/push neste repo DEVEM usar madnessinvestor, nunca o agente Replit.
---

## Regra

Antes de qualquer `git commit` ou `git push`, SEMPRE executar:

```sh
git config user.name "madnessinvestor"
git config user.email "madness.investor@gmail.com"
```

Isso se aplica inclusive quando o agente faz commits automaticamente.
Nunca usar "Replit Agent" / "agent@replit.com" como autor.

**Why:** O usuário exigiu explicitamente que todos os commits apareçam no GitHub sob o nome madnessinvestor. Commits com identidade do agente são inaceitáveis.

**How to apply:** Em toda operação git (commit, push, amend), rodar o `git config` acima primeiro, sem exceção.
