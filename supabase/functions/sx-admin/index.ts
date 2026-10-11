// sx-admin: área do dono do Sellex (aba "Clientes"). Lista os cadastros e libera/bloqueia o acesso.
// Só responde para contas com app_metadata.role = "admin" (conferido no servidor a cada chamada).
// Ações: { action: "list" } | { action: "approve", user_id } | { action: "block", user_id }
// Código publicado: função sx-admin no Supabase (verify_jwt = true).
// Para tornar outra conta administradora (SQL):
//   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '...';
