import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
// Base de dotações com VOLUME REALISTA — para avaliar a interface no tamanho
// em que ela realmente vai operar.
//
// O seed oficial cria 20 dotações. Uma LOA de município médio (150–300 mil
// habitantes) tem alguns milhares. Nesse tamanho a cascata de seleção da Nova
// Emenda — cinco <select> nativos encadeados, sem busca — deixa de ser
// utilizável, que é o risco B2 do documento 07. Sem esta base o problema fica
// invisível.
//
// A classificação segue os padrões reais: funções e subfunções da Portaria
// MOG 42/1999, naturezas da despesa da Portaria STN/SOF 163/2001 e o novo
// padrão de fontes de recurso (Portaria STN 710/2021, adotado em SP a partir
// de 2023).
//
// Acrescenta à base existente — não apaga as dotações que já têm emendas
// vinculadas. Também popula o PPA do exercício, para que a checagem
// PROGRAMA_NO_PPA do motor passe a ter significado.
//
// Uso:  npx tsx prisma/seed-volume.ts
// ============================================================================

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.Emendas_POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Defina DATABASE_URL/DIRECT_URL no .env antes de rodar.");
  process.exit(1);
}
// Guard: por padrão recusa banco remoto, para ninguém semear produção sem
// querer. Para popular a demonstração hospedada (Vercel/Neon) de propósito:
//   PERMITIR_BANCO_REMOTO=1 npm run db:deploy
if (/neon\.tech|vercel/.test(url) && process.env.PERMITIR_BANCO_REMOTO !== "1") {
  console.error(
    "Recusando rodar: a connection string parece ser de um banco remoto.\n" +
    "Se a intenção é semear a demonstração hospedada, repita com " +
    "PERMITIR_BANCO_REMOTO=1.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const ANO = 2026;

// ---------------------------------------------------------------------------
// Classificação funcional (Portaria MOG 42/1999) — as funções e subfunções que
// um município de fato executa.
// ---------------------------------------------------------------------------

const FUNCOES: { codigo: string; nome: string; subs: { codigo: string; nome: string }[] }[] = [
  { codigo: "01", nome: "Legislativa", subs: [
    { codigo: "031", nome: "Ação Legislativa" },
    { codigo: "032", nome: "Controle Externo" },
  ]},
  { codigo: "04", nome: "Administração", subs: [
    { codigo: "121", nome: "Planejamento e Orçamento" },
    { codigo: "122", nome: "Administração Geral" },
    { codigo: "123", nome: "Administração Financeira" },
    { codigo: "126", nome: "Tecnologia da Informação" },
    { codigo: "131", nome: "Comunicação Social" },
  ]},
  { codigo: "06", nome: "Segurança Pública", subs: [
    { codigo: "181", nome: "Policiamento" },
    { codigo: "182", nome: "Defesa Civil" },
  ]},
  { codigo: "08", nome: "Assistência Social", subs: [
    { codigo: "241", nome: "Assistência ao Idoso" },
    { codigo: "242", nome: "Assistência ao Portador de Deficiência" },
    { codigo: "243", nome: "Assistência à Criança e ao Adolescente" },
    { codigo: "244", nome: "Assistência Comunitária" },
  ]},
  { codigo: "09", nome: "Previdência Social", subs: [
    { codigo: "272", nome: "Previdência do Regime Estatutário" },
  ]},
  { codigo: "10", nome: "Saúde", subs: [
    { codigo: "301", nome: "Atenção Básica" },
    { codigo: "302", nome: "Assistência Hospitalar e Ambulatorial" },
    { codigo: "303", nome: "Suporte Profilático e Terapêutico" },
    { codigo: "304", nome: "Vigilância Sanitária" },
    { codigo: "305", nome: "Vigilância Epidemiológica" },
  ]},
  { codigo: "12", nome: "Educação", subs: [
    { codigo: "306", nome: "Alimentação e Nutrição" },
    { codigo: "361", nome: "Ensino Fundamental" },
    { codigo: "362", nome: "Ensino Médio" },
    { codigo: "365", nome: "Educação Infantil" },
    { codigo: "366", nome: "Educação de Jovens e Adultos" },
    { codigo: "367", nome: "Educação Especial" },
  ]},
  { codigo: "13", nome: "Cultura", subs: [
    { codigo: "392", nome: "Difusão Cultural" },
  ]},
  { codigo: "15", nome: "Urbanismo", subs: [
    { codigo: "451", nome: "Infra-estrutura Urbana" },
    { codigo: "452", nome: "Serviços Urbanos" },
    { codigo: "453", nome: "Transportes Coletivos Urbanos" },
  ]},
  { codigo: "16", nome: "Habitação", subs: [
    { codigo: "482", nome: "Habitação Urbana" },
  ]},
  { codigo: "17", nome: "Saneamento", subs: [
    { codigo: "511", nome: "Saneamento Básico Rural" },
    { codigo: "512", nome: "Saneamento Básico Urbano" },
  ]},
  { codigo: "18", nome: "Gestão Ambiental", subs: [
    { codigo: "541", nome: "Preservação e Conservação Ambiental" },
    { codigo: "542", nome: "Controle Ambiental" },
  ]},
  { codigo: "20", nome: "Agricultura", subs: [
    { codigo: "601", nome: "Promoção da Produção Vegetal" },
    { codigo: "606", nome: "Extensão Rural" },
  ]},
  { codigo: "23", nome: "Comércio e Serviços", subs: [
    { codigo: "695", nome: "Turismo" },
  ]},
  { codigo: "26", nome: "Transporte", subs: [
    { codigo: "782", nome: "Transporte Rodoviário" },
  ]},
  { codigo: "27", nome: "Desporto e Lazer", subs: [
    { codigo: "812", nome: "Desporto Comunitário" },
    { codigo: "813", nome: "Lazer" },
  ]},
  { codigo: "28", nome: "Encargos Especiais", subs: [
    { codigo: "843", nome: "Serviço da Dívida Interna" },
    { codigo: "846", nome: "Outros Encargos Especiais" },
  ]},
];

// ---------------------------------------------------------------------------
// Estrutura administrativa. Os órgãos 02, 08 e 10 mantêm os nomes do seed
// oficial para não conflitar com as dotações que já têm emendas.
// ---------------------------------------------------------------------------

type OrgaoDef = {
  codigo: string;
  nome: string;
  uos: { codigo: string; nome: string }[];
  // Áreas (função) em que este órgão executa despesa.
  funcoes: string[];
};

const ORGAOS: OrgaoDef[] = [
  { codigo: "01", nome: "Câmara Municipal", funcoes: ["01"], uos: [
    { codigo: "01.01", nome: "Câmara Municipal" },
  ]},
  { codigo: "02", nome: "Governo Municipal", funcoes: ["04", "13", "23"], uos: [
    { codigo: "02.01", nome: "Gabinete do Prefeito" },
    { codigo: "02.02", nome: "Procuradoria Geral do Município" },
    { codigo: "02.03", nome: "Controladoria Geral" },
  ]},
  { codigo: "03", nome: "Secretaria de Administração", funcoes: ["04"], uos: [
    { codigo: "03.01", nome: "Departamento de Recursos Humanos" },
    { codigo: "03.02", nome: "Departamento de Compras e Licitações" },
    { codigo: "03.03", nome: "Departamento de Tecnologia da Informação" },
  ]},
  { codigo: "04", nome: "Secretaria de Finanças", funcoes: ["04", "28"], uos: [
    { codigo: "04.01", nome: "Departamento de Contabilidade" },
    { codigo: "04.02", nome: "Departamento de Tributos" },
  ]},
  { codigo: "05", nome: "Secretaria de Planejamento", funcoes: ["04", "15"], uos: [
    { codigo: "05.01", nome: "Departamento de Planejamento Urbano" },
  ]},
  { codigo: "06", nome: "Secretaria de Segurança e Trânsito", funcoes: ["06", "15"], uos: [
    { codigo: "06.01", nome: "Guarda Civil Municipal" },
    { codigo: "06.02", nome: "Departamento de Trânsito" },
    { codigo: "06.03", nome: "Coordenadoria de Defesa Civil" },
  ]},
  { codigo: "07", nome: "Secretaria de Assistência Social", funcoes: ["08"], uos: [
    { codigo: "07.01", nome: "Fundo Municipal de Assistência Social" },
    { codigo: "07.02", nome: "Fundo Municipal da Criança e do Adolescente" },
    { codigo: "07.03", nome: "Fundo Municipal do Idoso" },
  ]},
  { codigo: "08", nome: "Secretaria de Educação", funcoes: ["12"], uos: [
    { codigo: "08.01", nome: "Departamento de Educação" },
    { codigo: "08.02", nome: "FUNDEB" },
    { codigo: "08.03", nome: "Departamento de Alimentação Escolar" },
    { codigo: "08.04", nome: "Departamento de Transporte Escolar" },
  ]},
  { codigo: "09", nome: "Secretaria de Cultura", funcoes: ["13"], uos: [
    { codigo: "09.01", nome: "Departamento de Cultura" },
    { codigo: "09.02", nome: "Fundo Municipal de Cultura" },
  ]},
  { codigo: "10", nome: "Secretaria de Saúde", funcoes: ["10"], uos: [
    { codigo: "10.01", nome: "Fundo Municipal de Saúde" },
    { codigo: "10.02", nome: "Departamento de Atenção Especializada" },
    { codigo: "10.03", nome: "Departamento de Vigilância em Saúde" },
  ]},
  { codigo: "11", nome: "Secretaria de Obras e Serviços", funcoes: ["15", "16", "17", "26"], uos: [
    { codigo: "11.01", nome: "Departamento de Obras" },
    { codigo: "11.02", nome: "Departamento de Serviços Urbanos" },
    { codigo: "11.03", nome: "Departamento de Estradas Municipais" },
  ]},
  { codigo: "12", nome: "Secretaria de Meio Ambiente", funcoes: ["18", "17"], uos: [
    { codigo: "12.01", nome: "Departamento de Meio Ambiente" },
    { codigo: "12.02", nome: "Fundo Municipal de Meio Ambiente" },
  ]},
  { codigo: "13", nome: "Secretaria de Agricultura e Abastecimento", funcoes: ["20"], uos: [
    { codigo: "13.01", nome: "Departamento de Agricultura" },
  ]},
  { codigo: "14", nome: "Secretaria de Esportes e Lazer", funcoes: ["27"], uos: [
    { codigo: "14.01", nome: "Departamento de Esportes" },
  ]},
  { codigo: "15", nome: "Instituto de Previdência dos Servidores", funcoes: ["09"], uos: [
    { codigo: "15.01", nome: "Regime Próprio de Previdência Social" },
  ]},
];

// ---------------------------------------------------------------------------
// Programas por função. Os códigos 0001, 0010, 0012, 0013 e 0099 são os do
// seed oficial e ficam preservados.
// ---------------------------------------------------------------------------

const PROGRAMAS: { codigo: string; nome: string; funcao: string }[] = [
  { codigo: "0001", nome: "Gestão Administrativa", funcao: "04" },
  { codigo: "0002", nome: "Modernização da Gestão Pública", funcao: "04" },
  { codigo: "0003", nome: "Gestão Fiscal Responsável", funcao: "04" },
  { codigo: "0004", nome: "Governo Aberto e Transparência", funcao: "04" },
  { codigo: "0005", nome: "Processo Legislativo", funcao: "01" },
  { codigo: "0006", nome: "Município Mais Seguro", funcao: "06" },
  { codigo: "0007", nome: "Trânsito Seguro e Mobilidade", funcao: "15" },
  { codigo: "0008", nome: "Proteção Social Básica", funcao: "08" },
  { codigo: "0009", nome: "Proteção Social Especial", funcao: "08" },
  { codigo: "0010", nome: "Saúde da Família", funcao: "10" },
  { codigo: "0011", nome: "Atenção Especializada e Hospitalar", funcao: "10" },
  { codigo: "0012", nome: "Educação para Todos", funcao: "12" },
  { codigo: "0013", nome: "Primeira Infância", funcao: "12" },
  { codigo: "0014", nome: "Assistência Farmacêutica", funcao: "10" },
  { codigo: "0015", nome: "Vigilância em Saúde", funcao: "10" },
  { codigo: "0016", nome: "Educação Inclusiva", funcao: "12" },
  { codigo: "0017", nome: "Alimentação Escolar Saudável", funcao: "12" },
  { codigo: "0018", nome: "Transporte Escolar", funcao: "12" },
  { codigo: "0019", nome: "Cultura Viva", funcao: "13" },
  { codigo: "0020", nome: "Patrimônio Histórico e Memória", funcao: "13" },
  { codigo: "0021", nome: "Cidade Iluminada e Limpa", funcao: "15" },
  { codigo: "0022", nome: "Infraestrutura Urbana", funcao: "15" },
  { codigo: "0023", nome: "Mobilidade Urbana", funcao: "15" },
  { codigo: "0024", nome: "Habitação de Interesse Social", funcao: "16" },
  { codigo: "0025", nome: "Saneamento para Todos", funcao: "17" },
  { codigo: "0026", nome: "Município Sustentável", funcao: "18" },
  { codigo: "0027", nome: "Arborização e Áreas Verdes", funcao: "18" },
  { codigo: "0028", nome: "Apoio ao Produtor Rural", funcao: "20" },
  { codigo: "0029", nome: "Estradas Rurais Trafegáveis", funcao: "26" },
  { codigo: "0030", nome: "Esporte para Todas as Idades", funcao: "27" },
  { codigo: "0031", nome: "Lazer nos Bairros", funcao: "27" },
  { codigo: "0032", nome: "Turismo e Desenvolvimento Local", funcao: "23" },
  { codigo: "0033", nome: "Defesa Civil Preventiva", funcao: "06" },
  { codigo: "0034", nome: "Previdência dos Servidores", funcao: "09" },
  { codigo: "0035", nome: "Enfrentamento à Violência Doméstica", funcao: "08" },
  { codigo: "0036", nome: "Saúde Bucal", funcao: "10" },
  { codigo: "0037", nome: "Educação de Jovens e Adultos", funcao: "12" },
  { codigo: "0038", nome: "Qualificação Profissional", funcao: "12" },
  { codigo: "0099", nome: "Encargos Gerais", funcao: "28" },
];

// Verbos e complementos para compor nomes de ação plausíveis por espécie.
const ACOES_ATIVIDADE = [
  "Manutenção", "Operacionalização", "Gestão", "Apoio", "Coordenação",
  "Custeio", "Funcionamento", "Fortalecimento",
];
const ACOES_PROJETO = [
  "Construção", "Ampliação", "Reforma", "Aquisição de equipamentos",
  "Implantação", "Modernização", "Revitalização",
];
const COMPLEMENTOS: Record<string, string[]> = {
  "01": ["da Ação Legislativa", "das Comissões Permanentes", "da Escola do Legislativo"],
  "04": ["da Administração Geral", "dos Serviços de Tecnologia", "da Gestão de Pessoas", "da Comunicação Institucional", "do Planejamento Municipal", "da Arrecadação Tributária"],
  "06": ["da Guarda Civil Municipal", "do Sistema de Videomonitoramento", "da Defesa Civil", "da Sinalização Viária"],
  "08": ["dos CRAS", "do CREAS", "dos Serviços de Convivência", "do Programa de Transferência de Renda", "do Centro de Referência da Mulher", "do Abrigo Institucional"],
  "09": ["do Regime Próprio de Previdência", "dos Benefícios Previdenciários"],
  "10": ["das Unidades Básicas de Saúde", "do Pronto Atendimento", "das Equipes de Saúde da Família", "da Assistência Farmacêutica", "da Vigilância Sanitária", "do Centro de Especialidades Odontológicas", "do SAMU", "da Vigilância Epidemiológica"],
  "12": ["do Ensino Fundamental", "da Educação Infantil", "do Transporte Escolar", "da Alimentação Escolar", "da Educação Especial", "da Educação de Jovens e Adultos", "das Escolas de Tempo Integral"],
  "13": ["da Biblioteca Municipal", "do Teatro Municipal", "das Oficinas Culturais", "do Patrimônio Histórico"],
  "15": ["da Iluminação Pública", "da Limpeza Urbana", "das Vias Públicas", "das Praças e Jardins", "do Transporte Coletivo", "da Coleta Seletiva"],
  "16": ["das Unidades Habitacionais", "da Regularização Fundiária"],
  "17": ["da Rede de Esgoto", "do Abastecimento de Água Rural", "da Drenagem Urbana"],
  "18": ["do Viveiro Municipal", "da Educação Ambiental", "do Licenciamento Ambiental", "das Áreas de Preservação"],
  "20": ["da Patrulha Agrícola", "da Assistência Técnica Rural", "da Feira do Produtor"],
  "23": ["do Centro de Atendimento ao Turista", "dos Eventos Turísticos"],
  "26": ["das Estradas Vicinais", "das Pontes e Bueiros Rurais"],
  "27": ["do Ginásio Municipal", "dos Núcleos Esportivos", "dos Jogos Escolares", "das Academias ao Ar Livre"],
  "28": ["do Serviço da Dívida", "dos Precatórios", "das Sentenças Judiciais"],
};

// ---------------------------------------------------------------------------
// Naturezas da despesa (Portaria STN/SOF 163/2001) e fontes de recurso no
// padrão vigente (Portaria STN 710/2021).
// ---------------------------------------------------------------------------

const NATUREZAS: { codigo: string; cat: string; grupo: string; mod: string; elem: string }[] = [
  { codigo: "3.1.90.04", cat: "3", grupo: "1", mod: "90", elem: "04" },
  { codigo: "3.1.90.11", cat: "3", grupo: "1", mod: "90", elem: "11" },
  { codigo: "3.1.90.13", cat: "3", grupo: "1", mod: "90", elem: "13" },
  { codigo: "3.1.90.16", cat: "3", grupo: "1", mod: "90", elem: "16" },
  { codigo: "3.1.91.13", cat: "3", grupo: "1", mod: "91", elem: "13" },
  { codigo: "3.3.90.14", cat: "3", grupo: "3", mod: "90", elem: "14" },
  { codigo: "3.3.90.30", cat: "3", grupo: "3", mod: "90", elem: "30" },
  { codigo: "3.3.90.32", cat: "3", grupo: "3", mod: "90", elem: "32" },
  { codigo: "3.3.90.33", cat: "3", grupo: "3", mod: "90", elem: "33" },
  { codigo: "3.3.90.35", cat: "3", grupo: "3", mod: "90", elem: "35" },
  { codigo: "3.3.90.36", cat: "3", grupo: "3", mod: "90", elem: "36" },
  { codigo: "3.3.90.37", cat: "3", grupo: "3", mod: "90", elem: "37" },
  { codigo: "3.3.90.39", cat: "3", grupo: "3", mod: "90", elem: "39" },
  { codigo: "3.3.90.40", cat: "3", grupo: "3", mod: "90", elem: "40" },
  { codigo: "3.3.90.46", cat: "3", grupo: "3", mod: "90", elem: "46" },
  { codigo: "3.3.90.47", cat: "3", grupo: "3", mod: "90", elem: "47" },
  { codigo: "3.3.90.48", cat: "3", grupo: "3", mod: "90", elem: "48" },
  { codigo: "3.3.90.49", cat: "3", grupo: "3", mod: "90", elem: "49" },
  { codigo: "3.3.50.43", cat: "3", grupo: "3", mod: "50", elem: "43" },
  { codigo: "3.3.50.39", cat: "3", grupo: "3", mod: "50", elem: "39" },
  { codigo: "3.3.71.70", cat: "3", grupo: "3", mod: "71", elem: "70" },
  { codigo: "3.3.90.93", cat: "3", grupo: "3", mod: "90", elem: "93" },
  { codigo: "3.2.90.21", cat: "3", grupo: "2", mod: "90", elem: "21" },
  { codigo: "4.4.90.51", cat: "4", grupo: "4", mod: "90", elem: "51" },
  { codigo: "4.4.90.52", cat: "4", grupo: "4", mod: "90", elem: "52" },
  { codigo: "4.4.90.61", cat: "4", grupo: "4", mod: "90", elem: "61" },
  { codigo: "4.4.50.42", cat: "4", grupo: "4", mod: "50", elem: "42" },
  { codigo: "4.6.90.71", cat: "4", grupo: "6", mod: "90", elem: "71" },
];

const FONTES: { codigo: string; nome: string }[] = [
  { codigo: "500", nome: "Recursos não Vinculados de Impostos" },
  { codigo: "501", nome: "Outros Recursos não Vinculados" },
  { codigo: "540", nome: "Transferências do FUNDEB — Impostos" },
  { codigo: "541", nome: "Transferências do FUNDEB — Complementação VAAF" },
  { codigo: "542", nome: "Transferências do FUNDEB — Complementação VAAT" },
  { codigo: "550", nome: "Transferências do Salário-Educação" },
  { codigo: "551", nome: "Transferências do FNDE" },
  { codigo: "552", nome: "Transferências do FNAS" },
  { codigo: "553", nome: "Transferências do Fundo Nacional de Saúde" },
  { codigo: "569", nome: "Outras Transferências de Convênios da União" },
  { codigo: "600", nome: "Transferências e Convênios" },
  { codigo: "621", nome: "Transferências do QESE — Estado" },
  { codigo: "660", nome: "Transferências de Convênios do Estado" },
  { codigo: "700", nome: "Operações de Crédito" },
  { codigo: "751", nome: "Recursos de Alienação de Bens" },
  { codigo: "759", nome: "Outros Recursos Vinculados" },
];

// Fontes plausíveis por função — evita combinações absurdas (FUNDEB fora da
// educação, por exemplo).
const FONTES_POR_FUNCAO: Record<string, string[]> = {
  "01": ["500", "501"],
  "04": ["500", "501", "751"],
  "06": ["500", "501", "660", "700"],
  "08": ["500", "501", "552", "660", "569"],
  "09": ["500", "759"],
  "10": ["500", "501", "553", "660", "569", "700"],
  "12": ["500", "540", "541", "542", "550", "551", "621", "660"],
  "13": ["500", "501", "660"],
  "15": ["500", "501", "700", "751", "660"],
  "16": ["500", "569", "700"],
  "17": ["500", "660", "700", "759"],
  "18": ["500", "759", "660"],
  "20": ["500", "660", "569"],
  "23": ["500", "660"],
  "26": ["500", "660", "700"],
  "27": ["500", "501", "660"],
  "28": ["500", "501"],
};

// Naturezas plausíveis por espécie de ação.
const NAT_ATIVIDADE = [
  "3.1.90.04", "3.1.90.11", "3.1.90.13", "3.1.90.16", "3.1.91.13",
  "3.3.90.14", "3.3.90.30", "3.3.90.32", "3.3.90.33", "3.3.90.35",
  "3.3.90.36", "3.3.90.37", "3.3.90.39", "3.3.90.46", "3.3.90.47",
  "3.3.90.48", "3.3.90.49", "3.3.50.43", "3.3.50.39",
];
const NAT_PROJETO = ["4.4.90.51", "4.4.90.52", "4.4.90.61", "4.4.50.42", "3.3.90.39", "3.3.90.30"];
const NAT_OPERACAO = ["3.2.90.21", "4.6.90.71", "3.3.90.40", "3.3.71.70", "3.3.90.93" ];

// ---------------------------------------------------------------------------

function rng(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = rng(20250818);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const entre = (min: number, max: number) => min + Math.floor(rand() * (max - min));
// Valores por grupo de despesa, calibrados para que a soma da base fique na
// ordem de R$ 1 bilhão — o orçamento típico de um município de 150–300 mil
// habitantes. Arredondados ao milhar, como numa peça orçamentária real.
function valorPorGrupo(grupo: string): number {
  const faixa: Record<string, [number, number]> = {
    "1": [60_000, 1_800_000],  // pessoal e encargos sociais
    "2": [20_000, 300_000],    // juros e encargos da dívida
    "3": [8_000, 450_000],     // outras despesas correntes
    "4": [30_000, 900_000],    // investimentos
    "6": [40_000, 400_000],    // amortização da dívida
  };
  const [a, b] = faixa[grupo] ?? [20_000, 300_000];
  return Math.round((a + rand() * (b - a)) / 1000) * 1000;
}

async function main() {
  const t0 = Date.now();
  const exercicio = await prisma.exercicio.findUnique({ where: { ano: ANO } });
  if (!exercicio) throw new Error(`Exercício ${ANO} não existe — rode 'npm run seed' antes.`);
  const exercicioId = exercicio.id;

  const base = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId, especie: "PROJETO_LEI", tipo: "LOA" },
  });
  if (!base) throw new Error("Nenhum PROJETO_LEI de LOA no exercício — rode 'npm run seed' antes.");

  console.log(`Base: ${base.numero} · exercício ${ANO}`);

  // ------------------------------------------------------------- componentes
  const funcaoId = new Map<string, string>();
  const subfuncaoId = new Map<string, string>(); // chave: `${funcao}/${sub}`
  for (const f of FUNCOES) {
    const r = await prisma.funcao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: {},
    });
    funcaoId.set(f.codigo, r.id);
    for (const s of f.subs) {
      const rs = await prisma.subfuncao.upsert({
        where: {
          exercicioId_funcaoId_codigo: { exercicioId, funcaoId: r.id, codigo: s.codigo },
        },
        create: { codigo: s.codigo, nome: s.nome, funcaoId: r.id, exercicioId },
        update: {},
      });
      subfuncaoId.set(`${f.codigo}/${s.codigo}`, rs.id);
    }
  }

  const orgaoId = new Map<string, string>();
  const uoId = new Map<string, string>(); // chave: código da UO
  for (const o of ORGAOS) {
    const r = await prisma.orgao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: o.codigo } },
      create: { codigo: o.codigo, nome: o.nome, exercicioId },
      update: {},
    });
    orgaoId.set(o.codigo, r.id);
    for (const u of o.uos) {
      const ru = await prisma.unidadeOrcamentaria.upsert({
        where: {
          exercicioId_orgaoId_codigo: { exercicioId, orgaoId: r.id, codigo: u.codigo },
        },
        create: { codigo: u.codigo, nome: u.nome, orgaoId: r.id, exercicioId },
        update: {},
      });
      uoId.set(u.codigo, ru.id);
    }
  }

  const programaId = new Map<string, string>();
  for (const p of PROGRAMAS) {
    const r = await prisma.programa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: p.codigo } },
      create: { codigo: p.codigo, nome: p.nome, exercicioId },
      update: {},
    });
    programaId.set(p.codigo, r.id);
  }

  const naturezaId = new Map<string, string>();
  for (const n of NATUREZAS) {
    const r = await prisma.naturezaDespesa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: n.codigo } },
      create: {
        codigo: n.codigo,
        categoriaEconomica: n.cat,
        grupo: n.grupo,
        modalidadeAplicacao: n.mod,
        elemento: n.elem,
        exercicioId,
      },
      update: {},
    });
    naturezaId.set(n.codigo, r.id);
  }

  const fonteId = new Map<string, string>();
  for (const f of FONTES) {
    const r = await prisma.fonteRecurso.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: {},
    });
    fonteId.set(f.codigo, r.id);
  }

  // ------------------------------------------------------------------- ações
  // Cada ação nasce ligada a um programa, a uma UO executora e a um par
  // função/subfunção coerente — como numa LOA de verdade.
  type AcaoGerada = {
    id: string;
    programaCodigo: string;
    orgaoCodigo: string;
    uoCodigo: string;
    funcaoCodigo: string;
    subfuncaoCodigo: string;
    tipo: "PROJETO" | "ATIVIDADE" | "OPERACAO_ESPECIAL";
  };
  const acoesGeradas: AcaoGerada[] = [];

  // Órgãos que executam cada função.
  const orgaosPorFuncao = new Map<string, OrgaoDef[]>();
  for (const o of ORGAOS) {
    for (const fc of o.funcoes) {
      const lista = orgaosPorFuncao.get(fc) ?? [];
      lista.push(o);
      orgaosPorFuncao.set(fc, lista);
    }
  }

  let contadorAtiv = 2000;
  let contadorProj = 1000;
  let contadorOper = 0;

  for (const prog of PROGRAMAS) {
    const fdef = FUNCOES.find((f) => f.codigo === prog.funcao)!;
    const orgaosDaFuncao = orgaosPorFuncao.get(prog.funcao) ?? [ORGAOS[1]];
    const complementos = COMPLEMENTOS[prog.funcao] ?? ["dos Serviços"];

    // Programas maiores (saúde, educação, urbanismo) ganham mais ações.
    const nAcoes = ["10", "12", "15"].includes(prog.funcao) ? entre(8, 14) : entre(4, 9);

    for (let i = 0; i < nAcoes; i++) {
      const org = pick(orgaosDaFuncao);
      const uo = pick(org.uos);
      const sub = pick(fdef.subs);

      // ~60% atividades, ~32% projetos, ~8% operações especiais.
      const sorte = rand();
      const tipo: AcaoGerada["tipo"] =
        prog.funcao === "28" || prog.funcao === "09"
          ? "OPERACAO_ESPECIAL"
          : sorte < 0.6
            ? "ATIVIDADE"
            : sorte < 0.92
              ? "PROJETO"
              : "OPERACAO_ESPECIAL";

      const complemento = pick(complementos);
      let codigo: string;
      let nome: string;
      if (tipo === "ATIVIDADE") {
        codigo = String(++contadorAtiv);
        nome = `${pick(ACOES_ATIVIDADE)} ${complemento}`;
      } else if (tipo === "PROJETO") {
        codigo = String(++contadorProj);
        nome = `${pick(ACOES_PROJETO)} ${complemento}`;
      } else {
        codigo = String(++contadorOper).padStart(4, "0");
        nome = `Encargos ${complemento}`;
      }

      const r = await prisma.acao.upsert({
        where: {
          exercicioId_programaId_codigo: {
            exercicioId,
            programaId: programaId.get(prog.codigo)!,
            codigo,
          },
        },
        create: {
          codigo,
          nome,
          tipo,
          programaId: programaId.get(prog.codigo)!,
          exercicioId,
        },
        update: {},
      });

      acoesGeradas.push({
        id: r.id,
        programaCodigo: prog.codigo,
        orgaoCodigo: org.codigo,
        uoCodigo: uo.codigo,
        funcaoCodigo: prog.funcao,
        subfuncaoCodigo: sub.codigo,
        tipo,
      });
    }
  }

  console.log(`Ações geradas: ${acoesGeradas.length}`);

  // --------------------------------------------------------------- dotações
  // Idempotência: apaga as dotações geradas em execuções anteriores, mas nunca
  // as que têm emenda vinculada (o banco recusaria, e são justamente as do
  // seed oficial que sustentam o dataset de demonstração).
  const removidas = await prisma.dotacao.deleteMany({
    where: {
      instrumentoId: base.id,
      emendas: { none: {} },
      emendasOrigem: { none: {} },
      emendasDestino: { none: {} },
    },
  });
  if (removidas.count > 0) console.log(`Dotações regeradas: ${removidas.count} removidas`);

  // Para cada ação, várias combinações (natureza × fonte) — é assim que uma
  // LOA real chega a milhares de linhas.
  const existentes = await prisma.dotacao.findMany({
    where: { instrumentoId: base.id },
    select: {
      orgaoId: true, unidadeOrcamentariaId: true, funcaoId: true, subfuncaoId: true,
      programaId: true, acaoId: true, naturezaDespesaId: true, fonteRecursoId: true,
    },
  });
  const jaExiste = new Set(
    existentes.map((d) =>
      [d.orgaoId, d.unidadeOrcamentariaId, d.funcaoId, d.subfuncaoId, d.programaId,
       d.acaoId, d.naturezaDespesaId, d.fonteRecursoId].join("|")
    )
  );

  const novas: {
    instrumentoId: string; exercicioId: string; orgaoId: string;
    unidadeOrcamentariaId: string; funcaoId: string; subfuncaoId: string;
    programaId: string; acaoId: string; naturezaDespesaId: string;
    fonteRecursoId: string; valorInicial: number; valorAtual: number;
  }[] = [];

  for (const a of acoesGeradas) {
    const natsDisponiveis =
      a.tipo === "ATIVIDADE" ? NAT_ATIVIDADE : a.tipo === "PROJETO" ? NAT_PROJETO : NAT_OPERACAO;
    const fontesDisponiveis = FONTES_POR_FUNCAO[a.funcaoCodigo] ?? ["500"];

    const nCombos = a.tipo === "ATIVIDADE" ? entre(6, 16) : entre(3, 8);
    const usados = new Set<string>();

    for (let i = 0; i < nCombos; i++) {
      const natCodigo = pick(natsDisponiveis);
      const fonteCodigo = pick(fontesDisponiveis);
      const natId = naturezaId.get(natCodigo);
      const fnId = fonteId.get(fonteCodigo);
      if (!natId || !fnId) continue;

      const combo = `${natCodigo}|${fonteCodigo}`;
      if (usados.has(combo)) continue;
      usados.add(combo);

      const chave = [
        orgaoId.get(a.orgaoCodigo)!, uoId.get(a.uoCodigo)!,
        funcaoId.get(a.funcaoCodigo)!, subfuncaoId.get(`${a.funcaoCodigo}/${a.subfuncaoCodigo}`)!,
        programaId.get(a.programaCodigo)!, a.id, natId, fnId,
      ].join("|");
      if (jaExiste.has(chave)) continue;
      jaExiste.add(chave);

      const grupo = NATUREZAS.find((n) => n.codigo === natCodigo)!.grupo;
      const valor = valorPorGrupo(grupo);

      novas.push({
        instrumentoId: base.id,
        exercicioId,
        orgaoId: orgaoId.get(a.orgaoCodigo)!,
        unidadeOrcamentariaId: uoId.get(a.uoCodigo)!,
        funcaoId: funcaoId.get(a.funcaoCodigo)!,
        subfuncaoId: subfuncaoId.get(`${a.funcaoCodigo}/${a.subfuncaoCodigo}`)!,
        programaId: programaId.get(a.programaCodigo)!,
        acaoId: a.id,
        naturezaDespesaId: natId,
        fonteRecursoId: fnId,
        valorInicial: valor,
        valorAtual: valor,
      });
    }
  }

  // Inserção em lotes — createMany é ordens de grandeza mais rápido que create.
  const LOTE = 500;
  for (let i = 0; i < novas.length; i += LOTE) {
    await prisma.dotacao.createMany({ data: novas.slice(i, i + LOTE), skipDuplicates: true });
  }

  // -------------------------------------------------------------------- PPA
  // Sem PPA cadastrado a checagem PROGRAMA_NO_PPA só emite alerta. Criamos o
  // PPA com uma linha por programa — menos dois, de propósito, para que exista
  // o caso de falha real (emenda em programa fora do PPA).
  const ppa = await prisma.instrumentoPlanejamento.upsert({
    where: { id: "seed-ppa-2026" },
    create: {
      id: "seed-ppa-2026",
      tipo: "PPA",
      especie: "PROJETO_LEI",
      numero: "PL 12/2025",
      ementa: "Institui o Plano Plurianual do Município para o quadriênio 2026-2029.",
      exercicioId,
      status: "VIGENTE",
    },
    update: {},
  });

  const foraDoPPA = new Set(["0038", "0032"]); // qualificação profissional e turismo
  const dotPPA = await prisma.dotacao.count({ where: { instrumentoId: ppa.id } });
  if (dotPPA === 0) {
    const linhasPPA = [];
    for (const prog of PROGRAMAS) {
      if (foraDoPPA.has(prog.codigo)) continue;
      const acao = acoesGeradas.find((a) => a.programaCodigo === prog.codigo);
      if (!acao) continue;
      const nat = NATUREZAS.find((n) => n.codigo === "3.3.90.39")!;
      linhasPPA.push({
        instrumentoId: ppa.id,
        exercicioId,
        orgaoId: orgaoId.get(acao.orgaoCodigo)!,
        unidadeOrcamentariaId: uoId.get(acao.uoCodigo)!,
        funcaoId: funcaoId.get(acao.funcaoCodigo)!,
        subfuncaoId: subfuncaoId.get(`${acao.funcaoCodigo}/${acao.subfuncaoCodigo}`)!,
        programaId: programaId.get(prog.codigo)!,
        acaoId: acao.id,
        naturezaDespesaId: naturezaId.get(nat.codigo)!,
        fonteRecursoId: fonteId.get("500")!,
        valorInicial: 0,
        valorAtual: 0,
      });
    }
    await prisma.dotacao.createMany({ data: linhasPPA, skipDuplicates: true });
  }

  // ------------------------------------------------------ prioridades da LDO
  // Cerca de metade dos programas entra nas prioridades — assim a checagem
  // ADERENCIA_LDO produz uma mistura realista de OK e alerta.
  const jaPrioridades = await prisma.prioridadeLDO.count({ where: { exercicioId } });
  if (jaPrioridades < 10) {
    for (const prog of PROGRAMAS) {
      if (rand() > 0.55) continue;
      const existe = await prisma.prioridadeLDO.findFirst({
        where: { exercicioId, programaId: programaId.get(prog.codigo)!, acaoId: null },
      });
      if (existe) continue;
      await prisma.prioridadeLDO.create({
        data: {
          descricao: `Prioridade da LDO ${ANO}: ${prog.nome}`,
          programaId: programaId.get(prog.codigo)!,
          exercicioId,
        },
      });
    }
  }

  // ------------------------------------------------------------------ resumo
  const [totDot, totAcao, totProg, totOrg, totUo, totFun, totSub, totNat, totFon, totPrio, agg] =
    await Promise.all([
      prisma.dotacao.count({ where: { instrumentoId: base.id } }),
      prisma.acao.count({ where: { exercicioId } }),
      prisma.programa.count({ where: { exercicioId } }),
      prisma.orgao.count({ where: { exercicioId } }),
      prisma.unidadeOrcamentaria.count({ where: { exercicioId } }),
      prisma.funcao.count({ where: { exercicioId } }),
      prisma.subfuncao.count({ where: { exercicioId } }),
      prisma.naturezaDespesa.count({ where: { exercicioId } }),
      prisma.fonteRecurso.count({ where: { exercicioId } }),
      prisma.prioridadeLDO.count({ where: { exercicioId } }),
      prisma.dotacao.aggregate({ _sum: { valorInicial: true }, where: { instrumentoId: base.id } }),
    ]);

  console.log("\nBase de dotações com volume realista:");
  console.table({
    orgaos: totOrg,
    unidades: totUo,
    funcoes: totFun,
    subfuncoes: totSub,
    programas: totProg,
    acoes: totAcao,
    naturezas: totNat,
    fontes: totFon,
    dotacoes: totDot,
    prioridadesLDO: totPrio,
    orcamentoTotal: Number(agg._sum.valorInicial ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }),
  });
  console.log(`PPA cadastrado: ${PROGRAMAS.length - foraDoPPA.size} programas`);
  console.log(`(${[...foraDoPPA].join(", ")} ficaram FORA do PPA de propósito)`);
  console.log(`Tempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
