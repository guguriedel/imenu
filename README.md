# 📖 Meu Livro de Receitas

Site estático com minhas receitas. Hospedado no Cloudflare Pages.

## Como adicionar uma receita nova

1. **Crie o arquivo da receita** — duplique uma receita existente
   (ex: `pizza-fermentacao-lenta.html`) e renomeie. Use um nome sem
   espaços nem acentos, ex: `pao-de-queijo.html`.

2. **Adicione a entrada no `recipes.json`** — copie um bloco e ajuste:

   ```json
   {
     "id": "pao-de-queijo",
     "title": "Pão de Queijo",
     "file": "pao-de-queijo.html",
     "category": "Pães",
     "tags": ["mineiro", "lanche", "forno"],
     "emoji": "🧀",
     "color": "#C4973A",
     "description": "Resumo curto que aparece no card.",
     "time": "40min",
     "difficulty": "Fácil",
     "servings": 6,
     "added": "2026-05-21"
   }
   ```

   - `difficulty`: `Fácil`, `Médio` ou `Difícil`
   - `added`: data no formato `AAAA-MM-DD` (ordena os "mais recentes")
   - `file`: tem que bater exatamente com o nome do arquivo `.html`

3. **Publique:**

   ```bash
   git add .
   git commit -m "Adiciona receita: Pão de Queijo"
   git push
   ```

   O Cloudflare Pages detecta o push e atualiza o site em ~30 segundos.

## Rodar localmente (opcional)

O `index.html` busca o `recipes.json` via `fetch`, então não funciona
abrindo o arquivo direto no navegador. Use um servidor local:

```bash
python -m http.server 8000
```

Depois abra http://localhost:8000
