BebaBem — Arquivos do projeto
=============================

Arquivos incluídos:
- index.html        -> Página pública da loja
- styles.css        -> Estilos
- app.js            -> Lógica da loja (lista produtos, carrinho, checkout -> supabase + whatsapp)
- admin.html        -> Painel admin (login e cadastro de produtos)
- admin.js          -> Lógica do admin (upload e inserção em products)
- README.txt        -> Este arquivo

Instruções rápidas:
1. Rode um servidor local na pasta do projeto:
   - python -m http.server 3000
   - ou npx serve .

2. Abra no navegador:
   - http://localhost:3000/index.html
   - http://localhost:3000/admin.html

3. Abra admin.js e app.js e substitua as constantes SUPABASE_URL e SUPABASE_ANON pelas suas chaves do Supabase.

4. No Supabase:
   - Crie as tabelas (use o SQL que te dei anteriormente).
   - Crie bucket 'product-images' em Storage e marque como público.
   - Crie um usuário admin em Authentication -> Users e adicione metadata {"role":"admin"} se quiser.

5. Teste cadastro de produtos via admin, depois visualize na index e finalize um pedido.

Observações:
- Não exponha sua service_role key no frontend.
- Em produção, use variáveis de ambiente para as chaves.
