// =============================================================================
// data.js — Single source of truth for the prototype
// Loaded by both admin.html and student.html
// =============================================================================

// ---------- Config & i18n ----------------------------------------------------

const CONFIG = {
  defaultLocale: 'en',
  supportedLocales: [
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ],
  // Fixed "today" so the seeded dataset is deterministic
  today: new Date('2026-05-12T12:00:00')
};

let CURRENT_LOCALE = (typeof localStorage !== 'undefined' && localStorage.getItem('tatami_locale')) || CONFIG.defaultLocale;

function setLocale(code) {
  CURRENT_LOCALE = code;
  if (typeof localStorage !== 'undefined') localStorage.setItem('tatami_locale', code);
  if (typeof renderApp === 'function') renderApp();   // admin app
  else if (typeof render === 'function') render();      // student app
}

// Resolve a localized field. Accepts either a string or { en, pt, ... } object.
function t(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  return field[CURRENT_LOCALE] || field[CONFIG.defaultLocale] || Object.values(field)[0] || '';
}

// =============================================================================
// i18n string catalog + tr() helper
// -----------------------------------------------------------------------------
// HOW TO ADD A LANGUAGE:
//   1. Add it to CONFIG.supportedLocales, e.g. { code: 'es', label: 'Español' }.
//   2. Add that locale's value to entries in STRINGS below. Any missing key
//      falls back to English automatically, so you can translate incrementally.
// The header language switcher and t()/tr() all read CONFIG.supportedLocales,
// so no other code changes are needed to support a new language.
//
// USAGE:
//   tr('common.save')                      -> "Save" / "Guardar"
//   tr('pager.page', { a: 1, b: 3, n: 42 }) -> "Page 1 of 3 · 42 rows"
// =============================================================================
const STRINGS = {
  // ---- Common ----
  'common.save':    { en: 'Save',    pt: 'Guardar' },
  'common.cancel':  { en: 'Cancel',  pt: 'Cancelar' },
  'common.edit':    { en: 'Edit',    pt: 'Editar' },
  'common.delete':  { en: 'Delete',  pt: 'Eliminar' },
  'common.add':     { en: 'Add',     pt: 'Adicionar' },
  'common.next':    { en: 'Next →',  pt: 'Seguinte →' },
  'common.back':    { en: '← Back',  pt: '← Voltar' },
  'common.clear':   { en: 'Clear',   pt: 'Limpar' },
  'common.search':  { en: 'Search…', pt: 'Procurar…' },
  'common.view':    { en: 'View',    pt: 'Ver' },
  'common.admin':   { en: 'Admin',   pt: 'Admin' },
  'common.settings':{ en: '⚙ Settings', pt: '⚙ Definições' },
  'common.today':   { en: 'Today',   pt: 'Hoje' },
  'common.prev':    { en: '← Prev',  pt: '← Anterior' },
  'common.nextarr': { en: 'Next →',  pt: 'Próximo →' },
  'common.comingSoon': { en: 'Coming soon.', pt: 'Em breve.' },
  'common.none':    { en: 'None.',   pt: 'Nenhum.' },

  // ---- Pagination ----
  'pager.page': { en: 'Page {a} of {b} · {n} rows', pt: 'Página {a} de {b} · {n} linhas' },

  // ---- Schedule ----
  'sched.week':  { en: 'Week',  pt: 'Semana' },
  'sched.month': { en: 'Month', pt: 'Mês' },
  'sched.currentMonth': { en: 'Current month', pt: 'Mês atual' },
  'sched.clickDay': { en: 'click a day to open its week', pt: 'clique num dia para abrir a semana' },

  // ---- Student tags / onboarding ----
  'tags.audience':    { en: 'Audience tags',  pt: 'Etiquetas de público' },
  'tags.noTags':      { en: 'No tags',        pt: 'Sem etiquetas' },
  'tags.gender':      { en: 'Gender',         pt: 'Género' },
  'tags.female':      { en: 'Female',         pt: 'Feminino' },
  'tags.male':        { en: 'Male',           pt: 'Masculino' },
  'tags.other':       { en: 'Other / prefer not to say', pt: 'Outro / prefiro não dizer' },
  'tags.select':      { en: 'Select…',        pt: 'Selecionar…' },
  'tags.competeQ':    { en: 'Interested in competing', pt: 'Interessado em competir' },
  'tags.competeHint': { en: 'Adds the Competition tag, unlocking competition classes.', pt: 'Adiciona a etiqueta Competição, desbloqueando aulas de competição.' },
  'tags.kidHint':     { en: 'Under 16 is tagged as Kid, otherwise Adult.', pt: 'Menores de 16 são marcados como Criança, caso contrário Adulto.' },

  // ---- Class audience ----
  'aud.whoCanAttend': { en: 'Who can attend', pt: 'Quem pode participar' },
  'aud.openHint':     { en: 'Leave all unchecked for open to everyone. Otherwise only students with a selected tag can book.', pt: 'Deixe tudo desmarcado para aberto a todos. Caso contrário, só alunos com uma etiqueta selecionada podem reservar.' },
  'aud.openHintShort':{ en: 'None checked = open to everyone.', pt: 'Nada marcado = aberto a todos.' },

  // ---- Curriculum wizard ----
  'wiz.title':        { en: 'Curriculum Wizard', pt: 'Assistente de Currículo' },
  'wiz.step.academy':    { en: 'Academy',    pt: 'Academia' },
  'wiz.step.philosophy': { en: 'Philosophy', pt: 'Filosofia' },
  'wiz.step.students':   { en: 'Students',   pt: 'Alunos' },
  'wiz.step.preview':    { en: 'Preview',    pt: 'Pré-visualização' },
  'wiz.step.sequence':   { en: 'Sequence',   pt: 'Sequência' },
  'wiz.academyProfile':  { en: 'Academy profile', pt: 'Perfil da academia' },
  'wiz.academyName':     { en: 'Academy name', pt: 'Nome da academia' },
  'wiz.location':        { en: 'Location',   pt: 'Localização' },
  'wiz.language':        { en: 'Primary language', pt: 'Idioma principal' },
  'wiz.primaryFocus':    { en: 'Primary focus', pt: 'Foco principal' },
  'wiz.legLockStance':   { en: 'Leg lock stance', pt: 'Postura de chaves de perna' },
  'wiz.takedowns':       { en: 'Takedowns',  pt: 'Quedas' },
  'wiz.ruleset':         { en: 'Ruleset',    pt: 'Conjunto de regras' },
  'wiz.whoTrains':       { en: 'Who trains here?', pt: 'Quem treina aqui?' },
  'wiz.whoTrainsHint':   { en: 'Select all that apply. This shapes module ordering and emphasis, not which techniques are included.', pt: 'Selecione todas as opções aplicáveis. Isto molda a ordem e ênfase dos módulos, não as técnicas incluídas.' },
  'wiz.preview':         { en: 'Curriculum preview', pt: 'Pré-visualização do currículo' },
  'wiz.showExcluded':    { en: 'Show excluded', pt: 'Mostrar excluídas' },
  'wiz.moduleSequence':  { en: 'Module sequence', pt: 'Sequência de módulos' },
  'wiz.sequenceHint':    { en: "Order the modules as you'd teach them. Empty modules are skipped on save.", pt: 'Ordene os módulos como os ensinaria. Módulos vazios são ignorados ao guardar.' },
  'wiz.finish':          { en: 'Finish & save ✓', pt: 'Concluir e guardar ✓' },
  'wiz.saving':          { en: 'Saving…', pt: 'A guardar…' },
  'wiz.addLabel':        { en: '+ Add', pt: '+ Adicionar' },
  'wiz.hide':            { en: 'Hide', pt: 'Ocultar' },
  'wiz.show':            { en: 'Show', pt: 'Mostrar' },
  'wiz.excluded':        { en: 'excluded', pt: 'excluídas' },

  // ---- Technique page ----
  'tech.description':    { en: 'Description', pt: 'Descrição' },
  'tech.keyDetails':     { en: 'Key Details & Common Errors', pt: 'Detalhes-chave e Erros Comuns' },
  'tech.video':          { en: 'Video', pt: 'Vídeo' },
  'tech.noVideo':        { en: 'No video added yet.', pt: 'Ainda sem vídeo.' },
  'tech.uploadVideo':    { en: 'Upload video', pt: 'Carregar vídeo' },
  'tech.module':         { en: 'Module', pt: 'Módulo' },
  'tech.prerequisites':  { en: 'Prerequisites', pt: 'Pré-requisitos' },
  'tech.chainsTo':       { en: 'Chains to', pt: 'Encadeia para' },
  'tech.academyContext': { en: 'Academy context', pt: 'Contexto da academia' },
  'tech.academyCtxHint': { en: 'Belt/stripe association — editable per academy. Coming soon.', pt: 'Associação de faixa/grau — editável por academia. Em breve.' },
  'tech.studentProgress':{ en: 'Student progress', pt: 'Progresso do aluno' },
  'tech.addPrereq':      { en: '+ Add prerequisite', pt: '+ Adicionar pré-requisito' },
  'tech.addChain':       { en: '+ Add chain', pt: '+ Adicionar encadeamento' },
  'tech.noDescription':  { en: 'No description yet.', pt: 'Ainda sem descrição.' },
  'tech.noKeyDetails':   { en: 'No key details yet.', pt: 'Ainda sem detalhes.' },
  'tech.notFound':       { en: 'Technique not found.', pt: 'Técnica não encontrada.' },
  'tech.badge.category': { en: 'Category', pt: 'Categoria' },
  'tech.badge.type':     { en: 'Type', pt: 'Tipo' },
  'tech.badge.complexity':{ en: 'Complexity', pt: 'Complexidade' },
  'tech.badge.ruleset':  { en: 'Ruleset', pt: 'Regras' },
  'tech.badge.context':  { en: 'Context', pt: 'Contexto' },
  'tech.badge.legLock':  { en: 'Leg lock', pt: 'Chave de perna' },

  // ---- Student app section headers ----
  'sapp.upNext':       { en: 'Up next', pt: 'A seguir' },
  'sapp.latestNews':   { en: 'Latest news', pt: 'Últimas notícias' },
  'sapp.privateLesson':{ en: 'Private lesson', pt: 'Aula particular' },
  'sapp.lessonPlan':   { en: 'On the lesson plan', pt: 'No plano de aula' },
  'sapp.trainingCalendar': { en: 'Training calendar', pt: 'Calendário de treino' },
  'sapp.trainingGoal': { en: 'Training goal', pt: 'Objetivo de treino' },
  'sapp.beltProgression': { en: 'Belt progression', pt: 'Progressão de faixa' },
  'sapp.techniqueProgress': { en: 'Technique progress', pt: 'Progresso técnico' },

  // ---- Admin screen headings ----
  'screen.settings':      { en: 'Settings', pt: 'Definições' },
  'screen.billing':       { en: 'Billing', pt: 'Faturação' },
  'screen.promotionRules':{ en: 'Promotion Rules', pt: 'Regras de Graduação' },
  'screen.membershipPlans':{ en: 'Membership plans', pt: 'Planos de adesão' },
  'screen.instructors':   { en: 'Instructors', pt: 'Professores' },
  'screen.newClass':      { en: 'New class', pt: 'Nova aula' },
  'screen.addStudent':    { en: 'Add new student', pt: 'Adicionar novo aluno' },
};

