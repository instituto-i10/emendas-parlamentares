# -*- coding: utf-8 -*-
"""Parser do Anexo V da LDO 2027 (relatório PLR00547) a partir do OCR.

Estratégia de confiança: o relatório imprime TOTAL DO PROGRAMA e TOTAL DO
ORGÃO. Cada bloco só é aceito se a soma das ações bater com o total impresso.
O que não bater é listado para conferência manual na imagem da página.
"""
import re, json, io, sys, unicodedata

CAMINHO = sys.argv[1] if len(sys.argv) > 1 else "ocr/ldo.txt"

def norm(s):
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).upper()

def valor(txt):
    """'1,359.794,00' / '10.270.00' -> Decimal em centavos. Sempre 2 casas."""
    d = re.sub(r"\D", "", txt)
    if not d:
        return None
    return int(d)  # centavos

def cod_num(s):
    """Corrige O->0, l/I->1, S->5 em códigos numéricos."""
    return s.translate(str.maketrans("OolIiSs", "0011155"))

linhas = io.open(CAMINHO, encoding="utf-8", errors="replace").read().split("\n")

RE_PAG   = re.compile(r"^@@@PAGINA (\d+)")
RE_INST  = re.compile(r"^Institui[çc][ãa]o\s*:?\s*\|?\s*(\d+)\s+(.+)$", re.I)
RE_ORGAO = re.compile(r"^[ÓO]rg[ãa]o\s*Resp\.?\s*:?\s*\|?\s*([0-9OoIl]{1,3})\s+(.+)$", re.I)
RE_UNID  = re.compile(r"^Unidade\s*Resp\.?\s*:?\s*\|?\s*([0-9OoIl]{1,3})\s+(.+)$", re.I)
RE_PROG  = re.compile(r"^Programa\s*:?\s*\|?\s*([0-9OoIl]{4})\s+(.+)$", re.I)
RE_ACAO  = re.compile(r"^([0-9OoIl]{4})\s*\|\s*(.+)$")
RE_TOTP  = re.compile(r"TOTAL DO PROGRAMA\s*:?\s*\|?\s*([\d.,]+)", re.I)
RE_TOTO  = re.compile(r"TOTAL DO ORG[ÃA]O\s*:?\s*\|?\s*([\d.,]+)", re.I)

blocos, atual = [], None
pag = None
inst = None
ctx = {"orgao": None, "unidade": None}
dentro_anexo5 = False

def fechar():
    global atual
    if atual and atual["acoes"]:
        blocos.append(atual)
    atual = None

for ln in linhas:
    ln = ln.strip()
    m = RE_PAG.match(ln)
    if m:
        pag = int(m.group(1)); continue
    if "ANEXO V" in norm(ln) and "PROGRAMAS GOVERNAMENTAIS" in norm(ln):
        dentro_anexo5 = True; continue
    if not dentro_anexo5:
        continue

    m = RE_INST.match(ln)
    if m:
        inst = (cod_num(m.group(1)), m.group(2).strip()); continue
    m = RE_ORGAO.match(ln)
    if m:
        fechar()
        ctx["orgao"] = (cod_num(m.group(1)).zfill(2), m.group(2).strip().rstrip("|").strip())
        continue
    m = RE_UNID.match(ln)
    if m:
        ctx["unidade"] = (cod_num(m.group(1)), m.group(2).strip().rstrip("|").strip())
        continue
    m = RE_PROG.match(ln)
    if m:
        fechar()
        atual = {
            "pagina": pag,
            "instituicao": inst,
            "orgao": ctx["orgao"],
            "unidade": ctx["unidade"],
            "programa": (cod_num(m.group(1)), m.group(2).strip().rstrip("|").strip()),
            "acoes": [], "total_impresso": None,
        }
        continue

    m = RE_TOTP.search(ln)
    if m and atual:
        atual["total_impresso"] = valor(m.group(1)); fechar(); continue
    if RE_TOTO.search(ln):
        continue

    m = RE_ACAO.match(ln)
    if m and atual is not None:
        partes = [p.strip() for p in ln.split("|")]
        # último campo com vírgula/ponto e 2 decimais = custo estimado
        custo = None
        for p in reversed(partes):
            if re.fullmatch(r"[\d][\d.,]*[.,]\d{2}", p):
                custo = valor(p); break
        if custo is None:
            continue
        nome = partes[1] if len(partes) > 1 else ""
        meta = None
        idx = [i for i, p in enumerate(partes) if re.fullmatch(r"[\d][\d.,]*[.,]\d{2}", p)]
        if idx and idx[0] > 0 and re.fullmatch(r"[\d.]+", partes[idx[0]-1] or ""):
            meta = partes[idx[0]-1]
        orgexec = None
        for p in partes[2:]:
            if re.fullmatch(r"\d{1,2}[.,]\d{2}", p):
                orgexec = p.replace(",", "."); break
        atual["acoes"].append({
            "codigo": cod_num(m.group(1)), "nome": nome,
            "orgaoExecutor": orgexec, "metaFisica": meta, "custoCentavos": custo,
        })

fechar()

ok, ruim = [], []
for b in blocos:
    soma = sum(a["custoCentavos"] for a in b["acoes"])
    b["soma_acoes"] = soma
    if b["total_impresso"] is not None and soma == b["total_impresso"]:
        ok.append(b)
    else:
        ruim.append(b)

print(f"blocos programa/órgão encontrados : {len(blocos)}")
print(f"  checksum OK                     : {len(ok)}")
print(f"  checksum divergente             : {len(ruim)}")
print(f"ações totais                      : {sum(len(b['acoes']) for b in blocos)}")
tot = sum(b["soma_acoes"] for b in blocos)
print(f"soma geral (todas as ações)       : R$ {tot/100:,.2f}")
if ruim:
    print("\npáginas a conferir na imagem:")
    for b in ruim:
        ti = b["total_impresso"]
        print(f"  pág {b['pagina']:>3}  prog {b['programa'][0]}  "
              f"soma={b['soma_acoes']/100:>15,.2f}  impresso="
              f"{(ti/100 if ti is not None else float('nan')):>15,.2f}  "
              f"({len(b['acoes'])} ações)")

json.dump(blocos, io.open("ocr/anexo5.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
