# -*- coding: utf-8 -*-
"""Mescla o OCR validado com as correções manuais e emite a base do exercício 2027."""
import json, io, re, collections

blocos = json.load(io.open("ocr/anexo5.json", encoding="utf-8"))
corr   = json.load(io.open("ocr/correcoes.json", encoding="utf-8"))

por_pag = {}
for b in blocos:
    if b["total_impresso"] is not None and b["soma_acoes"] == b["total_impresso"]:
        por_pag[b["pagina"]] = {"origem": "ocr-checksum", **b}

for pag, c in corr.items():
    if pag.startswith("_"):
        continue
    p = int(pag)
    por_pag[p] = {
        "origem": "leitura-manual", "pagina": p,
        "orgao": c["orgao"], "unidade": c["unidade"], "programa": c["programa"],
        "total_impresso": c["total"], "soma_acoes": c["total"],
        "acoes": [{"codigo": a[0], "nome": a[1], "orgaoExecutor": a[2],
                   "metaFisica": a[3], "custoCentavos": a[4]} for a in c["acoes"]],
        "instituicao": None,
    }

blocos = [por_pag[k] for k in sorted(por_pag)]

# --- propaga a instituição (só aparece na 1ª página de cada instituição) ---
inst = None
for b in blocos:
    if b.get("instituicao"):
        inst = tuple(b["instituicao"])
    else:
        b["instituicao"] = list(inst) if inst else None

def tipo_acao(cod):
    """Convenção nacional: 1xxx projeto, 2xxx atividade, 0xxx/demais operação especial."""
    return {"1": "PROJETO", "2": "ATIVIDADE"}.get(cod[0], "OPERACAO_ESPECIAL")

orgaos    = {}
unidades  = {}
programas = {}
acoes     = {}
prioridades = []
linhas    = []

for b in blocos:
    oc, on = b["orgao"]
    uc, un = b["unidade"]
    pc, pn = b["programa"]
    orgaos.setdefault(oc, on)
    unidades.setdefault((oc, uc), un)
    programas.setdefault(pc, pn)
    for a in b["acoes"]:
        acoes.setdefault((pc, a["codigo"]), a["nome"])
        prioridades.append({"programaCodigo": pc, "acaoCodigo": a["codigo"],
                            "descricao": f"{pn} — {a['nome']}"})
        linhas.append({
            "orgaoCodigo": oc, "orgaoNome": on,
            "unidadeCodigo": uc, "unidadeNome": un,
            "programaCodigo": pc, "programaNome": pn,
            "acaoCodigo": a["codigo"], "acaoNome": a["nome"],
            "acaoTipo": tipo_acao(a["codigo"]),
            "orgaoExecutor": a["orgaoExecutor"],
            "metaFisica": a["metaFisica"],
            "custoEstimado": a["custoCentavos"] / 100,
        })

total = sum(l["custoEstimado"] for l in linhas)
manual = sum(1 for b in blocos if b["origem"] == "leitura-manual")

print(f"blocos programa×órgão : {len(blocos)}  ({len(blocos)-manual} por OCR+checksum, {manual} por leitura manual)")
print(f"órgãos                : {len(orgaos)}")
print(f"unidades orçamentárias: {len(unidades)}")
print(f"programas             : {len(programas)}")
print(f"ações (prog×ação)     : {len(acoes)}")
print(f"linhas programa×ação  : {len(linhas)}")
print(f"TOTAL 2027            : R$ {total:,.2f}")
print()
print("órgãos:")
for c in sorted(orgaos):
    sub = sum(l["custoEstimado"] for l in linhas if l["orgaoCodigo"] == c)
    print(f"  {c}  {orgaos[c][:52]:<52} R$ {sub:>16,.2f}")

json.dump({"exercicio": 2027, "municipio": "Mogi Guaçu/SP",
           "fonte": "LDO 2027 (Lei 6.393/26), Anexo V — relatório PLR00547, versão 29/04/2026",
           "orgaos": [{"codigo": c, "nome": n} for c, n in sorted(orgaos.items())],
           "unidades": [{"orgaoCodigo": o, "codigo": u, "nome": n}
                        for (o, u), n in sorted(unidades.items())],
           "programas": [{"codigo": c, "nome": n} for c, n in sorted(programas.items())],
           "acoes": [{"programaCodigo": p, "codigo": c, "nome": n, "tipo": tipo_acao(c)}
                     for (p, c), n in sorted(acoes.items())],
           "prioridadesLDO": prioridades,
           "linhas": linhas},
          io.open("ocr/base-2027.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