// =============================================================================
// PT_DICT + localizeDOM — runtime translation of static UI strings.
// Whenever PT is active, a post-render pass replaces exact-match English text
// (and placeholder/title attrs) with Brazilian Portuguese. Only full-string
// matches are translated, so student names / data are never touched.
// To translate a stray English string: add it here.
// =============================================================================
const PT_DICT = {
  // Nav / sections
  'Dashboard':'Painel','Schedule':'Horário','Classes':'Aulas','Students':'Alunos','Families':'Famílias',
  'Prospects':'Potenciais','Referrals':'Indicações','Instructors':'Professores','Memberships':'Matrículas',
  'Discounts':'Descontos','Billing':'Faturação','Curriculum':'Currículo','Grading':'Graduação',
  'Analytics':'Análises','Goals':'Objetivos','Announcements':'Avisos','Events':'Eventos',
  'Private lessons':'Aulas particulares','Private Lessons':'Aulas particulares','Settings':'Definições',
  'Competition':'Competição','Retention':'Retenção','Equipment':'Equipamento','Feedback':'Avaliações',
  'Overview':'Visão geral','Calendar':'Calendário','Squad':'Equipa','Results':'Resultados',
  // Common actions
  'Save':'Guardar','Save changes':'Guardar alterações','Save code':'Guardar código','Save rules':'Guardar regras',
  'Save slot':'Guardar horário','Cancel':'Cancelar','Edit':'Editar','Delete':'Eliminar','Add':'Adicionar',
  'Remove':'Remover','Close':'Fechar','View':'Ver','Open':'Abrir','Select all':'Selecionar tudo',
  'Clear all':'Limpar tudo','Clear selection':'Limpar seleção','Dismiss':'Dispensar','Undo':'Desfazer',
  'Return':'Devolver','Revoke':'Revogar','Sign':'Assinar','More':'Mais','Show less':'Mostrar menos',
  'Load more':'Carregar mais','Search':'Procurar','Cut':'Cortar','Pin to top':'Fixar no topo',
  'Edit Profile':'Editar perfil','Log out':'Terminar sessão','Submit request':'Enviar pedido',
  'Send request':'Enviar pedido','Submit rating':'Enviar avaliação','Create account':'Criar conta',
  'Create event':'Criar evento','Create group':'Criar grupo','Add item':'Adicionar item','Add closure':'Adicionar feriado',
  'Add expense':'Adicionar despesa','Add students':'Adicionar alunos','Mark paid':'Marcar como pago',
  'Mark lost':'Marcar como perdido','Loan out':'Emprestar','Sell a package':'Vender pacote','Book lesson':'Reservar aula',
  'Book students from the':'Reservar alunos de','Leave waitlist':'Sair da lista de espera',
  // Statuses / labels
  'Active':'Ativo','Archived':'Arquivado','Cancelled':'Cancelada','Completed':'Concluída','Scheduled':'Agendada',
  'Pending':'Pendente','Present':'Presente','Attended':'Presente','Booked':'Reservada','Waitlisted':'Em espera',
  'Walk-in':'Sem reserva','Checked in':'Check-in feito','Paid this month':'Pago este mês','Outstanding':'Em dívida',
  'Overdue':'Atrasado','Due now':'A vencer','Due soon':'A vencer em breve','Expired':'Expirado','Expires':'Expira',
  'No expiry':'Sem validade','Unlimited':'Ilimitado','Never':'Nunca','Today':'Hoje','Today!':'Hoje!','Tomorrow':'Amanhã',
  'This week':'Esta semana','This month':'Este mês','Last 30 days':'Últimos 30 dias','Past':'Passados',
  'Upcoming':'Próximos','On track':'No bom caminho','At risk':'Em risco','Lapsed':'Inativo','Flagged':'Sinalizado',
  'High':'Alto','Low':'Baixo','Any':'Qualquer','All':'Todos','None.':'Nenhum.','None here':'Nenhum aqui',
  'Not started':'Não iniciado','On hold':'Em pausa','Lost':'Perdido','Unknown':'Desconhecido','Other':'Outro',
  'Optional':'Opcional','Pinned':'Fixado','Yet to train':'Ainda não treinou','Working towards':'A trabalhar para',
  'Coach-verified':'Verificado pelo professor','Self-drilling':'Treino individual',
  // Fields / headers
  'Name':'Nome','Full name':'Nome completo','Your full name':'O seu nome completo','Email':'Email','Phone':'Telefone',
  'Contact':'Contacto','Date':'Data','Date & time':'Data e hora','Date / Time':'Data / Hora','Time':'Hora',
  'Start time':'Hora de início','Day':'Dia','Month':'Mês','Status':'Estado','Type':'Tipo','Category':'Categoria',
  'Description':'Descrição','Notes':'Notas','Note':'Nota','Amount':'Valor','Price':'Preço','Code':'Código',
  'Discount':'Desconto','Capacity':'Capacidade','Duration':'Duração','Duration (min)':'Duração (min)',
  'Location':'Localização','Website':'Website','Membership':'Plano','Membership plan':'Plano de matrícula',
  'Plan':'Plano','Plan name':'Nome do plano','Plans':'Planos','Belt':'Faixa','Stripes':'Graus','Instructor':'Professor',
  'Athlete':'Atleta','Event':'Evento','Division':'Divisão','Medal':'Medalha','Place':'Lugar','Placement':'Classificação',
  'Result':'Resultado','Source':'Origem','Sport':'Modalidade','Martial art':'Arte marcial','Label':'Etiqueta',
  'Objective':'Objetivo','Subject':'Assunto','Message':'Mensagem','Recipients':'Destinatários','Send to':'Enviar para',
  'Qty':'Qtd','Condition':'Estado','Validity':'Validade','Uses':'Utilizações','Member':'Membro','Group':'Grupo',
  'Groups':'Grupos','Family':'Família','Referred by':'Indicado por','Weight (kg)':'Peso (kg)','Date of birth':'Data de nascimento',
  'Gender':'Género','Emergency contact':'Contacto de emergência','Guardian email':'Email do encarregado',
  'Membership Plans':'Planos de matrícula','Class type':'Tipo de aula','Audience':'Público',
  // Cards / titles
  'Academy details':'Detalhes da academia','Academy name':'Nome da academia','Gym rules':'Regras do ginásio',
  'Student details':'Detalhes do aluno','Student documents':'Documentos do aluno','Student ratings':'Avaliações dos alunos',
  'Session notes':'Notas da sessão','Recent comments':'Comentários recentes','Belt Promotion History':'Histórico de graduações',
  'Belt / rank progression':'Progressão de faixa','Competition Results':'Resultados de competição',
  'Attendance history':'Histórico de presenças','Attendance heatmap':'Mapa de presenças','Training History':'Histórico de treino',
  'Curriculum Mastery':'Domínio do currículo','Overall mastery':'Domínio geral','Technique Progress':'Progresso técnico',
  'Techniques Mastered':'Técnicas dominadas','Recurring schedule':'Horário recorrente','Weekly slots':'Horários semanais',
  'Promotion candidates':'Candidatos a graduação','Promotion requirements':'Requisitos de graduação',
  'Past sessions':'Sessões anteriores','Ready to promote':'Pronto a graduar','Test requests':'Pedidos de teste',
  'Total promoted':'Total graduados','Log a result':'Registar resultado','Medals logged':'Medalhas registadas',
  'Squad members':'Membros da equipa','Upcoming competitions':'Próximas competições','Next competitions':'Próximas competições',
  'No upcoming competitions.':'Sem competições próximas.','No squad members yet.':'Ainda sem membros na equipa.',
  'No results logged yet.':'Ainda sem resultados.','Discount Codes':'Códigos de desconto','Active codes':'Códigos ativos',
  'Total uses':'Total de utilizações','Expiring soon':'A expirar em breve','Maxed out':'Esgotado',
  'Class Packages':'Pacotes de aulas','Package types':'Tipos de pacote','Student purchases':'Compras dos alunos',
  'Total members':'Total de membros','Est. MRR':'MRR est.','Renewals due':'Renovações pendentes',
  'New family group':'Novo grupo familiar','Family MRR':'MRR familiar','Avg discount':'Desconto médio',
  'Members':'Membros','Groups available':'Grupos disponíveis','Choose a membership':'Escolha um plano',
  'Add new student':'Adicionar novo aluno','New class':'Nova aula','New Event':'Novo evento','New Private Lesson':'Nova aula particular',
  'Guardian / parent details':'Detalhes do encarregado','Tell us about your academy':'Fale-nos da sua academia',
  'Which martial arts do you teach?':'Que artes marciais ensina?','Org Setup':'Configuração',
  // Stats
  'Total students':'Total de alunos','Total classes':'Total de aulas','Total members':'Total de membros',
  'Total goals':'Total de objetivos','Total ratings':'Total de avaliações','Total referrals':'Total de indicações',
  'Total recipients':'Total de destinatários','Total logged':'Total registado','Classes attended':'Aulas presentes',
  'Classes Attended':'Aulas presentes','Classes taught':'Aulas dadas','Classes this week':'Aulas esta semana',
  'Classes this month':'Aulas este mês','Hours':'Horas','Hours total':'Horas totais','Hours this month':'Horas este mês',
  'Hours / week':'Horas / semana','Months at Belt':'Meses na faixa','Months at Academy':'Meses na academia',
  'Time at belt':'Tempo na faixa','Member since':'Membro desde','Joined':'Inscrito','New students':'Novos alunos',
  'Revenue (MRR)':'Receita (MRR)','Net profit':'Lucro líquido','Expenses':'Despesas','Payroll':'Salários',
  'Collected':'Cobrado','Expected':'Esperado','Avg rating':'Avaliação média','Avg fill':'Ocupação média',
  'Avg fill rate':'Taxa de ocupação média','Fill rate by class type':'Ocupação por tipo de aula','Bookings':'Reservas',
  'Check-ins':'Check-ins','Referral rate':'Taxa de indicação','Top referrer':'Maior indicador','MRR':'MRR',
  'Total':'Total','Spots':'Vagas','Open spots':'Vagas livres','Selected':'Selecionado',
  // Empty states
  'No data yet.':'Ainda sem dados.','No classes yet.':'Ainda sem aulas.','No classes yet':'Ainda sem aulas',
  'No notes yet.':'Ainda sem notas.','No events':'Sem eventos','No announcements':'Sem avisos',
  'No injuries logged.':'Sem lesões registadas.','No ratings yet.':'Ainda sem avaliações.','No ratings yet':'Ainda sem avaliações',
  'No students match your filters.':'Nenhum aluno corresponde aos filtros.','No prospects here.':'Sem potenciais aqui.',
  'No instructors found.':'Nenhum professor encontrado.','No upcoming events. Create one above.':'Sem eventos próximos. Crie um acima.',
  'No students registered yet.':'Ainda sem alunos inscritos.','No squad':'Sem equipa','No medal':'Sem medalha',
  'No techniques.':'Sem técnicas.','No curriculum yet':'Ainda sem currículo','Check back soon.':'Volte em breve.',
  'Coming soon.':'Em breve.','Student not found':'Aluno não encontrado','Class not found':'Aula não encontrada',
  'Class not found.':'Aula não encontrada.','Event not found.':'Evento não encontrado.','Instructor not found.':'Professor não encontrado.',
  'Technique not found.':'Técnica não encontrada.',
  // Misc UI
  'Progress':'Progresso','Details':'Detalhes','Docs':'Documentos','Demo configuration':'Configuração demo',
  'Toggle dark / light mode':'Alternar modo claro/escuro','Search students…':'Procurar alunos…','Search squad…':'Procurar na equipa…',
  'Search screens and students…':'Procurar ecrãs e alunos…','Optional comment…':'Comentário opcional…','Add a note…':'Adicionar nota…',
  'Full name':'Nome completo','English':'Inglês','Português':'Português','Log injury':'Registar lesão','Log new injury':'Registar nova lesão',
  'Injury log':'Registo de lesões','Documents and waivers':'Documentos e termos','Payment history':'Histórico de pagamentos',
  'Member Card':'Cartão de membro','Progress Report':'Relatório de progresso','App link':'Link da app',
  'Print Certificate':'Imprimir certificado','Run grading':'Executar graduação','Grading system':'Sistema de graduação',
  'Add sport':'Adicionar modalidade','Sports':'Modalidades','View grading':'Ver graduação','Edit rules':'Editar regras',
  'Adult track':'Faixa adulto','Kids track':'Faixa infantil','Promotion rules':'Regras de graduação',
  // Uppercase table headers (literal in source)
  'CATEGORY':'CATEGORIA','DATE':'DATA','DESCRIPTION':'DESCRIÇÃO','NOTE':'NOTA','NOTES (optional)':'NOTAS (opcional)',
  'METHOD':'MÉTODO','OUTCOME':'RESULTADO','TECHNIQUE':'TÉCNICA','MEMBER CARD':'CARTÃO DE MEMBRO',
  'START DATE':'DATA INÍCIO','END DATE':'DATA FIM','DUE DATE':'DATA LIMITE','REASON (optional)':'MOTIVO (opcional)',
  'LOG CONTACT':'REGISTAR CONTACTO','Due date':'Data limite','Start time':'Hora de início',
};
function localizeDOM(root) {
  if (typeof document === 'undefined' || CURRENT_LOCALE !== 'pt') return;
  root = root || document.body; if (!root || !root.querySelectorAll) return;
  const SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, INPUT:1, SELECT:1 };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){ return (n.parentNode && SKIP[n.parentNode.nodeName]) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
  });
  const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(node => { const k = node.nodeValue.trim(); if (k && PT_DICT[k]) node.nodeValue = node.nodeValue.replace(k, PT_DICT[k]); });
  root.querySelectorAll('[placeholder]').forEach(el => { const k = (el.getAttribute('placeholder')||'').trim(); if (PT_DICT[k]) el.setAttribute('placeholder', PT_DICT[k]); });
  root.querySelectorAll('[title]').forEach(el => { const k = (el.getAttribute('title')||'').trim(); if (PT_DICT[k]) el.setAttribute('title', PT_DICT[k]); });
}
// Observe DOM swaps so every render (full or partial) gets localized.
function initDOMLocalizer() {
  if (typeof document === 'undefined' || document._ptObserver) return;
  const target = document.getElementById('app') || document.body;
  if (!target) return;
  localizeDOM(target);
  const obs = new MutationObserver(muts => {
    if (CURRENT_LOCALE !== 'pt') return;
    muts.forEach(m => m.addedNodes && m.addedNodes.forEach(node => {
      if (node.nodeType === 1) localizeDOM(node);
      else if (node.nodeType === 3) { const k = node.nodeValue.trim(); if (k && PT_DICT[k]) node.nodeValue = node.nodeValue.replace(k, PT_DICT[k]); }
    }));
  });
  obs.observe(target, { childList: true, subtree: true });
  document._ptObserver = obs;
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDOMLocalizer);
  else initDOMLocalizer();
}

