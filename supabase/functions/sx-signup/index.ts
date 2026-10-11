// sx-signup: cria a conta do lojista já confirmada, sem depender de e-mail de confirmação.
// (O e-mail padrão do Supabase só entrega para a equipe do projeto, então clientes
// novos não recebiam o link e não conseguiam entrar.)
// verify_jwt=false porque quem chama ainda não tem conta. Depois de criar, o front-end
// entra normalmente com e-mail e senha. Código publicado: ver a versão no Supabase (sx-signup).
