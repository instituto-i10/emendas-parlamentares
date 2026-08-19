# -*- coding: utf-8 -*-
"""Parser dos demonstrativos de funções/subfunções/programas/ações (PLR00342).

Dois relatórios convivem nos anexos do PPA:
  R1 'ÓRGÃO E UNIDADE' (25 pág) — cauda: ação|programa|subfunção|função|unidade|órgão
  R2 consolidado       (17 pág) — cauda: ação|programa|subfunção|função
A página é paisagem; o OCR devolve as colunas invertidas e o título pode cair
no fim do bloco, então a classificação do relatório é feita por página inteira.
"""
import re, json, io, sys, collections

arqs = sys.argv[1:]
paginas = []          # (num, tipo, [linhas])
atual = None
for a in arqs:
    for ln in io.open(a, encoding="utf-8", errors="replace").read().split("\n"):
        ln = ln.strip()
        if ln.startswith("@@@PAGINA"):
            if atual: paginas.append(atual)
            atual = {"num": int(ln.split()[1]), "tipo": None, "linhas": []}
            continue
        if atual is None: continue
        if "DEMONSTRATIVO DE FUN" in ln.upper():
            atual["tipo"] = "R1" if "ÓRGÃO E UNIDADE" in ln.upper() or "ORGAO E UNIDADE" in ln.upper() else "R2"
        atual["linhas"].append(ln)
if atual: paginas.append(atual)

VAL = r"\d[\d.]*[.,]\d{2}"
RE_LINHA = re.compile(rf"^({VAL})\s*\|\s*({VAL})\s*\|\s*({VAL})\s*\|\s*({VAL})\s*\|\s*({VAL})\s*\|\s*(.+)$")
cod_num = lambda s: s.translate(str.maketrans("OolIiSs", "0011155"))
val = lambda t: int(re.sub(r"\D", "", t))

folhas = []
nomes = {"funcao": {}, "subfuncao": {}, "unidade": {}, "programa": {}, "orgao": {}, "acao": {}}
sub_de_funcao = {}
n_r1 = n_r2 = 0

for pg in paginas:
    tipo = pg["tipo"]
    if tipo is None: continue
    if tipo == "R1": n_r1 += 1
    else: n_r2 += 1
    for ln in pg["linhas"]:
        m = RE_LINHA.match(ln)
        if not m: continue
        total, v29, v28, v27, v26, resto = m.groups()
        partes = [p.strip() for p in resto.split("|")]
        espec = partes[0]
        cods = [cod_num(p) for p in partes[1:] if re.fullmatch(r"[0-9OoIlSs]{1,4}", p)]
        if not cods: continue
        n = len(cods)
        if tipo == "R1":
            if n == 6:
                acao, prog, subf, func, unid, org = cods
                folhas.append({"orgao": org.zfill(2), "unidade": unid,
                               "funcao": func.zfill(2), "subfuncao": subf.zfill(3),
                               "programa": prog, "acao": acao, "nome": espec,
                               "v2027": val(v27), "total": val(total)})
                nomes["acao"].setdefault((prog, acao), espec)
            elif n == 5: nomes["programa"].setdefault(cods[0], espec)
            elif n == 4:
                nomes["subfuncao"].setdefault(cods[0].zfill(3), espec)
                sub_de_funcao.setdefault(cods[0].zfill(3), cods[1].zfill(2))
            elif n == 3: nomes["funcao"].setdefault(cods[0].zfill(2), espec)
            elif n == 2: nomes["unidade"].setdefault((cods[1].zfill(2), cods[0]), espec)
            elif n == 1: nomes["orgao"].setdefault(cods[0].zfill(2), espec)
        else:  # R2
            if n == 4:
                acao, prog, subf, func = cods
                folhas.append({"orgao": None, "unidade": None,
                               "funcao": func.zfill(2), "subfuncao": subf.zfill(3),
                               "programa": prog, "acao": acao, "nome": espec,
                               "v2027": val(v27), "total": val(total)})
                nomes["acao"].setdefault((prog, acao), espec)
            elif n == 3: nomes["programa"].setdefault(cods[0], espec)
            elif n == 2:
                nomes["subfuncao"].setdefault(cods[0].zfill(3), espec)
                sub_de_funcao.setdefault(cods[0].zfill(3), cods[1].zfill(2))
            elif n == 1: nomes["funcao"].setdefault(cods[0].zfill(2), espec)

mapa = collections.defaultdict(set)
for f in folhas:
    mapa[(f["programa"], f["acao"])].add((f["funcao"], f["subfuncao"]))
conflitos = {k: v for k, v in mapa.items() if len(v) > 1}

print(f"páginas R1 (órgão/unidade) : {n_r1}")
print(f"páginas R2 (consolidado)   : {n_r2}")
print(f"linhas-folha (com ação)    : {len(folhas)}")
print(f"pares programa×ação        : {len(mapa)}")
print(f"  com >1 subfunção         : {len(conflitos)}")
print(f"funções / subfunções       : {len(nomes['funcao'])} / {len(nomes['subfuncao'])}")
print(f"órgãos / unidades          : {len(nomes['orgao'])} / {len(nomes['unidade'])}")
print(f"programas / ações          : {len(nomes['programa'])} / {len(nomes['acao'])}")

json.dump({
 "folhas": folhas,
 "funcoes":    [{"codigo": c, "nome": n} for c, n in sorted(nomes["funcao"].items())],
 "subfuncoes": [{"codigo": c, "nome": n, "funcaoCodigo": sub_de_funcao.get(c)}
                for c, n in sorted(nomes["subfuncao"].items())],
 "orgaos":     [{"codigo": c, "nome": n} for c, n in sorted(nomes["orgao"].items())],
 "unidades":   [{"orgaoCodigo": o, "codigo": u, "nome": n} for (o, u), n in sorted(nomes["unidade"].items())],
 "programas":  [{"codigo": c, "nome": n} for c, n in sorted(nomes["programa"].items())],
 "mapaProgramaAcao": {f"{p}/{a}": sorted(v) for (p, a), v in sorted(mapa.items())},
}, io.open("ocr/fnsf.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("\nfunções:")
for c, n in sorted(nomes["funcao"].items()): print(f"  {c}  {n}")
