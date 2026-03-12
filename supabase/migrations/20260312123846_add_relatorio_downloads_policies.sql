/*
  # Adicionar policies para tabela relatorio_downloads

  1. Políticas
    - Adicionar política para usuários autenticados lerem todos os downloads
    - A política de INSERT já existe (inserção pública)

  2. Notas
    - Permite que o painel admin visualize todos os downloads
    - Mantém a segurança com autenticação
*/

-- Política para leitura de downloads (usuários autenticados)
CREATE POLICY "Usuários autenticados podem ver todos os downloads"
  ON relatorio_downloads FOR SELECT
  TO authenticated
  USING (true);
