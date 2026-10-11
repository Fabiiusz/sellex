// sx-signup: cria a conta do lojista já confirmada (sem e-mail de confirmação)
// e com app_metadata.access = "pending" (acesso em liberação).
// O site mostra o aviso "Cadastro realizado com sucesso / estamos preparando sua área"
// e não abre o sistema até a conta ser liberada.
// Para liberar alguém (SQL no Supabase):
//   update auth.users set raw_app_meta_data = raw_app_meta_data - 'access' where email = 'cliente@exemplo.com';
// Código publicado: função sx-signup no Supabase (verify_jwt = false).