// tr: look up a catalog key for the current locale, with {var} interpolation.
function tr(key, vars) {
  const entry = STRINGS[key];
  let s = entry ? (entry[CURRENT_LOCALE] || entry[CONFIG.defaultLocale] || entry.en) : null;
  if (s == null) {
    if (typeof console !== 'undefined' && CURRENT_LOCALE !== CONFIG.defaultLocale) {
      console.warn('[i18n] missing string key:', key);
    }
    s = key; // last-resort: show the key so it's obvious in the UI
  }
  if (vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
  return s;
}

// UI chrome strings (not part of the data model — just for the prototype UI)
const UI = {
  appName: { en: 'openmat.me', pt: 'openmat.me' },
  tagline: { en: 'Academy Management', pt: 'Gestão de Academia' },
  nav: {
    dashboard:  { en: 'Dashboard',  pt: 'Painel' },
    schedule:   { en: 'Schedule',   pt: 'Horário' },
    classes:    { en: 'Classes',    pt: 'Aulas' },
    curriculum:   { en: 'Curriculum',   pt: 'Currículo' },
    students:     { en: 'Students',     pt: 'Alunos' },
    memberships:  { en: 'Memberships',  pt: 'Matrículas' }
  },
  labels: {
    students:           { en: 'Students',              pt: 'Alunos' },
    addStudent:         { en: '+ Add student',         pt: '+ Adicionar aluno' },
    search:             { en: 'Search students...',    pt: 'Procurar alunos...' },
    level:              { en: 'Level',                 pt: 'Nível' },
    sport:              { en: 'Sport',                 pt: 'Modalidade' },
    joined:             { en: 'Joined',                pt: 'Inscrito' },
    classesAttended:    { en: 'Classes attended',      pt: 'Aulas presentes' },
    timeAtLevel:        { en: 'Time at current level', pt: 'Tempo no nível' },
    coverageOverview:   { en: 'Curriculum coverage',   pt: 'Cobertura do currículo' },
    recentlyCovered:    { en: 'Recently covered',      pt: 'Coberto recentemente' },
    gaps:               { en: 'Key gaps',              pt: 'Lacunas principais' },
    nextSteps:          { en: 'Recommended next steps',pt: 'Próximos passos' },
    promotionReady:     { en: 'Ready for promotion',   pt: 'Pronto para graduação' },
    promotionReadyMsg:  { en: 'Meets the requirements for the next level.', pt: 'Cumpre os requisitos para o próximo nível.' },
    promote:            { en: 'Promote',               pt: 'Graduar' },
    coverage:           { en: 'coverage',              pt: 'cobertura' },
    times:              { en: 'times',                 pt: 'vezes' },
    monthsShort:        { en: 'mo',                    pt: 'mes' },
    daysShort:          { en: 'd',                     pt: 'd' },
    backToList:         { en: '← Back to students',    pt: '← Voltar aos alunos' },
    stripes:            { en: 'stripes',               pt: 'graus' },
    stripe:             { en: 'stripe',                pt: 'grau' },
    noPromotion:        { en: 'On track',              pt: 'No bom caminho' },
    daysAgo:            { en: 'd ago',                 pt: 'd atrás' },
    monthsAgo:          { en: 'mo ago',                pt: 'mes atrás' },
    never:              { en: 'never',                 pt: 'nunca' },
    comingSoon:         { en: 'Coming soon',           pt: 'Em breve' },
    comingSoonMsg:      { en: 'This screen will be built next.', pt: 'Este ecrã será construído a seguir.' },
    // Classes screen
    upcoming:           { en: 'Upcoming',               pt: 'Próximas' },
    today:              { en: 'Today',                  pt: 'Hoje' },
    recent:             { en: 'Recent',                 pt: 'Recentes' },
    instructor:         { en: 'Instructor',             pt: 'Professor' },
    bookedStudents:     { en: 'Booked students',        pt: 'Alunos inscritos' },
    roster:             { en: 'Roster',                 pt: 'Lista de presenças' },
    plannedPlan:        { en: 'Planned curriculum',     pt: 'Plano de aula' },
    recommendedAdditions:{ en: 'Suggested additions',   pt: 'Sugestões adicionais' },
    recommendBasedOn:   { en: 'Based on the curriculum gaps of students booked into this class', pt: 'Com base nas lacunas curriculares dos alunos inscritos' },
    noBookings:         { en: 'No students booked yet', pt: 'Sem inscrições ainda' },
    noPlannedItems:     { en: 'No curriculum items planned yet', pt: 'Sem itens de currículo planeados' },
    addToPlan:          { en: '+ Add to plan',          pt: '+ Adicionar ao plano' },
    saveAttendance:     { en: 'Save attendance',        pt: 'Guardar presenças' },
    attended:           { en: 'attended',               pt: 'presentes' },
    of:                 { en: 'of',                     pt: 'de' },
    students:           { en: 'students',               pt: 'alunos' },
    wouldBenefit:       { en: 'would benefit',          pt: 'beneficiariam' },
    completed:          { en: 'Completed',              pt: 'Concluída' },
    scheduled:          { en: 'Scheduled',              pt: 'Agendada' },
    capacity:           { en: 'Capacity',               pt: 'Capacidade' },
    backToClasses:      { en: '← Back to classes',      pt: '← Voltar às aulas' }
  }
};

// ---------- Academy & Sports -------------------------------------------------

const ACADEMY = {
  id: 'academy-1',
  name: 'Iron Roots Academy',
  sportIds: ['sport-bjj'],
  sportConfigs: [
    { sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default' }
  ]
};

const SPORTS = [
  {
    id: 'sport-bjj',
    name: { en: 'Brazilian Jiu-Jitsu', pt: 'Jiu-Jitsu Brasileiro' },
    defaultGradingSystemId: 'grading-bjj-adult-default'
  }
];

// ---------- Grading systems --------------------------------------------------

const GRADING_SYSTEMS = [
  {
    id: 'grading-bjj-adult-default',
    name: { en: 'BJJ Adult Belts (IBJJF)', pt: 'Faixas Adulto BJJ (IBJJF)' },
    sportId: 'sport-bjj',
    isDefault: true,
    academyId: null,
    type: 'belt-stripe',
    levels: [
      { id: 'bjj-white',  name: { en: 'White',  pt: 'Branca'   }, order: 0, color: '#f8fafc', textColor: '#0f172a', maxStripes: 4 },
      { id: 'bjj-blue',   name: { en: 'Blue',   pt: 'Azul'     }, order: 1, color: '#1e40af', textColor: '#ffffff', maxStripes: 4 },
      { id: 'bjj-purple', name: { en: 'Purple', pt: 'Roxa'     }, order: 2, color: '#6b21a8', textColor: '#ffffff', maxStripes: 4 },
      { id: 'bjj-brown',  name: { en: 'Brown',  pt: 'Castanha' }, order: 3, color: '#78350f', textColor: '#ffffff', maxStripes: 4 },
      { id: 'bjj-black',  name: { en: 'Black',  pt: 'Preta'    }, order: 4, color: '#0f172a', textColor: '#ffffff', maxStripes: 6 }
    ],
    // Promotion rules keyed by "fromLevelId-to-toLevelId" (adult track)
    promotionRules: {
      'bjj-white-to-bjj-blue': {
        minMonthsAtLevel: 12,
        minStripes: 4,
        minBasicsCoveragePct: 0.80,
        minClassesAtLevel: 80
      }
    },
    // ---- Dual-track support (per ARCHITECTURE.md) --------------------------
    // Below the age boundary a student is tracked on the kids belts; at/above
    // it, on the adult belts (`levels`/`promotionRules` above).
    ageBoundary: 16,
    kidsLevels: [
      { id: 'bjj-k-white',  name: { en: 'White',  pt: 'Branca'   }, order: 0, color: '#f8fafc', textColor: '#0f172a', maxStripes: 4 },
      { id: 'bjj-k-grey',   name: { en: 'Grey',   pt: 'Cinzenta' }, order: 1, color: '#9ca3af', textColor: '#0f172a', maxStripes: 4 },
      { id: 'bjj-k-yellow', name: { en: 'Yellow', pt: 'Amarela'  }, order: 2, color: '#facc15', textColor: '#0f172a', maxStripes: 4 },
      { id: 'bjj-k-orange', name: { en: 'Orange', pt: 'Laranja'  }, order: 3, color: '#f97316', textColor: '#ffffff', maxStripes: 4 },
      { id: 'bjj-k-green',  name: { en: 'Green',  pt: 'Verde'    }, order: 4, color: '#16a34a', textColor: '#ffffff', maxStripes: 4 }
    ],
    kidsPromotionRules: {
      'bjj-k-white-to-bjj-k-grey':   { minMonthsAtLevel: 6, minStripes: 4, minBasicsCoveragePct: 0.50, minClassesAtLevel: 30 },
      'bjj-k-grey-to-bjj-k-yellow':  { minMonthsAtLevel: 9, minStripes: 4, minBasicsCoveragePct: 0.60, minClassesAtLevel: 50 }
    },
    // Kid → adult crossover applied at ageBoundary (maps kids belt → adult belt).
    transition: {
      mapping: {
        'bjj-k-white':  'bjj-white',
        'bjj-k-grey':   'bjj-white',
        'bjj-k-yellow': 'bjj-white',
        'bjj-k-orange': 'bjj-blue',
        'bjj-k-green':  'bjj-blue'
      },
      stripeReset: true
    }
  }
];

// Returns which track ('adult' | 'kids') a student is graded on, by age.
function studentTrack(student, grading) {
  const boundary = (grading && grading.ageBoundary) || 16;
  const age = ageFromDob(student && student.dob);
  return (age != null && age < boundary) ? 'kids' : 'adult';
}
// Track-aware level list + promotion rules for a grading system.
function trackLevels(grading, track) {
  return track === 'kids' ? (grading.kidsLevels || grading.levels) : grading.levels;
}
function trackRules(grading, track) {
  return track === 'kids' ? (grading.kidsPromotionRules || {}) : (grading.promotionRules || {});
}

// ---------- Curriculum -------------------------------------------------------

const CURRICULUM_SECTIONS = [
  { id: 'sec-mount',       sportId: 'sport-bjj', name: { en: 'Mount',         pt: 'Montada'        }, level: 'basics',       order: 1 },
  { id: 'sec-guard',       sportId: 'sport-bjj', name: { en: 'Guard',         pt: 'Guarda'         }, level: 'basics',       order: 2 },
  { id: 'sec-sidecontrol', sportId: 'sport-bjj', name: { en: 'Side Control',  pt: 'Cem Quilos'     }, level: 'basics',       order: 3 },
  { id: 'sec-takedowns',   sportId: 'sport-bjj', name: { en: 'Takedowns',     pt: 'Quedas'         }, level: 'basics',       order: 4 },
  { id: 'sec-escapes',     sportId: 'sport-bjj', name: { en: 'Escapes',       pt: 'Saídas'         }, level: 'basics',       order: 5 },
  { id: 'sec-submissions', sportId: 'sport-bjj', name: { en: 'Submissions',   pt: 'Finalizações'   }, level: 'intermediate', order: 6 }
];

const CURRICULUM_ITEMS = [
  // Mount
  { id: 'item-mount-1', sectionId: 'sec-mount', name: { en: 'Mount Maintenance',   pt: 'Manutenção da Montada' },       order: 1, complexity: 'beginner'     },
  { id: 'item-mount-2', sectionId: 'sec-mount', name: { en: 'Trap and Roll',        pt: 'Armadilha e Rolar' },           order: 2, complexity: 'beginner'     },
  { id: 'item-mount-3', sectionId: 'sec-mount', name: { en: 'Cross-Collar Choke',   pt: 'Estrangulamento Cruzado' },     order: 3, complexity: 'intermediate' },
  { id: 'item-mount-4', sectionId: 'sec-mount', name: { en: 'Armbar from Mount',    pt: 'Chave de Braço da Montada' },   order: 4, complexity: 'advanced'     },
  // Guard
  { id: 'item-guard-1', sectionId: 'sec-guard', name: { en: 'Closed Guard Basics',  pt: 'Guarda Fechada Básica' },       order: 1, complexity: 'beginner'     },
  { id: 'item-guard-2', sectionId: 'sec-guard', name: { en: 'Hip Bump Sweep',       pt: 'Raspagem de Subida' },          order: 2, complexity: 'beginner'     },
  { id: 'item-guard-3', sectionId: 'sec-guard', name: { en: 'Scissor Sweep',        pt: 'Raspagem de Tesoura' },         order: 3, complexity: 'intermediate' },
  { id: 'item-guard-4', sectionId: 'sec-guard', name: { en: 'Triangle from Guard',  pt: 'Triângulo da Guarda' },         order: 4, complexity: 'advanced'     },
  // Side Control
  { id: 'item-side-1', sectionId: 'sec-sidecontrol', name: { en: 'Side Control Maintenance', pt: 'Manutenção do Cem Quilos' }, order: 1, complexity: 'beginner'     },
  { id: 'item-side-2', sectionId: 'sec-sidecontrol', name: { en: 'Americana',                pt: 'Americana' },               order: 2, complexity: 'beginner'     },
  { id: 'item-side-3', sectionId: 'sec-sidecontrol', name: { en: 'Knee-on-Belly',            pt: 'Joelho na Barriga' },       order: 3, complexity: 'intermediate' },
  { id: 'item-side-4', sectionId: 'sec-sidecontrol', name: { en: 'North-South Choke',        pt: 'Estrangulamento Norte-Sul' }, order: 4, complexity: 'advanced'   },
  // Takedowns
  { id: 'item-td-1', sectionId: 'sec-takedowns', name: { en: 'Double Leg Takedown', pt: 'Baiana' },              order: 1, complexity: 'beginner'     },
  { id: 'item-td-2', sectionId: 'sec-takedowns', name: { en: 'Single Leg Takedown', pt: 'Queda de Uma Perna' },  order: 2, complexity: 'intermediate' },
  { id: 'item-td-3', sectionId: 'sec-takedowns', name: { en: 'Osoto Gari',          pt: 'Osoto Gari' },          order: 3, complexity: 'intermediate' },
  { id: 'item-td-4', sectionId: 'sec-takedowns', name: { en: 'Ankle Pick',          pt: 'Gancho de Tornozelo' }, order: 4, complexity: 'advanced'     },
  // Escapes
  { id: 'item-esc-1', sectionId: 'sec-escapes', name: { en: 'Upa Escape',          pt: 'Upa' },                         order: 1, complexity: 'beginner'     },
  { id: 'item-esc-2', sectionId: 'sec-escapes', name: { en: 'Elbow Escape',        pt: 'Recomposição de Cotovelo' },    order: 2, complexity: 'beginner'     },
  { id: 'item-esc-3', sectionId: 'sec-escapes', name: { en: 'Side Control Escape', pt: 'Saída do Cem Quilos' },         order: 3, complexity: 'intermediate' },
  { id: 'item-esc-4', sectionId: 'sec-escapes', name: { en: 'Turtle Recovery',     pt: 'Recuperação da Tartaruga' },    order: 4, complexity: 'advanced'     },
  // Submissions
  { id: 'item-sub-1', sectionId: 'sec-submissions', name: { en: 'Rear Naked Choke', pt: 'Mata-Leão' },     order: 1, complexity: 'intermediate' },
  { id: 'item-sub-2', sectionId: 'sec-submissions', name: { en: 'Guillotine Choke', pt: 'Guilhotina' },    order: 2, complexity: 'intermediate' },
  { id: 'item-sub-3', sectionId: 'sec-submissions', name: { en: 'Kimura',           pt: 'Kimura' },        order: 3, complexity: 'intermediate' },
  { id: 'item-sub-4', sectionId: 'sec-submissions', name: { en: 'Arm Triangle',     pt: 'Triângulo de Braço' }, order: 4, complexity: 'advanced' }
];

// ---------- Instructors & Students ------------------------------------------

const INSTRUCTORS = [
  { id: 'inst-1', name: 'Rui Almeida',  initials: 'RA', sportIds: ['sport-bjj'], payRate: 25 },
  { id: 'inst-2', name: 'Marta Costa',  initials: 'MC', sportIds: ['sport-bjj'], payRate: 25 }
];

const STUDENTS = [
  { id: 's-1',  name: 'João Silva',       initials: 'JS', dob: '1992-04-12', gender: 'male',   competes: false, weightKg: 78, joinedAt: '2025-09-15', contact: 'joao@example.com',    referredBy: 's-3' },
  { id: 's-2',  name: 'Ana Pereira',      initials: 'AP', dob: '1988-11-03', gender: 'female', competes: true,  weightKg: 62, joinedAt: '2024-02-20', contact: 'ana@example.com',     referredBy: null  },
  { id: 's-3',  name: 'Miguel Santos',    initials: 'MS', dob: '1995-07-22', gender: 'male',   competes: true,  weightKg: 84, joinedAt: '2023-06-10', contact: 'miguel@example.com',  referredBy: null  },
  { id: 's-4',  name: 'Sofia Martins',    initials: 'SM', dob: '1998-01-30', gender: 'female', competes: false, weightKg: 58, joinedAt: '2026-04-01', contact: 'sofia@example.com',   referredBy: 's-3' },
  { id: 's-5',  name: 'Pedro Oliveira',   initials: 'PO', dob: '1985-09-17', gender: 'male',   competes: true,  weightKg: 92, joinedAt: '2022-03-15', contact: 'pedro@example.com',   referredBy: 's-2' },
  // Extended roster — gives analytics, retention, and referral screens enough data to show
  { id: 's-6',  name: 'Inês Rodrigues',   initials: 'IR', dob: '1994-03-08', gender: 'female', competes: false, weightKg: 60, joinedAt: '2024-08-12', contact: 'ines.r@example.com',  referredBy: 's-2' },
  { id: 's-7',  name: 'Tomás Ferreira',   initials: 'TF', dob: '1990-12-25', gender: 'male',   competes: false, weightKg: 88, joinedAt: '2023-11-05', contact: 'tomas@example.com',   referredBy: null  },
  { id: 's-8',  name: 'Beatriz Costa',    initials: 'BC', dob: '2012-06-14', gender: 'female', competes: false, weightKg: 38, joinedAt: '2025-03-20', contact: 'bea.costa@example.com',referredBy: 's-1' },
  { id: 's-9',  name: 'Rúben Gomes',      initials: 'RG', dob: '1987-09-02', gender: 'male',   competes: false, weightKg: 80, joinedAt: '2022-11-01', contact: 'ruben@example.com',   referredBy: null  },
  { id: 's-10', name: 'Catarina Lima',    initials: 'CL', dob: '1996-02-19', gender: 'female', competes: true,  weightKg: 63, joinedAt: '2026-01-10', contact: 'cat.lima@example.com', referredBy: 's-3' },
  { id: 's-11', name: 'Diogo Neves',      initials: 'DN', dob: '1993-08-30', gender: 'male',   competes: false, weightKg: 76, joinedAt: '2024-05-22', contact: 'diogo.n@example.com',  referredBy: 's-7' },
  { id: 's-12', name: 'Mariana Fonseca',  initials: 'MF', dob: '1991-11-11', gender: 'female', competes: false, weightKg: 59, joinedAt: '2025-07-01', contact: 'mariana@example.com',  referredBy: 's-2' },
  { id: 's-13', name: 'André Carvalho',   initials: 'AC', dob: '1989-05-17', gender: 'male',   competes: true,  weightKg: 85, joinedAt: '2023-02-14', contact: 'andre.c@example.com',  referredBy: null  },
  { id: 's-14', name: 'Lara Mendes',      initials: 'LM', dob: '2013-07-04', gender: 'female', competes: false, weightKg: 35, joinedAt: '2026-03-15', contact: 'lara.m@example.com',   referredBy: 's-4' },
  { id: 's-15', name: 'Francisco Pires',  initials: 'FP', dob: '1983-01-28', gender: 'male',   competes: false, weightKg: 95, joinedAt: '2024-10-08', contact: null,                   referredBy: null  },
];

// ---------- Student audience tags -------------------------------------------
// Admin-only classification used to control which classes a student may book.
const KID_MAX_AGE = 15; // under 16 → kid
const AUDIENCE_TAGS = [
  { id: 'kid',         label: { en: 'Kid',         pt: 'Criança' } },
  { id: 'adult',       label: { en: 'Adult',       pt: 'Adulto' } },
  { id: 'women',       label: { en: 'Women',       pt: 'Feminino' } },
  { id: 'competition', label: { en: 'Competition', pt: 'Competição' } },
];
function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  return Math.floor((CONFIG.today - d) / (1000 * 60 * 60 * 24 * 365.25));
}
// Derive default tags from a student's attributes.
function deriveStudentTags(s) {
  const tags = [];
  const age = ageFromDob(s.dob);
  tags.push(age != null && age <= KID_MAX_AGE ? 'kid' : 'adult');
  if (s.gender === 'female') tags.push('women');
  if (s.competes) tags.push('competition');
  return tags;
}
// Effective tags: admin override (s.tags) if set, else derived.
function studentTags(s) {
  return (s && Array.isArray(s.tags) && s.tags.length) ? s.tags : deriveStudentTags(s || {});
}
function tagLabel(id) {
  const t0 = AUDIENCE_TAGS.find(x => x.id === id);
  return t0 ? t(t0.label) : id;
}

// Audience tags allowed for a class (empty/null = open to everyone).
// Resolves from the class itself or its recurring template.
function classAudienceTags(cls) {
  if (!cls) return [];
  if (Array.isArray(cls.audienceTags)) return cls.audienceTags;
  const tplId = cls._templateId;
  let tpl = tplId ? RECURRING_TEMPLATES.find(r => r.id === tplId) : null;
  if (!tpl) tpl = RECURRING_TEMPLATES.find(r => r.classType === cls.classType && r.instructorId === cls.instructorId)
             || RECURRING_TEMPLATES.find(r => r.classType === cls.classType);
  return (tpl && Array.isArray(tpl.audienceTags)) ? tpl.audienceTags : [];
}
// Whether a student is allowed to book a class given audience restrictions.
function canStudentBook(student, cls) {
  const allowed = classAudienceTags(cls);
  if (!allowed.length) return true;        // open to all
  const st = studentTags(student);
  return allowed.some(tag => st.includes(tag));
}

// Per-student, per-sport grading state
const ENROLLMENTS = [
  // s-1: White 2 stripes, ~8 months in, mid progress
  { id: 'e-1',  studentId: 's-1',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 2, levelSince: '2025-09-15', lastPromotionAt: '2026-02-10', membership: 'plan-monthly' },
  // s-2: White 4 stripes, 14 months in — PROMOTION CANDIDATE
  { id: 'e-2',  studentId: 's-2',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 4, levelSince: '2024-02-20', lastPromotionAt: '2026-03-05', membership: 'plan-unlimited' },
  // s-3: Blue 2 stripes, ~11 months at blue
  { id: 'e-3',  studentId: 's-3',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-blue',   currentStripes: 2, levelSince: '2024-06-15', lastPromotionAt: '2025-11-20', membership: 'plan-annual' },
  // s-4: White 0 stripes, brand new (4 months)
  { id: 'e-4',  studentId: 's-4',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 0, levelSince: '2026-04-01', lastPromotionAt: null,         membership: 'plan-monthly' },
  // s-5: Purple 1 stripe
  { id: 'e-5',  studentId: 's-5',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-purple', currentStripes: 1, levelSince: '2024-10-10', lastPromotionAt: '2025-08-15', membership: 'plan-unlimited' },
  // Extended roster
  // s-6: White 3 stripes — solid attendance, nearly promotion-ready
  { id: 'e-6',  studentId: 's-6',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 3, levelSince: '2024-08-12', lastPromotionAt: '2025-06-20', membership: 'plan-monthly' },
  // s-7: Blue 1 stripe — mid-blue, consistent attendance
  { id: 'e-7',  studentId: 's-7',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-blue',   currentStripes: 1, levelSince: '2024-11-05', lastPromotionAt: '2025-09-10', membership: 'plan-unlimited' },
  // s-8: White 1 stripe — newer student, irregular attendance
  { id: 'e-8',  studentId: 's-8',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 1, levelSince: '2025-03-20', lastPromotionAt: '2025-10-15', membership: 'plan-monthly' },
  // s-9: Purple 3 stripes — experienced, low attendance lately (churn risk)
  { id: 'e-9',  studentId: 's-9',  sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-purple', currentStripes: 3, levelSince: '2023-05-01', lastPromotionAt: '2024-08-20', membership: 'plan-annual' },
  // s-10: White 0 stripes — brand new Jan 2026
  { id: 'e-10', studentId: 's-10', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 0, levelSince: '2026-01-10', lastPromotionAt: null,         membership: 'plan-monthly' },
  // s-11: White 2 stripes — steady fundamentals attender
  { id: 'e-11', studentId: 's-11', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 2, levelSince: '2024-05-22', lastPromotionAt: '2025-04-10', membership: 'plan-monthly' },
  // s-12: White 1 stripe — dropped off (retention flag)
  { id: 'e-12', studentId: 's-12', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 1, levelSince: '2025-07-01', lastPromotionAt: '2025-12-05', membership: 'plan-monthly' },
  // s-13: Blue 3 stripes — near brown belt, very experienced
  { id: 'e-13', studentId: 's-13', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-blue',   currentStripes: 3, levelSince: '2023-08-14', lastPromotionAt: '2025-02-28', membership: 'plan-unlimited' },
  // s-14: White 0 stripes — very new, March 2026
  { id: 'e-14', studentId: 's-14', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 0, levelSince: '2026-03-15', lastPromotionAt: null,         membership: 'plan-monthly' },
  // s-15: White 3 stripes — older student, no email, attends open class only
  { id: 'e-15', studentId: 's-15', sportId: 'sport-bjj', gradingSystemId: 'grading-bjj-adult-default', currentLevelId: 'bjj-white',  currentStripes: 3, levelSince: '2024-10-08', lastPromotionAt: '2025-07-01', membership: 'plan-unlimited' },
];

// ---------- Classes, Bookings, Attendance ------------------------------------
// Generated programmatically so the seed stays compact and consistent.

const CLASSES = [];
const BOOKINGS = [];
const ATTENDANCE = [];
const WAITLIST = [];

// Grading history — each entry records a stripe award or belt promotion
// { id, studentId, sportId, type: 'stripe'|'promotion', levelId, stripes, date, note }
const GRADING_LOG = [];

// Special events — tournaments, seminars, belt tests, open mats
const EVENTS = [
  {
    id: 'evt-sc-001',
    title: 'AJP Lisbon International Open',
    type: 'tournament',
    date: '2026-07-19',
    time: '09:00',
    durationMin: 480,
    location: 'Pavilhão Multiusos, Lisbon',
    capacity: null,
    notes: 'IBJJF/AJP ruleset. Registration & divisions managed on Smoothcomp.',
    registeredStudentIds: ['s-2', 's-3', 's-13'],
    source: 'smoothcomp',
    externalUrl: 'https://smoothcomp.com/en/event/12345',
    externalId: '12345',
    image: '',
    createdAt: '2026-05-22T10:00:00.000Z'
  },
  {
    id: 'evt-001',
    title: 'Summer Open Mat',
    type: 'open-mat',
    date: '2026-06-07',
    time: '10:00',
    durationMin: 120,
    location: 'Main Mat',
    capacity: 40,
    notes: 'Free open mat for all levels. Bring your gi and no-gi gear.',
    registeredStudentIds: ['s-1', 's-2', 's-3'],
    createdAt: '2026-05-01T10:00:00.000Z'
  },
  {
    id: 'evt-002',
    title: 'Quarterly Belt Test',
    type: 'belt-test',
    date: '2026-06-28',
    time: '10:00',
    durationMin: 90,
    location: 'Main Mat',
    capacity: 20,
    notes: 'Promotion grading for promotion-ready students. Attendance mandatory for candidates.',
    registeredStudentIds: ['s-4', 's-5'],
    createdAt: '2026-05-10T10:00:00.000Z'
  },
  {
    id: 'evt-003',
    title: 'Guard Passing Seminar — Prof. Carlos Lima',
    type: 'seminar',
    date: '2026-07-12',
    time: '13:00',
    durationMin: 180,
    location: 'Main Mat',
    capacity: 30,
    notes: 'Special seminar on guard passing mechanics. R$150 per person, paid in advance.',
    registeredStudentIds: ['s-1', 's-6'],
    createdAt: '2026-05-15T10:00:00.000Z'
  },
  {
    id: 'evt-004',
    title: 'City BJJ Open Championship',
    type: 'tournament',
    date: '2026-08-02',
    time: '08:00',
    durationMin: 480,
    location: 'City Sports Arena',
    capacity: 60,
    notes: 'IBJJF-format city championship. Weigh-ins at 08:00; first matches at 09:30.',
    registeredStudentIds: ['s-2', 's-7', 's-8'],
    createdAt: '2026-05-20T10:00:00.000Z'
  },
  {
    id: 'evt-005',
    title: 'Spring Invitational Tournament',
    type: 'tournament',
    date: '2026-03-15',
    time: '09:00',
    durationMin: 360,
    location: 'Riverside Sports Hall',
    capacity: 50,
    notes: 'Internal invitational with 4 guest academies. Gi only.',
    registeredStudentIds: ['s-1', 's-2', 's-3', 's-4', 's-5'],
    createdAt: '2026-02-10T10:00:00.000Z'
  }
];

// Competition results — per-student placements for tournament events
// placement: '1st' | '2nd' | '3rd' | '5th' | 'DNP'
// medal: 'gold' | 'silver' | 'bronze' | 'none'
const COMPETITION_RESULTS = [
  { id: 'cr-1', eventId: 'evt-005', studentId: 's-1', division: 'Adult White Belt -70kg', placement: '1st', medal: 'gold',   notes: 'Won all 3 matches by points.',         loggedAt: '2026-03-15T17:00:00.000Z' },
  { id: 'cr-2', eventId: 'evt-005', studentId: 's-2', division: 'Adult Blue Belt -76kg',  placement: '2nd', medal: 'silver', notes: 'Lost final by advantage.',             loggedAt: '2026-03-15T17:00:00.000Z' },
  { id: 'cr-3', eventId: 'evt-005', studentId: 's-3', division: 'Adult White Belt -76kg', placement: '3rd', medal: 'bronze', notes: 'Won bronze match by rear naked choke.', loggedAt: '2026-03-15T17:00:00.000Z' },
  { id: 'cr-4', eventId: 'evt-005', studentId: 's-4', division: 'Adult Blue Belt -82kg',  placement: '1st', medal: 'gold',   notes: 'Submitted all opponents.',             loggedAt: '2026-03-15T17:00:00.000Z' },
  { id: 'cr-5', eventId: 'evt-005', studentId: 's-5', division: 'Adult White Belt -82kg', placement: '5th', medal: 'none',  notes: 'Lost first match by points.',          loggedAt: '2026-03-15T17:00:00.000Z' }
];

// Discount codes / promotions — redeemable codes for membership discounts
// type: 'percent' | 'fixed'  value: number (% or € amount)
// maxUses: null = unlimited; uses: how many times applied
const DISCOUNT_CODES = [
  { id: 'dc-1', code: 'SUMMER20', type: 'percent', value: 20,  maxUses: 50,   uses: 12, expiresAt: '2026-08-31', note: 'Summer promotion',             active: true,  createdAt: '2026-05-01' },
  { id: 'dc-2', code: 'REFER10',  type: 'fixed',   value: 10,  maxUses: null, uses: 8,  expiresAt: null,         note: 'Referral reward — €10 off',    active: true,  createdAt: '2026-01-01' },
  { id: 'dc-3', code: 'FIRSTMO',  type: 'percent', value: 100, maxUses: 20,   uses: 20, expiresAt: '2026-06-30', note: 'First month free (maxed out)',  active: false, createdAt: '2026-03-01' },
  { id: 'dc-4', code: 'FAMILY15', type: 'percent', value: 15,  maxUses: null, uses: 5,  expiresAt: null,         note: 'Family groups discount',        active: true,  createdAt: '2026-04-01' },
];

// Academy-wide announcements — created by admin, visible in student app
const ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Summer Open Mat — June 7',
    body: 'Join us for a free open mat session on Saturday June 7th at 10:00. All levels welcome. Bring water and your gi!',
    pinned: true,
    createdAt: '2026-05-28T10:00:00.000Z',
    expiresAt: '2026-06-08T00:00:00.000Z'
  },
  {
    id: 'ann-2',
    title: 'Gi inspection at next grading',
    body: 'A reminder that gis must comply with IBJJF standards for the upcoming grading session. Please check patch placement and collar thickness.',
    pinned: false,
    createdAt: '2026-05-20T09:00:00.000Z',
    expiresAt: null
  }
];

// Student injury log — admin-managed, per-student health/injury records
// type: 'sprain' | 'strain' | 'bruise' | 'soreness' | 'fracture' | 'other'
// status: 'active' | 'recovered'
const STUDENT_INJURIES = [
  { id: 'inj-1', studentId: 's-1', date: '2026-05-10', type: 'sprain',   bodyPart: 'Left knee',      status: 'active',    notes: 'Twisted during guard pass. Avoiding leg locks.',             loggedAt: '2026-05-10T18:30:00.000Z' },
  { id: 'inj-2', studentId: 's-2', date: '2026-04-22', type: 'soreness', bodyPart: 'Right shoulder', status: 'recovered', notes: 'Rotator cuff soreness after competition. Cleared to train.', loggedAt: '2026-04-22T10:00:00.000Z' },
  { id: 'inj-3', studentId: 's-3', date: '2026-05-18', type: 'bruise',   bodyPart: 'Ribs',           status: 'active',    notes: 'Took a hard knee during sparring. No fracture confirmed.',  loggedAt: '2026-05-18T20:00:00.000Z' },
];

// Prospect / lead pipeline — trial students who haven't converted yet
// status: 'new' | 'trial-scheduled' | 'trial-attended' | 'follow-up' | 'converted' | 'lost'
// source: 'referral' | 'instagram' | 'google' | 'walk-in' | 'event' | 'other'
const PROSPECTS = [
  { id: 'pr-1', name: 'Tiago Ferreira', contact: 'tiago.f@gmail.com', source: 'instagram',  sportId: 'sport-bjj', status: 'trial-attended', trialDate: '2026-05-10', notes: 'Watched a highlight reel, very keen on comp training.',  createdAt: '2026-05-08T10:00:00.000Z' },
  { id: 'pr-2', name: 'Lena Brandt',    contact: 'lena.b@email.de',   source: 'referral',   sportId: 'sport-bjj', status: 'follow-up',      trialDate: '2026-05-15', notes: 'Referred by Miguel. Attended Monday Fundamentals.',      createdAt: '2026-05-12T09:00:00.000Z' },
  { id: 'pr-3', name: 'Carlos Mota',    contact: 'cmota@hotmail.com',  source: 'walk-in',    sportId: 'sport-bjj', status: 'trial-scheduled', trialDate: '2026-06-02', notes: 'Walked in off the street, confirmed trial for Monday.', createdAt: '2026-05-27T14:00:00.000Z' },
  { id: 'pr-4', name: 'Rita Pinho',     contact: 'rita.pinho@me.com',  source: 'google',     sportId: 'sport-bjj', status: 'new',            trialDate: null,         notes: 'Found us on Google Maps, asked about kids classes.',    createdAt: '2026-05-29T08:30:00.000Z' },
  { id: 'pr-5', name: 'Fábio Nunes',    contact: 'fabio@outlook.pt',   source: 'event',      sportId: 'sport-bjj', status: 'lost',           trialDate: '2026-04-20', notes: 'Met at city tournament, did trial but didn\'t sign up.', createdAt: '2026-04-18T16:00:00.000Z' }
];

// Weekly recurring class templates — source of truth for the schedule
const RECURRING_TEMPLATES = [
  { id: 'rt-1', dow: 1, time: '19:00', durationMin: 60, classType: 'Fundamentals', audience: 'Adults',      audienceTags: ['adult'],              instructorId: 'inst-1', capacity: 20, sportId: 'sport-bjj' },
  { id: 'rt-2', dow: 2, time: '19:00', durationMin: 60, classType: 'Open Class',   audience: 'Adults',      audienceTags: ['adult'],              instructorId: 'inst-2', capacity: 20, sportId: 'sport-bjj' },
  { id: 'rt-3', dow: 3, time: '19:00', durationMin: 60, classType: 'Fundamentals', audience: 'Adults',      audienceTags: ['adult'],              instructorId: 'inst-1', capacity: 20, sportId: 'sport-bjj' },
  { id: 'rt-4', dow: 4, time: '19:00', durationMin: 60, classType: 'Kids Class',   audience: 'Kids',        audienceTags: ['kid'],                instructorId: 'inst-2', capacity: 20, sportId: 'sport-bjj' },
  { id: 'rt-5', dow: 5, time: '19:00', durationMin: 60, classType: 'Fundamentals', audience: 'Adults',      audienceTags: ['adult'],              instructorId: 'inst-1', capacity: 20, sportId: 'sport-bjj' },
  { id: 'rt-6', dow: 6, time: '10:00', durationMin: 75, classType: 'Advanced',     audience: 'Competition', audienceTags: ['competition'],        instructorId: 'inst-2', capacity: 20, sportId: 'sport-bjj' },
];

(function seedSchedule() {
  // Weekly recurring schedule (BJJ only for now)
  const WEEKLY = [
    { dow: 1, time: '19:00', durationMin: 60, classType: 'Fundamentals', instructorId: 'inst-1', sectionPool: ['sec-mount', 'sec-guard', 'sec-sidecontrol'] },
    { dow: 2, time: '19:00', durationMin: 60, classType: 'Open Class',   instructorId: 'inst-2', sectionPool: ['sec-takedowns', 'sec-escapes'] },
    { dow: 3, time: '19:00', durationMin: 60, classType: 'Fundamentals', instructorId: 'inst-1', sectionPool: ['sec-mount', 'sec-guard', 'sec-sidecontrol'] },
    { dow: 4, time: '19:00', durationMin: 60, classType: 'Open Class',   instructorId: 'inst-2', sectionPool: ['sec-escapes', 'sec-takedowns'] },
    { dow: 5, time: '19:00', durationMin: 60, classType: 'Fundamentals', instructorId: 'inst-1', sectionPool: ['sec-guard', 'sec-mount'] },
    { dow: 6, time: '10:00', durationMin: 75, classType: 'Advanced',     instructorId: 'inst-2', sectionPool: ['sec-submissions', 'sec-guard'] }
  ];

  const start = new Date('2025-11-10T00:00:00'); // ~6 months back from May 12 — gives realistic attendance volume
  const end   = new Date('2026-08-01T00:00:00'); // ~3 months forward — ensures real future classes exist for student app
  const itemsBySection = CURRICULUM_ITEMS.reduce((acc, it) => {
    (acc[it.sectionId] = acc[it.sectionId] || []).push(it);
    return acc;
  }, {});

  // Per-section rotation cursor — ensures each item gets covered before repeating
  const sectionCursor = {};
  Object.keys(itemsBySection).forEach(sid => { sectionCursor[sid] = 0; });
  // Per-day-slot section cursor — rotates which section each weekday slot picks
  const slotSectionCursor = {};

  let classCounter = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const day = WEEKLY.find(w => w.dow === dow);
    if (!day) continue;

    const [h, m] = day.time.split(':').map(Number);
    const startsAt = new Date(d); startsAt.setHours(h, m, 0, 0);
    const inFuture = startsAt > CONFIG.today;

    // Rotate which section this weekly slot covers
    const slotKey = `${day.dow}-${day.time}`;
    const sCur = slotSectionCursor[slotKey] = (slotSectionCursor[slotKey] || 0);
    const chosenSection = day.sectionPool[sCur % day.sectionPool.length];
    slotSectionCursor[slotKey] = sCur + 1;

    // Cycle through items within the chosen section
    const items = itemsBySection[chosenSection] || [];
    const iCur = sectionCursor[chosenSection] || 0;
    const chosenItems = [
      items[iCur % items.length],
      items[(iCur + 1) % items.length]
    ].filter(Boolean).map(i => i.id);
    sectionCursor[chosenSection] = iCur + 2;

    const cls = {
      id: `cls-${classCounter}`,
      sportId: 'sport-bjj',
      instructorId: day.instructorId,
      startsAt: startsAt.toISOString(),
      durationMin: day.durationMin,
      classType: day.classType,
      capacity: 20,
      plannedItemIds: chosenItems,
      status: inFuture ? 'scheduled' : 'completed'
    };
    CLASSES.push(cls);
    classCounter++;
  }

  // Attendance patterns: per student, define probability of attending each class type
  // Designed to produce distinct profiles for each student.
  const PATTERNS = {
    's-1':  { Fundamentals: 0.85, 'Open Class': 0.15, Advanced: 0.0  },  // committed but skips Opens → gaps in escapes/takedowns
    's-2':  { Fundamentals: 0.92, 'Open Class': 0.75, Advanced: 0.40 },  // promotion candidate — high attendance
    's-3':  { Fundamentals: 0.30, 'Open Class': 0.85, Advanced: 0.80 },  // blue belt — does opens and advanced
    's-4':  { Fundamentals: 0.55, 'Open Class': 0.10, Advanced: 0.0  },  // brand new — patchy
    's-5':  { Fundamentals: 0.15, 'Open Class': 0.50, Advanced: 0.90 },  // purple — mainly advanced
    's-6':  { Fundamentals: 0.80, 'Open Class': 0.60, Advanced: 0.05 },  // solid all-rounder, white near promotion
    's-7':  { Fundamentals: 0.45, 'Open Class': 0.75, Advanced: 0.55 },  // blue belt, prefers sparring
    's-8':  { Fundamentals: 0.60, 'Open Class': 0.20, Advanced: 0.0  },  // irregular newcomer
    's-9':  { Fundamentals: 0.05, 'Open Class': 0.15, Advanced: 0.30 },  // experienced but fading — retention risk (stopped ~60d ago)
    's-10': { Fundamentals: 0.70, 'Open Class': 0.10, Advanced: 0.0  },  // brand new Jan, getting into routine
    's-11': { Fundamentals: 0.75, 'Open Class': 0.40, Advanced: 0.0  },  // steady white belt, mainly fundamentals
    's-12': { Fundamentals: 0.65, 'Open Class': 0.30, Advanced: 0.0  },  // dropped off last 6 weeks — at-risk
    's-13': { Fundamentals: 0.25, 'Open Class': 0.70, Advanced: 0.85 },  // experienced blue, competition focus
    's-14': { Fundamentals: 0.50, 'Open Class': 0.05, Advanced: 0.0  },  // very new March 2026
    's-15': { Fundamentals: 0.10, 'Open Class': 0.65, Advanced: 0.10 },  // older student, open class only, no email
  };

  // Optional cutoff: students who stopped attending. After this date their attendance drops to 0.
  const ATTENDANCE_CUTOFF = {
    's-9':  '2026-03-01',  // purple belt — hasn't been in for 70+ days
    's-12': '2026-03-25',  // white belt — drifted away ~48 days ago
  };

  // Deterministic pseudo-random based on (studentId, classIdx)
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

  STUDENTS.forEach(stu => {
    const joinedAt = new Date(stu.joinedAt);
    const pattern = PATTERNS[stu.id];
    if (!pattern) return; // skip students with no pattern defined
    const cutoff = ATTENDANCE_CUTOFF[stu.id] ? new Date(ATTENDANCE_CUTOFF[stu.id]) : null;
    CLASSES.forEach((cls, idx) => {
      if (new Date(cls.startsAt) < joinedAt) return;
      if (cls.status !== 'completed') return; // skip future classes
      if (cutoff && new Date(cls.startsAt) >= cutoff) return; // student dropped off
      const p = pattern[cls.classType] ?? 0;
      const rnd = (hash(stu.id + cls.id) % 1000) / 1000;
      if (rnd < p) {
        const bookingId = `bk-${stu.id}-${cls.id}`;
        BOOKINGS.push({ id: bookingId, classId: cls.id, studentId: stu.id, bookedAt: cls.startsAt, status: 'booked' });
        ATTENDANCE.push({ id: `at-${stu.id}-${cls.id}`, classId: cls.id, studentId: stu.id, attended: true, confirmedAt: cls.startsAt });
      }
    });
    // Pre-book upcoming classes — take 20 so there are future bookings even weeks after seed date
    const upcoming = CLASSES.filter(c => c.status === 'scheduled').slice(0, 20);
    upcoming.forEach(cls => {
      const p = pattern[cls.classType] ?? 0;
      if (p > 0.4) {
        BOOKINGS.push({ id: `bk-${stu.id}-${cls.id}`, classId: cls.id, studentId: stu.id, bookedAt: CONFIG.today.toISOString(), status: 'booked' });
      }
    });
  });
})();

// ---------- Derived data helpers --------------------------------------------
// These compute the "payoff" views at read-time.

const DB = {
  sport:     (id) => SPORTS.find(s => s.id === id),
  grading:   (id) => GRADING_SYSTEMS.find(g => g.id === id),
  section:   (id) => CURRICULUM_SECTIONS.find(s => s.id === id),
  item:      (id) => CURRICULUM_ITEMS.find(i => i.id === id),
  student:   (id) => STUDENTS.find(s => s.id === id),
  instructor:(id) => INSTRUCTORS.find(i => i.id === id),
  class:     (id) => CLASSES.find(c => c.id === id),
  enrollment:(studentId, sportId) => ENROLLMENTS.find(e => e.studentId === studentId && e.sportId === sportId),
  level:     (gradingId, levelId) => { const g = DB.grading(gradingId); if (!g) return undefined;
               return (g.levels || []).find(l => l.id === levelId) || (g.kidsLevels || []).find(l => l.id === levelId); },
  itemsBySection: (sectionId) => CURRICULUM_ITEMS.filter(i => i.sectionId === sectionId).sort((a,b) => a.order - b.order),
  sectionsBySport: (sportId) => CURRICULUM_SECTIONS.filter(s => s.sportId === sportId).sort((a,b) => a.order - b.order)
};

// Compute exposure map: for a (student, sport), how many times each curriculum item
// has been planned in classes the student attended.
function computeExposureMap(studentId, sportId) {
  const attendedClassIds = ATTENDANCE
    .filter(a => a.studentId === studentId && a.attended)
    .map(a => a.classId);
  const attendedClasses = attendedClassIds
    .map(id => DB.class(id))
    .filter(c => c && c.sportId === sportId);

  const map = {};
  CURRICULUM_ITEMS
    .filter(it => DB.section(it.sectionId)?.sportId === sportId)
    .forEach(it => { map[it.id] = { itemId: it.id, count: 0, lastSeenAt: null }; });

  attendedClasses.forEach(cls => {
    cls.plannedItemIds.forEach(itemId => {
      if (!map[itemId]) return;
      map[itemId].count++;
      if (!map[itemId].lastSeenAt || cls.startsAt > map[itemId].lastSeenAt) {
        map[itemId].lastSeenAt = cls.startsAt;
      }
    });
  });

  return {
    items: map,
    totalAttended: attendedClasses.length,
    bySection: DB.sectionsBySport(sportId).map(section => {
      const items = DB.itemsBySection(section.id);
      const covered = items.filter(i => map[i.id]?.count > 0).length;
      return {
        section,
        total: items.length,
        covered,
        pct: items.length === 0 ? 0 : covered / items.length
      };
    })
  };
}

function computePromotionStatus(studentId, sportId) {
  const enrollment = DB.enrollment(studentId, sportId);
  if (!enrollment) return null;
  const grading = DB.grading(enrollment.gradingSystemId);
  const level = DB.level(enrollment.gradingSystemId, enrollment.currentLevelId);
  if (!grading || !level) return null;

  // Find next level
  const nextLevel = grading.levels.find(l => l.order === level.order + 1);
  if (!nextLevel) return { ready: false, reason: 'top-level', level, nextLevel: null };

  const ruleKey = `${level.id}-to-${nextLevel.id}`;
  const rule = grading.promotionRules?.[ruleKey];
  if (!rule) return { ready: false, reason: 'no-rule', level, nextLevel };

  const exposure = computeExposureMap(studentId, sportId);
  const basicsSections = exposure.bySection.filter(s => s.section.level === 'basics');
  const basicsTotal = basicsSections.reduce((a, s) => a + s.total, 0);
  const basicsCovered = basicsSections.reduce((a, s) => a + s.covered, 0);
  const basicsPct = basicsTotal === 0 ? 0 : basicsCovered / basicsTotal;

  const monthsAtLevel = Math.floor((CONFIG.today - new Date(enrollment.levelSince)) / (1000 * 60 * 60 * 24 * 30));
  const stripesOk = enrollment.currentStripes >= (rule.minStripes ?? 0);
  const monthsOk  = monthsAtLevel >= (rule.minMonthsAtLevel ?? 0);
  const coverageOk = basicsPct >= (rule.minBasicsCoveragePct ?? 0);
  const classesOk = exposure.totalAttended >= (rule.minClassesAtLevel ?? 0);

  const ready = stripesOk && monthsOk && coverageOk && classesOk;
  return {
    ready, level, nextLevel, rule,
    checks: { stripesOk, monthsOk, coverageOk, classesOk },
    actual: {
      stripes: enrollment.currentStripes,
      monthsAtLevel,
      basicsPct,
      classesAttended: exposure.totalAttended
    }
  };
}

function computeNextSteps(studentId, sportId, limit = 5) {
  const exposure = computeExposureMap(studentId, sportId);
  const enrollment = DB.enrollment(studentId, sportId);
  const level = DB.level(enrollment.gradingSystemId, enrollment.currentLevelId);

  // Prioritize uncovered basics if student is white/blue; otherwise intermediate gaps
  const relevantLevels = level.order === 0 ? ['basics'] : level.order === 1 ? ['basics', 'intermediate'] : ['intermediate', 'advanced'];

  const items = CURRICULUM_ITEMS
    .filter(it => {
      const section = DB.section(it.sectionId);
      return section.sportId === sportId && relevantLevels.includes(section.level);
    })
    .map(it => ({
      item: it,
      section: DB.section(it.sectionId),
      count: exposure.items[it.id]?.count ?? 0,
      lastSeenAt: exposure.items[it.id]?.lastSeenAt
    }))
    .sort((a, b) => a.count - b.count) // least-covered first
    .slice(0, limit);

  return items;
}

// Given a class, look at all students booked into it, aggregate their gaps,
// and return curriculum items ranked by how many booked students would benefit.
// This powers the "auto-recommended plan" feature.
function computeClassRecommendations(classId, limit = 5) {
  const cls = DB.class(classId);
  if (!cls) return { bookedCount: 0, recommendations: [] };

  const bookedStudentIds = BOOKINGS
    .filter(b => b.classId === classId && b.status === 'booked')
    .map(b => b.studentId);
  if (!bookedStudentIds.length) return { bookedCount: 0, recommendations: [] };

  // Pre-compute each booked student's exposure once (avoid recomputing per item)
  const exposureByStudent = {};
  bookedStudentIds.forEach(sid => {
    exposureByStudent[sid] = computeExposureMap(sid, cls.sportId);
  });

  // Build per-item recommendation score
  const sectionsForSport = DB.sectionsBySport(cls.sportId);
  const recommendations = [];
  sectionsForSport.forEach(section => {
    DB.itemsBySection(section.id).forEach(item => {
      if (cls.plannedItemIds.includes(item.id)) return; // skip already-planned items
      let gapStudents = 0;
      bookedStudentIds.forEach(sid => {
        const exp = exposureByStudent[sid];
        if ((exp.items[item.id]?.count ?? 0) === 0) gapStudents++;
      });
      if (gapStudents === 0) return; // no benefit
      recommendations.push({
        item, section,
        gapStudents,
        totalBooked: bookedStudentIds.length,
        pct: gapStudents / bookedStudentIds.length
      });
    });
  });

  recommendations.sort((a, b) => b.gapStudents - a.gapStudents || a.section.order - b.section.order);
  return {
    bookedCount: bookedStudentIds.length,
    recommendations: recommendations.slice(0, limit)
  };
}

function computeRecentlyCovered(studentId, sportId, limit = 5) {
  const exposure = computeExposureMap(studentId, sportId);
  return Object.values(exposure.items)
    .filter(x => x.count > 0)
    .sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''))
    .slice(0, limit)
    .map(x => ({
      item: DB.item(x.itemId),
      section: DB.section(DB.item(x.itemId).sectionId),
      count: x.count,
      lastSeenAt: x.lastSeenAt
    }));
}

// ---------- Date helpers -----------------------------------------------------

function timeAgo(iso) {
  if (!iso) return t(UI.labels.never);
  const ms = CONFIG.today - new Date(iso);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return '<1 ' + t(UI.labels.daysShort);
  if (days < 60) return days + ' ' + t(UI.labels.daysAgo);
  const months = Math.floor(days / 30);
  return months + ' ' + t(UI.labels.monthsAgo);
}

function durationAtLevel(iso) {
  if (!iso) return '—';
  const ms = CONFIG.today - new Date(iso);
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
  return months + ' ' + t(UI.labels.monthsShort);
}

// Format an ISO date for class displays. Examples:
//   "Mon, May 11 · 19:00" (en) / "Seg, 11 Mai · 19:00" (pt)
function formatClassTime(iso) {
  const d = new Date(iso);
  const locale = CURRENT_LOCALE === 'pt' ? 'pt-PT' : 'en-US';
  const date = d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

function formatDayBucket(iso) {
  const d = new Date(iso);
  const today = new Date(CONFIG.today); today.setHours(0,0,0,0);
  const day = new Date(d); day.setHours(0,0,0,0);
  const diffDays = Math.round((day - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t(UI.labels.today);
  if (diffDays > 0 && diffDays <= 7) return t(UI.labels.upcoming);
  if (diffDays > 7) return t({ en: 'Later', pt: 'Mais tarde' });
  return t(UI.labels.recent);
}

// ---------- Equipment --------------------------------------------------------
// Academy-owned gear: loaner gis, shared training equipment, supplies.

const EQUIPMENT = [
  // Loaner Gis — multiple sizes
  { id: 'eq-gi-a1',  category: 'Loaner Gi', name: 'Gi A1 (XS)',       qty: 2, condition: 'good',  notes: '' },
  { id: 'eq-gi-a2',  category: 'Loaner Gi', name: 'Gi A2 (S)',        qty: 3, condition: 'good',  notes: '' },
  { id: 'eq-gi-a3',  category: 'Loaner Gi', name: 'Gi A3 (M)',        qty: 4, condition: 'good',  notes: '' },
  { id: 'eq-gi-a4',  category: 'Loaner Gi', name: 'Gi A4 (L)',        qty: 2, condition: 'fair',  notes: 'Two sets need re-stitching on collar' },
  { id: 'eq-gi-a5',  category: 'Loaner Gi', name: 'Gi A5 (XL)',       qty: 1, condition: 'good',  notes: '' },
  // Rash guards
  { id: 'eq-rg-s',   category: 'Rash Guard', name: 'Rash Guard S',    qty: 2, condition: 'good',  notes: '' },
  { id: 'eq-rg-m',   category: 'Rash Guard', name: 'Rash Guard M',    qty: 3, condition: 'good',  notes: '' },
  { id: 'eq-rg-l',   category: 'Rash Guard', name: 'Rash Guard L',    qty: 2, condition: 'fair',  notes: '' },
  // Training gear
  { id: 'eq-dummy',  category: 'Training Gear', name: 'Grappling Dummy', qty: 1, condition: 'good', notes: 'For solo drilling' },
  { id: 'eq-pads',   category: 'Training Gear', name: 'Focus Mitts (pair)', qty: 4, condition: 'good', notes: '' },
  { id: 'eq-shield', category: 'Training Gear', name: 'Body Shield',   qty: 2, condition: 'fair',  notes: 'One has minor tear on handle' },
  // Mats / facility
  { id: 'eq-mat1',   category: 'Mat',        name: 'Roll-out mat section (2×1m)', qty: 20, condition: 'good', notes: '' },
  { id: 'eq-mat2',   category: 'Mat',        name: 'Crash pad',       qty: 2, condition: 'good',  notes: '' },
  // Supplies
  { id: 'eq-tape',   category: 'Supplies',   name: 'Athletic tape (rolls)', qty: 8, condition: 'new', notes: 'Restocked 2026-05-01' },
  { id: 'eq-mg',     category: 'Supplies',   name: 'Mouth guard (sealed)', qty: 5, condition: 'new', notes: '' },
];

// Tracks current loans of loaner gear to students
const EQUIPMENT_LOANS = [
  { id: 'loan-1', equipmentId: 'eq-gi-a2', studentId: 's-4', borrowedAt: '2026-04-20', returnedAt: null, notes: 'Trial class loan' },
  { id: 'loan-2', equipmentId: 'eq-gi-a3', studentId: 's-1', borrowedAt: '2026-05-01', returnedAt: null, notes: '' },
  { id: 'loan-3', equipmentId: 'eq-rg-m',  studentId: 's-3', borrowedAt: '2026-05-05', returnedAt: null, notes: '' },
];

// ---------- Class Packages / Punch Cards -------------------------------------
// Package types define the products the academy sells.
// Student packages are purchases (instances of a type for a specific student).

const CLASS_PACKAGE_TYPE_SEEDS = [
  { id: 'pkg-drop', name: 'Drop-in',      classCount:  1, price: 15,  validityDays:  7, active: true },
  { id: 'pkg-5',    name: 'Starter Pack', classCount:  5, price: 40,  validityDays: 30, active: true },
  { id: 'pkg-10',   name: '10-Class Pack',classCount: 10, price: 75,  validityDays: 60, active: true },
  { id: 'pkg-20',   name: '20-Class Pack',classCount: 20, price: 130, validityDays: 90, active: true },
];

const STUDENT_PACKAGE_SEEDS = [
  // s-1 João: has an active 10-class pack (bought mid-April, 4 used)
  { id: 'sp-1', studentId: 's-1', packageTypeId: 'pkg-10', purchasedAt: '2026-04-15', expiresAt: '2026-06-14', classesUsed: 4, notes: '' },
  // s-3 Miguel: active 20-class pack (bought May 1, 6 used)
  { id: 'sp-2', studentId: 's-3', packageTypeId: 'pkg-20', purchasedAt: '2026-05-01', expiresAt: '2026-07-30', classesUsed: 6, notes: '' },
  // s-4 Sofia: expired starter pack (fully used), plus a fresh drop-in
  { id: 'sp-3', studentId: 's-4', packageTypeId: 'pkg-5',  purchasedAt: '2026-04-01', expiresAt: '2026-05-01', classesUsed: 5, notes: '' },
  { id: 'sp-4', studentId: 's-4', packageTypeId: 'pkg-drop',purchasedAt:'2026-05-10', expiresAt: '2026-05-17', classesUsed: 0, notes: '' },
];
